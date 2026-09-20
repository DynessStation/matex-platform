import { randomUUID } from "crypto";

import fs from "fs/promises";

import path from "path";

import sharp from "sharp";

import storageConfig from "../config/storage.config";

import {
  AttachmentCollection,
  getAttachmentCollectionConfig,
} from "../config/attachment.config";

//==================================================
//==== STORED ATTACHMENT
//==================================================

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

//==================================================
//==== NORMALIZE ORIGINAL NAME
//==================================================

const normalizeOriginalName = (originalName: string): string => {
  const fileName = path.basename(String(originalName ?? "file"));

  return fileName.trim().slice(0, 255);
};

//==================================================
//==== BUILD FILE URL
//==================================================

export const buildAttachmentUrl = (storagePath: string): string => {
  const cleanPath = String(storagePath).replace(/\\/g, "/").replace(/^\/+/, "");

  return `${storageConfig.baseUrl}/${cleanPath}`;
};

//==================================================
//==== GET ABSOLUTE PATH
//==================================================

export const getAttachmentAbsolutePath = (storagePath: string): string => {
  const segments = String(storagePath)
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  return path.join(storageConfig.root, ...segments);
};

//==================================================
//==== DELETE STORED FILE
//==================================================

export const deleteStoredAttachment = async (
  storagePath: string,
): Promise<void> => {
  const absolutePath = getAttachmentAbsolutePath(storagePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
};

//==================================================
//==== STORE IMAGE ATTACHMENT
//==================================================

export const storeImageAttachment = async (
  file: Express.Multer.File,

  collection: AttachmentCollection,
): Promise<StoredAttachment> => {
  //==================================================
  //==== STORAGE DRIVER
  //==================================================

  if (storageConfig.disk !== "local") {
    throw new Error(
      "The configured storage disk is not supported by the local attachment driver",
    );
  }
  //==================================================
  //==== COLLECTION CONFIG
  //==================================================

  const config = getAttachmentCollectionConfig(collection);

  if (!config) {
    throw new Error("Invalid attachment collection");
  }

  if (!config.image) {
    throw new Error("Attachment collection does not support image processing");
  }

  //==================================================
  //==== VALIDATE MIME
  //==================================================

  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error("Unsupported image type");
  }

  //==================================================
  //==== VALIDATE SIZE
  //==================================================

  if (file.size > config.maxFileSize) {
    throw new Error("File size exceeds the allowed limit");
  }

  //==================================================
  //==== ORIGINAL NAME
  //==================================================

  const originalName = normalizeOriginalName(file.originalname);

  const originalParsed = path.parse(originalName);

  const name = (originalParsed.name || "image").slice(0, 255);

  //==================================================
  //==== DIRECTORY DATE
  //==================================================

  const now = new Date();

  const year = String(now.getFullYear());

  const month = String(now.getMonth() + 1).padStart(2, "0");

  //==================================================
  //==== FILE NAME
  //==================================================

  const generatedName = randomUUID().replace(/-/g, "");

  const extension = config.image.format;

  const fileName = `${generatedName}.${extension}`;

  //==================================================
  //==== STORAGE PATH
  //==================================================

  const storagePath = path.posix.join(config.directory, year, month, fileName);

  const absolutePath = getAttachmentAbsolutePath(storagePath);

  const absoluteDirectory = path.dirname(absolutePath);

  //==================================================
  //==== CREATE DIRECTORY
  //==================================================

  await fs.mkdir(absoluteDirectory, {
    recursive: true,
  });

  //==================================================
  //==== PROCESS IMAGE
  //==================================================

  let info: sharp.OutputInfo;

  try {
    info = await sharp(file.buffer, {
      failOn: "error",
    })
      //==================================================
      //==== AUTO ROTATE FROM EXIF
      //==================================================

      .rotate()

      //==================================================
      //==== RESIZE
      //==================================================

      .resize({
        width: config.image.width,

        height: config.image.height,

        fit: config.image.fit,

        position: config.image.position,

        withoutEnlargement: config.image.withoutEnlargement ?? false,
      })

      //==================================================
      //==== WEBP
      //==================================================

      .webp({
        quality: config.image.quality,
      })

      //==================================================
      //==== SAVE
      //==================================================

      .toFile(absolutePath);
  } catch (error) {
    //==================================================
    //==== CLEAN PARTIAL FILE
    //==================================================

    await deleteStoredAttachment(storagePath).catch(() => undefined);

    throw error;
  }

  //==================================================
  //==== RESPONSE
  //==================================================

  return {
    collection_name: collection,

    name,

    original_name: originalName,

    file_name: fileName,

    mime_type: "image/webp",

    extension: "webp",

    disk: storageConfig.disk,

    storage_path: storagePath,

    file_size: info.size,

    width: info.width ?? null,

    height: info.height ?? null,

    asset_url: buildAttachmentUrl(storagePath),
  };
};
