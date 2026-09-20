//==================================================
//==== ATTACHMENT COLLECTION
//==================================================

export type AttachmentCollection =
  | "admin_profile"
  | "media_library"
  | "office_media";

//==================================================
//==== IMAGE FIT
//==================================================

export type AttachmentImageFit =
  | "cover"
  | "contain"
  | "fill"
  | "inside"
  | "outside";

//==================================================
//==== COLLECTION CONFIG
//==================================================

export interface AttachmentCollectionConfig {
  directory: string;

  maxFiles: number;

  maxFileSize: number;

  allowedMimeTypes: string[];

  image?: {
    withoutEnlargement?: boolean;

    width: number;

    height: number;

    fit: AttachmentImageFit;

    position: string;

    format: "webp";

    quality: number;
  };
}

//==================================================
//==== ATTACHMENT CONFIG
//==================================================

export const attachmentConfig: Record<
  AttachmentCollection,
  AttachmentCollectionConfig
> = {
  //==================================================
  //==== ADMIN PROFILE
  //==================================================

  admin_profile: {
    directory: "admin-profile",

    maxFiles: 1,

    maxFileSize: 8 * 1024 * 1024,

    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],

    image: {
      width: 512,

      height: 512,

      fit: "cover",

      position: "centre",

      format: "webp",

      quality: 82,

      withoutEnlargement: false,
    },
  },

  //==================================================
  //==== MEDIA LIBRARY
  //==================================================

  media_library: {
    directory: "media-library",

    maxFiles: 5,

    maxFileSize: 12 * 1024 * 1024,

    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],

    image: {
      width: 1920,

      height: 1920,

      fit: "inside",

      position: "centre",

      format: "webp",

      quality: 85,

      withoutEnlargement: true,
    },
  },

  //==================================================
  //==== OFFICE MEDIA
  //==================================================

  office_media: {
    directory: "office-media",

    // Per request.
    // Total gallery satu office boleh lebih banyak
    // melalui beberapa upload / relation.
    maxFiles: 5,

    maxFileSize: 12 * 1024 * 1024,

    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],

    image: {
      width: 1920,

      height: 1920,

      fit: "inside",

      position: "centre",

      format: "webp",

      quality: 85,

      withoutEnlargement: true,
    },
  },
};

//==================================================
//==== GET COLLECTION CONFIG
//==================================================

export const getAttachmentCollectionConfig = (
  collection: string,
): AttachmentCollectionConfig | null => {
  if (!Object.prototype.hasOwnProperty.call(attachmentConfig, collection)) {
    return null;
  }

  return attachmentConfig[collection as AttachmentCollection];
};
