// Attachment collection

export type AttachmentCollection =
  'admin_profile' | 'media_library' | 'office_media' | 'product_media';

// Image fit

export type AttachmentImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

// Collection config

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
    format: 'webp';
    quality: number;
  };
}

// Attachment config

export const attachmentConfig: Record<AttachmentCollection, AttachmentCollectionConfig> = {
  // Admin profile
  admin_profile: {
    directory: 'admin-profile',
    maxFiles: 1,
    maxFileSize: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    image: {
      width: 512,
      height: 512,
      fit: 'cover',
      position: 'centre',
      format: 'webp',
      quality: 82,
      withoutEnlargement: false,
    },
  },
  // Media library
  media_library: {
    directory: 'media-library',
    maxFiles: 5,
    maxFileSize: 12 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    image: {
      width: 1920,
      height: 1920,
      fit: 'inside',
      position: 'centre',
      format: 'webp',
      quality: 85,
      withoutEnlargement: true,
    },
  },
  // Office media
  office_media: {
    directory: 'office-media',
    // Per request.
    // Total gallery satu office boleh lebih banyak
    // melalui beberapa upload / relation.
    maxFiles: 5,
    maxFileSize: 12 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    image: {
      width: 1920,
      height: 1920,
      fit: 'inside',
      position: 'centre',
      format: 'webp',
      quality: 85,
      withoutEnlargement: true,
    },
  },
  // Product media
  product_media: {
    directory: 'product-media',
    // Product gallery may contain up to ten images/videos per upload.
    maxFiles: 10,
    maxFileSize: 50 * 1024 * 1024,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/ogg',
    ],
    image: {
      width: 1920,
      height: 1920,
      fit: 'inside',
      position: 'centre',
      format: 'webp',
      quality: 85,
      withoutEnlargement: true,
    },
  },
};

// Get collection config

export const getAttachmentCollectionConfig = (
  collection: string,
): AttachmentCollectionConfig | null => {
  if (!Object.prototype.hasOwnProperty.call(attachmentConfig, collection)) {
    return null;
  }

  return attachmentConfig[collection as AttachmentCollection];
};
