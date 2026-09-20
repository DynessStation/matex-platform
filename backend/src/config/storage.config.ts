import path from "path";

//==================================================
//==== STORAGE DISK
//==================================================

export type StorageDisk = "local" | "r2" | "s3";

//==================================================
//==== ENV
//==================================================

const storageDisk = String(process.env.STORAGE_DISK ?? "local")
  .trim()
  .toLowerCase() as StorageDisk;

const storageRoot = String(process.env.FILE_STORAGE_ROOT ?? "").trim();

const fileBaseUrl = String(process.env.FILE_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const serveLocal =
  String(process.env.FILE_SERVE_LOCAL ?? "false")
    .trim()
    .toLowerCase() === "true";

//==================================================
//==== VALIDATION
//==================================================

if (!["local", "r2", "s3"].includes(storageDisk)) {
  throw new Error("Invalid STORAGE_DISK configuration");
}

if (!storageRoot) {
  throw new Error("FILE_STORAGE_ROOT is required");
}

if (!fileBaseUrl) {
  throw new Error("FILE_BASE_URL is required");
}

//==================================================
//==== STORAGE CONFIG
//==================================================

export const storageConfig = {
  disk: storageDisk,

  root: path.resolve(storageRoot),

  baseUrl: fileBaseUrl,

  serveLocal,
} as const;

export default storageConfig;
