import path from 'path';

// Storage disk

export type StorageDisk = 'local' | 'r2' | 's3';

// Env

const storageDisk = String(process.env.STORAGE_DISK ?? 'local')
  .trim()
  .toLowerCase() as StorageDisk;

const storageRoot = String(process.env.FILE_STORAGE_ROOT ?? '').trim();

const fileBaseUrl = String(process.env.FILE_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

const serveLocal =
  String(process.env.FILE_SERVE_LOCAL ?? 'false')
    .trim()
    .toLowerCase() === 'true';

// Validation

if (!['local', 'r2', 's3'].includes(storageDisk)) {
  throw new Error('Invalid STORAGE_DISK configuration');
}

if (!storageRoot) {
  throw new Error('FILE_STORAGE_ROOT is required');
}

if (!fileBaseUrl) {
  throw new Error('FILE_BASE_URL is required');
}

// Storage config

export const storageConfig = {
  disk: storageDisk,
  root: path.resolve(storageRoot),
  baseUrl: fileBaseUrl,
  serveLocal,
} as const;

export default storageConfig;
