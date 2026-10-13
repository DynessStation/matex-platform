const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config({ quiet: true });

const mysql = require('mysql2/promise');

const migrationDirectory = path.resolve(__dirname, '..', 'database', 'migrations');
const migrationFilePattern = /^\d{8}_\d{3}_[a-z0-9_-]+\.sql$/i;
const args = new Set(process.argv.slice(2));
const showStatusOnly = args.has('--status');
const adoptExisting = args.has('--adopt-existing');
const adoptionCutoffMigration = '20261011_019_enable_contact_inquiries.sql';

const expectedAdoptionTables = [
  'admin_access',
  'admin_access_permission',
  'admin_acct',
  'admin_permission',
  'article',
  'article_attachment',
  'article_category',
  'article_category_i18n',
  'article_category_map',
  'article_i18n',
  'article_tag',
  'article_tag_i18n',
  'article_tag_map',
  'attachment',
  'audit_log',
  'chair',
  'contact_inquiry',
  'contact_inquiry_topic',
  'contact_inquiry_topic_i18n',
  'faq',
  'faq_category',
  'faq_category_i18n',
  'faq_i18n',
  'master_comp',
  'office',
  'office_attachment',
  'office_operating_hour',
  'product_catalog',
  'product_catalog_attachment',
  'product_catalog_category',
  'product_catalog_i18n',
  'product_catalog_marketplace',
  'product_catalog_price',
  'product_category',
  'product_category_attachment',
  'product_category_i18n',
  'public_contact_channel',
  'public_contact_channel_i18n',
  'web_navigation',
  'web_navigation_item',
  'web_navigation_item_i18n',
  'website_page',
  'website_page_i18n',
  'website_page_media',
  'website_page_media_i18n',
];

const requiredAdoptionColumns = {
  contact_inquiry: [
    'contact_inquiry_notification_error',
    'contact_inquiry_notification_sent_at',
    'contact_inquiry_notification_status',
    'contact_inquiry_recipient_email',
  ],
  product_catalog: [
    'product_kind',
    'product_origin_city',
    'product_origin_province',
  ],
};

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadMigrations() {
  if (!fs.existsSync(migrationDirectory)) {
    throw new Error(`Migration directory was not found: ${migrationDirectory}`);
  }

  return fs
    .readdirSync(migrationDirectory)
    .filter((fileName) => migrationFilePattern.test(fileName))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const sql = fs.readFileSync(path.join(migrationDirectory, fileName), 'utf8');
      return {
        fileName,
        sql,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
      };
    });
}

async function ensureHistoryTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id_schema_migration bigint unsigned NOT NULL AUTO_INCREMENT,
      migration_name varchar(255) NOT NULL,
      migration_checksum char(64) NOT NULL,
      migration_mode varchar(20) NOT NULL DEFAULT 'executed',
      execution_ms int unsigned NOT NULL DEFAULT 0,
      applied_at datetime NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (id_schema_migration),
      UNIQUE KEY uq_schema_migrations_name (migration_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function historyTableExists(connection) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'schema_migrations'
        AND TABLE_TYPE = 'BASE TABLE'`,
  );
  return Number(rows[0]?.total) === 1;
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    'SELECT migration_name, migration_checksum, migration_mode, applied_at FROM schema_migrations ORDER BY migration_name',
  );
  return new Map(rows.map((row) => [row.migration_name, row]));
}

async function getApplicationTables(connection) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME <> 'schema_migrations'
      ORDER BY TABLE_NAME`,
  );
  return rows.map((row) => row.TABLE_NAME);
}

async function validateAdoptionTarget(connection) {
  const currentTables = new Set(await getApplicationTables(connection));
  const missingTables = expectedAdoptionTables.filter((table) => !currentTables.has(table));

  const missingColumns = [];
  for (const [table, columns] of Object.entries(requiredAdoptionColumns)) {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?`,
      [table],
    );
    const currentColumns = new Set(rows.map((row) => row.COLUMN_NAME));
    for (const column of columns) {
      if (!currentColumns.has(column)) {
        missingColumns.push(`${table}.${column}`);
      }
    }
  }

  if (missingTables.length || missingColumns.length) {
    const details = [
      missingTables.length ? `missing tables: ${missingTables.join(', ')}` : null,
      missingColumns.length ? `missing columns: ${missingColumns.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('; ');
    throw new Error(`Existing database cannot be adopted because its schema is incomplete (${details})`);
  }
}

async function recordMigration(connection, migration, mode, executionMs) {
  await connection.query(
    `INSERT INTO schema_migrations
       (migration_name, migration_checksum, migration_mode, execution_ms)
     VALUES (?, ?, ?, ?)`,
    [migration.fileName, migration.checksum, mode, executionMs],
  );
}

function verifyChecksums(migrations, applied) {
  for (const migration of migrations) {
    const existing = applied.get(migration.fileName);
    if (existing && existing.migration_checksum !== migration.checksum) {
      throw new Error(
        `Migration checksum changed after it was applied: ${migration.fileName}. Create a new migration instead of editing migration history.`,
      );
    }
  }
}

async function printStatus(connection, migrations, applied) {
  const applicationTables = await getApplicationTables(connection);
  const pending = migrations.filter((migration) => !applied.has(migration.fileName));
  const state =
    applied.size === 0 && applicationTables.length > 0
      ? 'adoption_required'
      : pending.length > 0
        ? 'pending'
        : 'current';

  console.log(
    JSON.stringify(
      {
        state,
        migration_files: migrations.length,
        applied: applied.size,
        pending: pending.map((migration) => migration.fileName),
        application_tables: applicationTables.length,
      },
      null,
      2,
    ),
  );
}

async function run() {
  const database = requireEnvironment('DB_NAME');
  const migrations = loadMigrations();
  if (migrations.length === 0) {
    throw new Error('No migration files were found');
  }

  const connection = await mysql.createConnection({
    host: requireEnvironment('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    user: requireEnvironment('DB_USER'),
    password: process.env.DB_PASS || '',
    database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  const lockName = `matex_schema_migrations_${database}`.slice(0, 64);
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) {
      throw new Error('Could not acquire the database migration lock');
    }

    const hasHistoryTable = await historyTableExists(connection);
    if (!hasHistoryTable && !showStatusOnly) {
      await ensureHistoryTable(connection);
    }

    let applied = hasHistoryTable || !showStatusOnly
      ? await getAppliedMigrations(connection)
      : new Map();
    verifyChecksums(migrations, applied);

    if (showStatusOnly) {
      await printStatus(connection, migrations, applied);
      return;
    }

    const applicationTables = await getApplicationTables(connection);
    if (applied.size === 0 && applicationTables.length > 0) {
      if (!adoptExisting) {
        throw new Error(
          'This database already contains application tables but has no migration history. Review it first, then run npm run db:migrate:adopt once.',
        );
      }

      await validateAdoptionTarget(connection);
      const adoptionMigrations = migrations.filter(
        (migration) => migration.fileName.localeCompare(adoptionCutoffMigration) <= 0,
      );
      if (!adoptionMigrations.length) {
        throw new Error(`Adoption cutoff migration was not found: ${adoptionCutoffMigration}`);
      }
      for (const migration of adoptionMigrations) {
        await recordMigration(connection, migration, 'adopted', 0);
      }
      console.log(
        `Adopted ${adoptionMigrations.length} existing migrations without changing application data.`,
      );
      applied = await getAppliedMigrations(connection);
    }

    let executed = 0;
    for (const migration of migrations) {
      if (applied.has(migration.fileName)) {
        continue;
      }

      const startedAt = Date.now();
      console.log(`Applying ${migration.fileName}`);
      try {
        await connection.query(migration.sql);
        await recordMigration(
          connection,
          migration,
          'executed',
          Math.max(0, Date.now() - startedAt),
        );
        executed += 1;
      } catch (error) {
        throw new Error(`Migration failed: ${migration.fileName}`, { cause: error });
      }
    }

    applied = await getAppliedMigrations(connection);
    verifyChecksums(migrations, applied);
    console.log(`Migration complete. Executed ${executed}; applied ${applied.size}/${migrations.length}.`);
  } finally {
    if (lockAcquired) {
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => undefined);
    }
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  if (error.cause?.code) {
    console.error(`Database error: ${error.cause.code}`);
  }
  process.exit(1);
});
