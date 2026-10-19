import { randomUUID } from 'crypto';

import fs from 'fs/promises';

import path from 'path';

import sharp from 'sharp';

import storageConfig from '../config/storage.config';

import { AttachmentCollection, getAttachmentCollectionConfig } from '../config/attachment.config';

// Stored attachment

export interface StoredAttachment {
  collection_name: AttachmentCollection;
  name: string;
  original_name: string;
  file_name: string;
  mime_type: string;
  extension: string;
  disk: string;
  storage_path: string;
  file_size: number;
  width: number | null;
  height: number | null;
  asset_url: string;
}

// Normalize original name

const normalizeOriginalName = (originalName: string): string => {
  const fileName = path.basename(String(originalName ?? 'file'));

  return fileName.trim().slice(0, 255);
};

// Build file URL

export const buildAttachmentUrl = (storagePath: string): string => {
  const cleanPath = String(storagePath).replace(/\\/g, '/').replace(/^\/+/, '');

  return `${storageConfig.baseUrl}/${cleanPath}`;
};

// Get absolute path

export const getAttachmentAbsolutePath = (storagePath: string): string => {
  const segments = String(storagePath).replace(/\\/g, '/').split('/').filter(Boolean);

  return path.join(storageConfig.root, ...segments);
};

// Delete stored file

export const deleteStoredAttachment = async (storagePath: string): Promise<void> => {
  const absolutePath = getAttachmentAbsolutePath(storagePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

// Video signatures

// The first bytes each accepted video type must start with, so a file is not trusted on the
// browser's MIME label alone (images are checked by decoding them with sharp).
const videoSignatures: Record<string, (head: Buffer) => boolean> = {
  'video/mp4': (head) => head.subarray(4, 8).toString('latin1') === 'ftyp',
  'video/webm': (head) => head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  'video/ogg': (head) => head.subarray(0, 4).toString('latin1') === 'OggS',
};

// The first bytes of an upload, from disk (multer diskStorage) or memory.
const readHead = async (file: Express.Multer.File, length: number): Promise<Buffer> => {
  if (!file.path) return file.buffer.subarray(0, length);
  const handle = await fs.open(file.path, 'r');
  try {
    const head = Buffer.alloc(length);
    const { bytesRead } = await handle.read(head, 0, length, 0);
    return head.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

// Store attachment

export const storeAttachment = async (
  file: Express.Multer.File,
  collection: AttachmentCollection,
): Promise<StoredAttachment> => {
  // Storage driver

  if (storageConfig.disk !== 'local') {
    throw new Error('The configured storage disk is not supported by the local attachment driver');
  }
  // Collection config

  const config = getAttachmentCollectionConfig(collection);

  if (!config) {
    throw new Error('Invalid attachment collection');
  }

  // Validate mime

  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Unsupported attachment type');
  }

  // Validate size

  if (file.size > config.maxFileSize) {
    throw new Error('File size exceeds the allowed limit');
  }

  // Original name

  const originalName = normalizeOriginalName(file.originalname);

  const originalParsed = path.parse(originalName);

  const name = (originalParsed.name || 'file').slice(0, 255);

  // Directory date

  const now = new Date();

  const year = String(now.getFullYear());

  const month = String(now.getMonth() + 1).padStart(2, '0');

  // File name

  const generatedName = randomUUID().replace(/-/g, '');

  const isImage = file.mimetype.startsWith('image/');
  const videoExtensions: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
  };
  const extension = isImage ? config.image?.format : videoExtensions[file.mimetype];

  if (!extension || (isImage && !config.image)) {
    throw new Error('Attachment collection does not support this file type');
  }

  if (!isImage && !videoSignatures[file.mimetype]?.(await readHead(file, 12))) {
    throw new Error('Unsupported attachment type');
  }

  const fileName = `${generatedName}.${extension}`;

  // Storage path

  const storagePath = path.posix.join(config.directory, year, month, fileName);

  const absolutePath = getAttachmentAbsolutePath(storagePath);

  const absoluteDirectory = path.dirname(absolutePath);

  // Create directory

  await fs.mkdir(absoluteDirectory, {
    recursive: true,
  });

  // Process image

  if (!isImage) {
    if (file.path) await fs.copyFile(file.path, absolutePath);
    else await fs.writeFile(absolutePath, file.buffer);

    return {
      collection_name: collection,
      name,
      original_name: originalName,
      file_name: fileName,
      mime_type: file.mimetype,
      extension,
      disk: storageConfig.disk,
      storage_path: storagePath,
      file_size: file.size,
      width: null,
      height: null,
      asset_url: buildAttachmentUrl(storagePath),
    };
  }

  let info: sharp.OutputInfo;

  try {
    info = await sharp(file.path ?? file.buffer, {
      failOn: 'error',
    })
      // Auto rotate from exif

      .rotate()

      // Resize

      .resize({
        width: config.image!.width,
        height: config.image!.height,
        fit: config.image!.fit,
        position: config.image!.position,
        withoutEnlargement: config.image!.withoutEnlargement ?? false,
      })

      // Webp

      .webp({
        quality: config.image!.quality,
      })

      // Save

      .toFile(absolutePath);
  } catch (error) {
    // Clean partial file

    await deleteStoredAttachment(storagePath).catch(() => undefined);

    throw error;
  }

  // Response

  return {
    collection_name: collection,
    name,
    original_name: originalName,
    file_name: fileName,
    mime_type: 'image/webp',
    extension: 'webp',
    disk: storageConfig.disk,
    storage_path: storagePath,
    file_size: info.size,
    width: info.width ?? null,
    height: info.height ?? null,
    asset_url: buildAttachmentUrl(storagePath),
  };
};

// Kept as an alias while older callers move to the generic name.
export const storeImageAttachment = storeAttachment;
