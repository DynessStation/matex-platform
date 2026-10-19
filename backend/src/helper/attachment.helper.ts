import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

import { AttachmentCollection, getAttachmentCollectionConfig } from '../config/attachment.config';
import storageConfig from '../config/storage.config';
import { HttpError } from './http-error.helper';

// Storing, locating, and removing attachment files on the local disk.

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

const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
};

// The first bytes each accepted video type must start with, so a file is not trusted on the
// browser's MIME label alone (images are checked by decoding them with sharp).
const VIDEO_SIGNATURES: Record<string, (head: Buffer) => boolean> = {
  'video/mp4': (head) => head.subarray(4, 8).toString('latin1') === 'ftyp',
  'video/webm': (head) => head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  'video/ogg': (head) => head.subarray(0, 4).toString('latin1') === 'OggS',
};

const unsupportedType = () =>
  new HttpError(400, 'ATTACHMENT_FILE_TYPE_NOT_ALLOWED', 'Unsupported attachment type');

const normalizeOriginalName = (originalName: string): string =>
  path
    .basename(String(originalName ?? 'file'))
    .trim()
    .slice(0, 255);

export const buildAttachmentUrl = (storagePath: string): string => {
  const cleanPath = String(storagePath).replace(/\\/g, '/').replace(/^\/+/, '');
  return `${storageConfig.baseUrl}/${cleanPath}`;
};

export const getAttachmentAbsolutePath = (storagePath: string): string => {
  const segments = String(storagePath).replace(/\\/g, '/').split('/').filter(Boolean);
  return path.join(storageConfig.root, ...segments);
};

/** Removes a stored file; a file that is already gone is fine. */
export const deleteStoredAttachment = async (storagePath: string): Promise<void> => {
  try {
    await fs.unlink(getAttachmentAbsolutePath(storagePath));
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
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

/**
 * Validates an uploaded file against its collection and stores it under
 * <collection directory>/<year>/<month>/. Images are re-encoded as WebP (resized, EXIF
 * rotation applied, metadata dropped); videos are copied as they are. Rejections are
 * HttpErrors (400).
 */
export const storeAttachment = async (
  file: Express.Multer.File,
  collection: AttachmentCollection,
): Promise<StoredAttachment> => {
  if (storageConfig.disk !== 'local') {
    throw new Error('The configured storage disk is not supported by the local attachment driver');
  }

  const config = getAttachmentCollectionConfig(collection);
  if (!config) {
    throw new HttpError(400, 'ATTACHMENT_COLLECTION_INVALID', 'Invalid attachment collection');
  }
  if (!config.allowedMimeTypes.includes(file.mimetype)) throw unsupportedType();
  if (file.size > config.maxFileSize) {
    throw new HttpError(400, 'ATTACHMENT_FILE_TOO_LARGE', 'File size exceeds the allowed limit');
  }

  const isImage = file.mimetype.startsWith('image/');
  const extension = isImage ? config.image?.format : VIDEO_EXTENSIONS[file.mimetype];
  if (!extension) {
    throw new HttpError(
      400,
      'ATTACHMENT_IMAGE_PROCESSING_UNSUPPORTED',
      'Attachment collection does not support this file type',
    );
  }
  if (!isImage && !VIDEO_SIGNATURES[file.mimetype]?.(await readHead(file, 12))) {
    throw unsupportedType();
  }

  const originalName = normalizeOriginalName(file.originalname);
  const name = (path.parse(originalName).name || 'file').slice(0, 255);
  const now = new Date();
  const fileName = `${randomUUID().replace(/-/g, '')}.${extension}`;
  const storagePath = path.posix.join(
    config.directory,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    fileName,
  );
  const absolutePath = getAttachmentAbsolutePath(storagePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const stored = {
    collection_name: collection,
    name,
    original_name: originalName,
    file_name: fileName,
    disk: storageConfig.disk,
    storage_path: storagePath,
    asset_url: buildAttachmentUrl(storagePath),
  };

  if (!isImage) {
    if (file.path) await fs.copyFile(file.path, absolutePath);
    else await fs.writeFile(absolutePath, file.buffer);
    return {
      ...stored,
      mime_type: file.mimetype,
      extension,
      file_size: file.size,
      width: null,
      height: null,
    };
  }

  const image = config.image!;
  let info: sharp.OutputInfo;
  try {
    info = await sharp(file.path ?? file.buffer, { failOn: 'error' })
      .rotate()
      .resize({
        width: image.width,
        height: image.height,
        fit: image.fit,
        position: image.position,
        withoutEnlargement: image.withoutEnlargement ?? false,
      })
      .webp({ quality: image.quality })
      .toFile(absolutePath);
  } catch (error: any) {
    await deleteStoredAttachment(storagePath).catch(() => undefined);
    // Content sharp cannot read as an image (its messages name the image format).
    if (
      String(error?.message ?? '')
        .toLowerCase()
        .includes('image')
    ) {
      throw new HttpError(
        400,
        'ATTACHMENT_IMAGE_PROCESS_FAILED',
        'The uploaded image could not be processed',
      );
    }
    throw error;
  }

  return {
    ...stored,
    mime_type: 'image/webp',
    extension: 'webp',
    file_size: info.size,
    width: info.width ?? null,
    height: info.height ?? null,
  };
};
