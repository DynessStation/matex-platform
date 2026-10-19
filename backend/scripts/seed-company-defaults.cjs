// Fills a company that has no website content yet with the default content
// exported by scripts/export-company-defaults.cjs (pages, page images, navigation,
// contact topics and channels, FAQs).
//
// Usage (from backend/):
//   npm run db:seed:company-defaults -- --company-id 1
//   Optional: --admin-id N (recorded as creator; defaults to the company's first
//   all-access admin) and --source <dir> (defaults to database/seeds/company-defaults).
//
// Refuses to run when the company already has website pages, so it never overwrites
// content. Contact-form recipient emails are not part of the defaults; set them in the
// admin panel. Images are copied into FILE_STORAGE_ROOT as media-library attachments.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config({ quiet: true });

const mysql = require('mysql2/promise');

// Must match the media_library collection in src/config/attachment.config.ts.
const MEDIA_COLLECTION = 'media_library';
const MEDIA_DIRECTORY = 'media-library';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = /^--([a-z-]+)$/.exec(argv[index])?.[1];
    if (!key) throw new Error(`Unexpected argument: ${argv[index]}`);
    args[key] = argv[index + 1];
  }
  return args;
}

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

// JSON columns come back from mysql2 as objects; store them as JSON text again.
function toRow(record) {
  return Object.fromEntries(
    Object.entries(record).map(([column, value]) => [
      column,
      value !== null && typeof value === 'object' ? JSON.stringify(value) : value,
    ]),
  );
}

async function insert(connection, table, record) {
  const row = toRow(record);
  const columns = Object.keys(row);
  const [result] = await connection.query(
    `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (?)`,
    [columns.map((column) => row[column])],
  );
  return result.insertId;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const companyId = Number(args['company-id']);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw new Error('Provide --company-id <id>');
  }
  const sourceDir = path.resolve(
    args.source || path.join(__dirname, '..', 'database', 'seeds', 'company-defaults'),
  );
  const content = JSON.parse(fs.readFileSync(path.join(sourceDir, 'content.json'), 'utf8'));
  if (content.format !== 1) throw new Error(`Unsupported defaults format: ${content.format}`);
  const storageRoot = path.resolve(requireEnvironment('FILE_STORAGE_ROOT'));

  const connection = await mysql.createConnection({
    host: requireEnvironment('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    user: requireEnvironment('DB_USER'),
    password: process.env.DB_PASS || '',
    database: requireEnvironment('DB_NAME'),
    charset: 'utf8mb4',
  });
  const copiedFiles = [];

  try {
    const [[company]] = await connection.query(
      'SELECT id_master_comp FROM master_comp WHERE id_master_comp = ?',
      [companyId],
    );
    if (!company) throw new Error(`Company ${companyId} does not exist`);

    const [[existing]] = await connection.query(
      'SELECT COUNT(*) AS total FROM website_page WHERE id_master_comp = ?',
      [companyId],
    );
    if (Number(existing.total) > 0) {
      throw new Error(
        `Company ${companyId} already has website pages; defaults are only for empty companies.`,
      );
    }

    const [admins] = args['admin-id']
      ? await connection.query(
          'SELECT id_admin_acct FROM admin_acct WHERE id_admin_acct = ? AND id_master_comp = ?',
          [Number(args['admin-id']), companyId],
        )
      : await connection.query(
          `SELECT id_admin_acct FROM admin_acct
            WHERE id_master_comp = ? AND is_all_access = 1 AND admin_acct_status = 1
            ORDER BY id_admin_acct LIMIT 1`,
          [companyId],
        );
    if (!admins.length) throw new Error(`No admin found for company ${companyId}`);
    const adminId = admins[0].id_admin_acct;
    const audit = { id_created_by: adminId, id_updated_by: adminId };

    const [[office]] = await connection.query(
      'SELECT id_office FROM office WHERE id_master_comp = ? ORDER BY id_office LIMIT 1',
      [companyId],
    );

    await connection.beginTransaction();
    try {
      const now = new Date();
      const month = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

      let images = 0;
      for (const page of content.pages) {
        const { translations, media, ...pageColumns } = page;
        const pageId = await insert(connection, 'website_page', {
          ...pageColumns,
          id_master_comp: companyId,
          ...audit,
        });
        for (const translation of translations) {
          await insert(connection, 'website_page_i18n', {
            ...translation,
            id_website_page: pageId,
            id_master_comp: companyId,
          });
        }

        for (const item of media) {
          const { file, translations: mediaTranslations, ...mediaColumns } = item;
          const fileName = `${crypto.randomUUID().replace(/-/g, '')}.${file.extension}`;
          const storagePath = path.posix.join(MEDIA_DIRECTORY, month, fileName);
          const target = path.join(storageRoot, storagePath);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.copyFileSync(path.join(sourceDir, file.path), target);
          copiedFiles.push(target);

          const attachmentId = await insert(connection, 'attachment', {
            collection_name: MEDIA_COLLECTION,
            name: file.name,
            original_name: file.original_name,
            file_name: fileName,
            mime_type: file.mime_type,
            extension: file.extension,
            disk: 'local',
            storage_path: storagePath,
            file_size: fs.statSync(target).size,
            width: file.width,
            height: file.height,
            id_master_comp: companyId,
            id_office: office?.id_office ?? null,
            created_by_id: adminId,
            attachment_status: 1,
          });
          const mediaId = await insert(connection, 'website_page_media', {
            ...mediaColumns,
            id_website_page: pageId,
            id_attachment: attachmentId,
          });
          for (const translation of mediaTranslations) {
            await insert(connection, 'website_page_media_i18n', {
              ...translation,
              id_website_page_media: mediaId,
            });
          }
          images += 1;
        }
      }

      for (const navigation of content.navigations) {
        const { items, ...navigationColumns } = navigation;
        const navigationId = await insert(connection, 'web_navigation', {
          ...navigationColumns,
          id_master_comp: companyId,
          ...audit,
        });
        for (const item of items) {
          const { translations, ...itemColumns } = item;
          const itemId = await insert(connection, 'web_navigation_item', {
            ...itemColumns,
            id_web_navigation: navigationId,
            id_master_comp: companyId,
            ...audit,
          });
          for (const translation of translations) {
            await insert(connection, 'web_navigation_item_i18n', {
              ...translation,
              id_web_navigation_item: itemId,
              id_master_comp: companyId,
            });
          }
        }
      }

      const withTranslations = async (records, table, childTable, parentColumn) => {
        for (const record of records) {
          const { translations, ...columns } = record;
          const id = await insert(connection, table, {
            ...columns,
            id_master_comp: companyId,
            ...audit,
          });
          for (const translation of translations) {
            await insert(connection, childTable, {
              ...translation,
              [parentColumn]: id,
              id_master_comp: companyId,
            });
          }
        }
      };
      await withTranslations(
        content.contact_topics,
        'contact_inquiry_topic',
        'contact_inquiry_topic_i18n',
        'id_contact_inquiry_topic',
      );
      await withTranslations(
        content.contact_channels,
        'public_contact_channel',
        'public_contact_channel_i18n',
        'id_public_contact_channel',
      );
      await withTranslations(content.faqs, 'faq', 'faq_i18n', 'id_faq');

      await connection.commit();
      console.log(
        `Seeded company ${companyId}: ${content.pages.length} pages (${images} images), ` +
          `${content.navigations.length} navigation(s), ${content.contact_topics.length} contact topics, ` +
          `${content.contact_channels.length} contact channels, ${content.faqs.length} FAQs. ` +
          'Set contact-form recipient emails in the admin panel.',
      );
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    for (const file of copiedFiles) fs.rmSync(file, { force: true });
    throw error;
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
