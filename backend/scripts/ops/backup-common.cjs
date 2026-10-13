const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    index += 1;
  }

  return result;
}

function loadEnvironment(envFile) {
  if (envFile && !fs.existsSync(envFile)) {
    throw new Error(`Environment file was not found: ${envFile}`);
  }

  require("dotenv").config({
    path: envFile,
    override: false,
    quiet: true,
  });
}

function requiredEnvironment(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function mysqlConnectionFromEnvironment() {
  return {
    host: requiredEnvironment("DB_HOST"),
    port: String(process.env.DB_PORT ?? "3306").trim(),
    user: requiredEnvironment("DB_USER"),
    password: requiredEnvironment("DB_PASS"),
    database: requiredEnvironment("DB_NAME"),
  };
}

function escapeOptionFileValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function createMysqlDefaultsFile(connection) {
  const filePath = path.join(
    os.tmpdir(),
    `matex-mysql-${process.pid}-${crypto.randomBytes(8).toString("hex")}.cnf`,
  );
  const body = [
    "[client]",
    `host="${escapeOptionFileValue(connection.host)}"`,
    `port="${escapeOptionFileValue(connection.port)}"`,
    `user="${escapeOptionFileValue(connection.user)}"`,
    `password="${escapeOptionFileValue(connection.password)}"`,
    "protocol=tcp",
    "",
  ].join("\n");

  fs.writeFileSync(filePath, body, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
  return filePath;
}

function commandVersion(command) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return String(result.stdout || result.stderr).trim();
}

function requireCommand(command) {
  const version = commandVersion(command);
  if (!version) {
    throw new Error(`Required command is not available: ${command}`);
  }
  return version;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...options,
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${command} exited with code ${code}${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
          ),
        );
        return;
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const input = fs.createReadStream(filePath);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("end", () => resolve(hash.digest("hex")));
  });
}

function removeFileQuietly(filePath) {
  if (!filePath) return;
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // The original operation error is more useful than cleanup failure.
  }
}

module.exports = {
  commandVersion,
  createMysqlDefaultsFile,
  loadEnvironment,
  mysqlConnectionFromEnvironment,
  parseArgs,
  removeFileQuietly,
  requireCommand,
  runCommand,
  sha256File,
};
