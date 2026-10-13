const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { createGzip } = require("node:zlib");

const {
  createMysqlDefaultsFile,
  loadEnvironment,
  mysqlConnectionFromEnvironment,
  parseArgs,
  removeFileQuietly,
  requireCommand,
  runCommand,
  sha256File,
} = require("./backup-common.cjs");

const args = parseArgs(process.argv.slice(2));

function showHelp() {
  process.stdout.write(`MATEX production backup

Usage:
  node scripts/ops/backup-production.cjs --env-file .env --output-dir /var/backups/matex
  node scripts/ops/backup-production.cjs --env-file .env --output-dir /var/backups/matex --check

Options:
  --env-file <path>    Environment file. Defaults to backend/.env.
  --output-dir <path>  Backup root. Can also use BACKUP_ROOT.
  --retention-days <n> Remove completed MATEX backups older than n days.
  --check              Validate configuration and required commands only.
  --help               Show this help.
`);
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function isSameOrNestedPath(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function pruneExpiredBackups(outputRoot, currentBackupName, retentionDays) {
  if (!retentionDays) return [];

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const removed = [];
  for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      entry.name === currentBackupName ||
      !/^matex-\d{8}T\d{6}Z$/.test(entry.name)
    ) {
      continue;
    }
    const entryPath = path.join(outputRoot, entry.name);
    if (fs.statSync(entryPath).mtimeMs >= cutoff) continue;
    fs.rmSync(entryPath, { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed;
}

async function dumpDatabase(connection, defaultsFile, targetPath) {
  const child = spawn(
    "mysqldump",
    [
      `--defaults-extra-file=${defaultsFile}`,
      "--single-transaction",
      "--quick",
      "--routines",
      "--triggers",
      "--events",
      "--hex-blob",
      "--skip-lock-tables",
      "--default-character-set=utf8mb4",
      connection.database,
    ],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const closed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`mysqldump exited with code ${code}: ${stderr.trim()}`),
        );
        return;
      }
      resolve();
    });
  });

  await Promise.all([
    pipeline(
      child.stdout,
      createGzip({ level: 9 }),
      fs.createWriteStream(targetPath),
    ),
    closed,
  ]);
}

async function main() {
  if (args.help) {
    showHelp();
    return;
  }

  const backendRoot = path.resolve(__dirname, "..", "..");
  const envFile = path.resolve(
    String(args["env-file"] || path.join(backendRoot, ".env")),
  );
  loadEnvironment(envFile);

  const connection = mysqlConnectionFromEnvironment();
  const storageDisk = String(process.env.STORAGE_DISK ?? "local")
    .trim()
    .toLowerCase();
  if (storageDisk !== "local") {
    throw new Error(
      `This backup command supports STORAGE_DISK=local; received ${storageDisk}`,
    );
  }

  const storageRoot = path.resolve(
    String(process.env.FILE_STORAGE_ROOT ?? "").trim(),
  );
  if (!process.env.FILE_STORAGE_ROOT || !fs.existsSync(storageRoot)) {
    throw new Error(`FILE_STORAGE_ROOT does not exist: ${storageRoot}`);
  }

  const outputValue = args["output-dir"] || process.env.BACKUP_ROOT;
  if (!outputValue) {
    throw new Error("Provide --output-dir or BACKUP_ROOT");
  }
  const outputRoot = path.resolve(String(outputValue));
  if (isSameOrNestedPath(outputRoot, storageRoot)) {
    throw new Error("BACKUP_ROOT must be outside FILE_STORAGE_ROOT");
  }

  const retentionValue =
    args["retention-days"] || process.env.BACKUP_RETENTION_DAYS;
  const retentionDays = retentionValue ? Number(retentionValue) : null;
  if (
    retentionDays !== null &&
    (!Number.isSafeInteger(retentionDays) || retentionDays < 1)
  ) {
    throw new Error("Retention days must be a positive whole number");
  }

  const versions = {
    mysqldump: requireCommand("mysqldump"),
    tar: requireCommand("tar"),
  };

  if (args.check) {
    process.stdout.write(
      `Backup prerequisites are ready for database ${connection.database} and storage ${storageRoot}.\n`,
    );
    return;
  }

  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const backupName = `matex-${timestamp()}`;
  const temporaryDirectory = path.join(outputRoot, `.${backupName}.partial`);
  const finalDirectory = path.join(outputRoot, backupName);
  if (fs.existsSync(temporaryDirectory) || fs.existsSync(finalDirectory)) {
    throw new Error(`Backup destination already exists: ${finalDirectory}`);
  }

  fs.mkdirSync(temporaryDirectory, { mode: 0o700 });
  const databaseArchive = path.join(temporaryDirectory, "database.sql.gz");
  const filesArchive = path.join(temporaryDirectory, "files.tar.gz");
  let defaultsFile;

  try {
    defaultsFile = createMysqlDefaultsFile(connection);
    await dumpDatabase(connection, defaultsFile, databaseArchive);
    await runCommand("tar", ["-C", storageRoot, "-czf", filesArchive, "."]);

    const gitResult = await runCommand("git", ["rev-parse", "HEAD"], {
      cwd: path.resolve(backendRoot, ".."),
    }).catch(() => ({ stdout: null }));
    const databaseStat = fs.statSync(databaseArchive);
    const filesStat = fs.statSync(filesArchive);
    const manifest = {
      format_version: 1,
      application: "MATEX",
      created_at: new Date().toISOString(),
      git_commit: gitResult.stdout || null,
      source_database: connection.database,
      storage_disk: storageDisk,
      source_storage_root: storageRoot,
      tools: versions,
      files: {
        database: {
          name: path.basename(databaseArchive),
          bytes: databaseStat.size,
          sha256: await sha256File(databaseArchive),
        },
        storage: {
          name: path.basename(filesArchive),
          bytes: filesStat.size,
          sha256: await sha256File(filesArchive),
        },
      },
    };

    fs.writeFileSync(
      path.join(temporaryDirectory, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
    fs.renameSync(temporaryDirectory, finalDirectory);
    const removed = pruneExpiredBackups(outputRoot, backupName, retentionDays);
    process.stdout.write(`Backup created: ${finalDirectory}\n`);
    if (removed.length > 0) {
      process.stdout.write(`Expired backups removed: ${removed.join(", ")}\n`);
    }
  } catch (error) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    removeFileQuietly(defaultsFile);
  }
}

main().catch((error) => {
  process.stderr.write(`Backup failed: ${error.message}\n`);
  process.exitCode = 1;
});
