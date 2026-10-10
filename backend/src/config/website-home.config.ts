export interface WebsiteHomeMediaRule {
  label: string;
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  ratioTolerance: number;
  required: boolean;
}

/**
 * Ukuran media mengikuti kanvas asli halaman home Kartify yang dipakai MATEX.
 * Ukuran minimum menjaga ketajaman, sedangkan toleransi rasio mencegah banner
 * terpotong karena proporsi gambar yang tidak sesuai.
 */
export const WEBSITE_HOME_MEDIA_RULES = {
  home_main: {
    label: "Main banner",
    recommendedWidth: 3528,
    recommendedHeight: 1956,
    minWidth: 1299,
    minHeight: 720,
    ratioTolerance: 0.05,
    required: true,
  },
  home_side_1: {
    label: "Top side banner",
    recommendedWidth: 1400,
    recommendedHeight: 984,
    minWidth: 700,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  home_side_2: {
    label: "Bottom side banner",
    recommendedWidth: 1400,
    recommendedHeight: 984,
    minWidth: 700,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  home_tile_1: {
    label: "Tile banner 1",
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  home_tile_2: {
    label: "Tile banner 2",
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  home_tile_3: {
    label: "Tile banner 3",
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  home_tile_4: {
    label: "Tile banner 4",
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
} as const satisfies Record<string, WebsiteHomeMediaRule>;

export type WebsiteHomeMediaSlot = keyof typeof WEBSITE_HOME_MEDIA_RULES;

export const WEBSITE_HOME_MEDIA_SLOTS = Object.keys(
  WEBSITE_HOME_MEDIA_RULES,
) as WebsiteHomeMediaSlot[];

export const validateWebsiteHomeMedia = (
  slot: string,
  media: { mimeType: string; width: number | null; height: number | null },
): { code: string; message: string } | null => {
  const rule = WEBSITE_HOME_MEDIA_RULES[slot as WebsiteHomeMediaSlot];
  if (!rule) return null;

  if (!["image/jpeg", "image/png", "image/webp"].includes(media.mimeType)) {
    return {
      code: "WEBSITE_HOME_MEDIA_TYPE_INVALID",
      message: `${rule.label} must use JPEG, PNG, or WebP`,
    };
  }

  if (!media.width || !media.height) {
    return {
      code: "WEBSITE_HOME_MEDIA_DIMENSIONS_MISSING",
      message: `${rule.label} has no readable image dimensions`,
    };
  }

  if (media.width < rule.minWidth || media.height < rule.minHeight) {
    return {
      code: "WEBSITE_HOME_MEDIA_TOO_SMALL",
      message: `${rule.label} must be at least ${rule.minWidth} x ${rule.minHeight}px`,
    };
  }

  const expectedRatio = rule.recommendedWidth / rule.recommendedHeight;
  const actualRatio = media.width / media.height;
  const ratioDifference = Math.abs(actualRatio - expectedRatio) / expectedRatio;

  if (ratioDifference > rule.ratioTolerance) {
    return {
      code: "WEBSITE_HOME_MEDIA_RATIO_INVALID",
      message: `${rule.label} must follow the ${rule.recommendedWidth}:${rule.recommendedHeight} aspect ratio`,
    };
  }

  return null;
};
