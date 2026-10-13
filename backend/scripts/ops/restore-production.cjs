const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createGunzip } = require("node:zlib");

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
  process.stdout.write(`MATEX backup verification and restore drill

Verify only (default):
  node scripts/ops/restore-production.cjs --backup /var/backups/matex/matex-YYYYMMDDTHHMMSSZ

Restore drill to empty targets:
  node scripts/ops/restore-production.cjs --backup <dir> --env-file .env \\
    --execute --target-db mia_restore_drill --target-files /var/lib/matex-restore-drill/files \\
    --confirm RESTORE:mia_restore_drill

Options:
  --backup <path>         Backup directory containing manifest.json.
  --env-file <path>       Environment file. Defaults to backend/.env.
  --verify-only           Verify checksums and archive integrity; this is the default.
  --execute               Restore to the explicitly named drill targets.
  --target-db <name>      Existing empty database used for the drill.
  --target-files <path>   Missing or empty directory used for restored files.
  --confirm <phrase>      Must equal RESTORE:<target-db>.
  --allow-live-target     Permit DB_NAME or FILE_STORAGE_ROOT only with RESTORE_LIVE:<target-db>.
  --help                  Show this help.
`);
}

function readManifest(backupDirectory) {
  const manifestPath = path.join(backupDirectory, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest was not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.format_version !== 1 || manifest.application !== "MATEX") {
    throw new Error("Unsupported or invalid MATEX backup manifest");
  }
  return manifest;
}

function ensureSafeTargetDirectory(
  targetPath,
  liveStorageRoot,
  allowLiveTarget,
) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedLive = path.resolve(liveStorageRoot);
  if (resolvedTarget === resolvedLive && !allowLiveTarget) {
    throw new Error(
      "Refusing to restore over FILE_STORAGE_ROOT without --allow-live-target",
    );
  }

  if (
    fs.existsSync(resolvedTarget) &&
    fs.readdirSync(resolvedTarget).length > 0
  ) {
    throw new Error(`Target files directory must be empty: ${resolvedTarget}`);
  }
  fs.mkdirSync(resolvedTarget, { recursive: true, mode: 0o700 });
  return resolvedTarget;
}

async function verifyGzip(filePath) {
  const sink = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  await pipeline(fs.createReadStream(filePath), createGunzip(), sink);
}

async function verifyBackup(backupDirectory, manifest) {
  const entries = [manifest.files?.database, manifest.files?.storage];
  for (const entry of entries) {
    if (!entry?.name || !entry.sha256) {
      throw new Error("Backup manifest is missing an archive entry");
    }
    const filePath = path.join(backupDirectory, entry.name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup archive was not found: ${filePath}`);
    }
    const actualHash = await sha256File(filePath);
    if (actualHash !== entry.sha256) {
      throw new Error(`Checksum mismatch for ${entry.name}`);
    }
  }

  await verifyGzip(path.join(backupDirectory, manifest.files.database.name));
  requireCommand("tar");
  await runCommand("tar", [
    "-tzf",
    path.join(backupDirectory, manifest.files.storage.name),
  ]);
}

async function restoreDatabase(
  connection,
  defaultsFile,
  archivePath,
  targetDatabase,
) {
  const child = spawn(
    "mysql",
    [
      `--defaults-extra-file=${defaultsFile}`,
      "--default-character-set=utf8mb4",
      targetDatabase,
    ],
    { stdio: ["pipe", "ignore", "pipe"], windowsHide: true },
  );

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  const closed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`mysql exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      resolve();
    });
  });

  await Promise.all([
    pipeline(fs.createReadStream(archivePath), createGunzip(), child.stdin),
    closed,
  ]);
}

async function main() {
  if (args.help) {
    showHelp();
    return;
  }

  if (!args.backup) {
    throw new Error("Provide --backup <directory>");
  }
  const backupDirectory = path.resolve(String(args.backup));
  const manifest = readManifest(backupDirectory);
  await verifyBackup(backupDirectory, manifest);
  process.stdout.write(`Backup integrity verified: ${backupDirectory}\n`);

  if (!args.execute) {
    return;
  }

  const backendRoot = path.resolve(__dirname, "..", "..");
  const envFile = path.resolve(
    String(args["env-file"] || path.join(backendRoot, ".env")),
  );
  loadEnvironment(envFile);
  const connection = mysqlConnectionFromEnvironment();
  const targetDatabase = String(args["target-db"] ?? "").trim();
  const targetFilesValue = String(args["target-files"] ?? "").trim();
  if (!targetDatabase || !targetFilesValue) {
    throw new Error("--execute requires --target-db and --target-files");
  }

  const allowLiveTarget = Boolean(args["allow-live-target"]);
  const targetsLiveDatabase = targetDatabase === connection.database;
  const liveStorageRoot = String(process.env.FILE_STORAGE_ROOT ?? "").trim();
  if (!liveStorageRoot) {
    throw new Error("Missing required environment variable: FILE_STORAGE_ROOT");
  }
  const targetsLiveFiles =
    path.resolve(targetFilesValue) === path.resolve(liveStorageRoot);
  if ((targetsLiveDatabase || targetsLiveFiles) && !allowLiveTarget) {
    throw new Error(
      "Refusing to restore over live targets without --allow-live-target",
    );
  }

  const expectedConfirmation =
    targetsLiveDatabase || targetsLiveFiles
      ? `RESTORE_LIVE:${targetDatabase}`
      : `RESTORE:${targetDatabase}`;
  if (args.confirm !== expectedConfirmation) {
    throw new Error(`Confirmation must be exactly ${expectedConfirmation}`);
  }

  requireCommand("mysql");
  const targetFiles = ensureSafeTargetDirectory(
    targetFilesValue,
    liveStorageRoot,
    allowLiveTarget,
  );
  let defaultsFile;
  try {
    defaultsFile = createMysqlDefaultsFile(connection);
    await restoreDatabase(
      connection,
      defaultsFile,
      path.join(backupDirectory, manifest.files.database.name),
      targetDatabase,
    );
    await runCommand("tar", [
      "-C",
      targetFiles,
      "-xzf",
      path.join(backupDirectory, manifest.files.storage.name),
    ]);
  } finally {
    removeFileQuietly(defaultsFile);
  }

  process.stdout.write(
    `Restore completed to database ${targetDatabase} and files ${targetFiles}.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`Restore failed: ${error.message}\n`);
  process.exitCode = 1;
});
