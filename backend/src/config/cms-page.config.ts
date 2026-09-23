//==================================================
//==== CMS PAGE STATUS
//==================================================

export const CMS_PAGE_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  ARCHIVED: 2,
} as const;

export type CmsPageStatus =
  (typeof CMS_PAGE_STATUS)[keyof typeof CMS_PAGE_STATUS];

//==================================================
//==== CMS PAGE PUBLICATION ACTION
//==================================================

export const CMS_PAGE_PUBLICATION_ACTION = {
  PUBLISH: "publish",
  SCHEDULE: "schedule",
  CANCEL_SCHEDULE: "cancel_schedule",
  UNPUBLISH: "unpublish",
  ARCHIVE: "archive",
  RESTORE: "restore",
} as const;

export type CmsPagePublicationAction =
  (typeof CMS_PAGE_PUBLICATION_ACTION)[keyof typeof CMS_PAGE_PUBLICATION_ACTION];

export const isCmsPagePublicationAction = (
  value: string,
): value is CmsPagePublicationAction => {
  return (
    Object.values(CMS_PAGE_PUBLICATION_ACTION) as readonly string[]
  ).includes(value);
};

//==================================================
//==== CMS PAGE VISIBILITY
//==================================================

export const CMS_PAGE_VISIBILITY = {
  PRIVATE: 0,
  PUBLIC: 1,
  UNLISTED: 2,
} as const;

export type CmsPageVisibility =
  (typeof CMS_PAGE_VISIBILITY)[keyof typeof CMS_PAGE_VISIBILITY];

//==================================================
//==== TRANSLATION STATUS
//==================================================

export const CMS_PAGE_I18N_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
} as const;

export type CmsPageI18nStatus =
  (typeof CMS_PAGE_I18N_STATUS)[keyof typeof CMS_PAGE_I18N_STATUS];

//==================================================
//==== LOCALE
//==================================================

export const CMS_PAGE_DEFAULT_LOCALE = "id-ID" as const;

export const CMS_PAGE_SUPPORTED_LOCALES = ["id-ID", "en-US"] as const;

export type CmsPageLocale = (typeof CMS_PAGE_SUPPORTED_LOCALES)[number];

export const isCmsPageLocale = (value: string): value is CmsPageLocale => {
  return (CMS_PAGE_SUPPORTED_LOCALES as readonly string[]).includes(value);
};

//==================================================
//==== PUBLIC TEMPLATE CONTRACT
//==================================================

export const CMS_PAGE_TEMPLATE = {
  GADGET_HOME: "home",
  COMPANY_PROFILE: "company-profile",
  CONTACT: "contact",
  STANDARD: "standard",
} as const;

export interface CmsGadgetHomeMediaRule {
  label: string;
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  ratioTolerance: number;
  required: boolean;
}

/**
 * Kontrak media mengikuti kanvas sumber asli tema Kartify gadget-store.
 * Ukuran rekomendasi menjaga komposisi desain, sedangkan ukuran minimum
 * memberi ruang untuk optimasi file tanpa mengorbankan ketajaman.
 */
export const CMS_GADGET_HOME_MEDIA_RULES = {
  home_main: {
    label: "Main banner",
    recommendedWidth: 3528,
    recommendedHeight: 1956,
    minWidth: 1764,
    minHeight: 978,
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
    recommendedWidth: 1404,
    recommendedHeight: 984,
    minWidth: 702,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
} as const satisfies Record<string, CmsGadgetHomeMediaRule>;

export type CmsGadgetHomeAttachmentRole =
  keyof typeof CMS_GADGET_HOME_MEDIA_RULES;

export const CMS_GADGET_HOME_ATTACHMENT_ROLES = Object.keys(
  CMS_GADGET_HOME_MEDIA_RULES,
) as CmsGadgetHomeAttachmentRole[];

export const CMS_GADGET_HOME_REQUIRED_ATTACHMENT_ROLES =
  CMS_GADGET_HOME_ATTACHMENT_ROLES.filter(
    (role) => CMS_GADGET_HOME_MEDIA_RULES[role].required,
  );

export const getCmsGadgetHomeMediaRule = (
  role: string,
): CmsGadgetHomeMediaRule | null => {
  if (!(role in CMS_GADGET_HOME_MEDIA_RULES)) return null;

  return CMS_GADGET_HOME_MEDIA_RULES[role as CmsGadgetHomeAttachmentRole];
};

export const isCmsGadgetHomeTemplate = (
  template: string | null | undefined,
): boolean =>
  template === CMS_PAGE_TEMPLATE.GADGET_HOME || template === "gadget-home-v1";

export const validateCmsGadgetHomeMedia = (
  role: string,
  media: { mimeType: string; width: number | null; height: number | null },
): { code: string; message: string } | null => {
  const rule = getCmsGadgetHomeMediaRule(role);

  if (!rule) return null;

  if (!["image/jpeg", "image/png", "image/webp"].includes(media.mimeType)) {
    return {
      code: "CMS_PAGE_HOME_MEDIA_TYPE_INVALID",
      message: `${rule.label} must use JPEG, PNG, or WebP`,
    };
  }

  if (!media.width || !media.height) {
    return {
      code: "CMS_PAGE_HOME_MEDIA_DIMENSIONS_MISSING",
      message: `${rule.label} has no readable image dimensions`,
    };
  }

  if (media.width < rule.minWidth || media.height < rule.minHeight) {
    return {
      code: "CMS_PAGE_HOME_MEDIA_TOO_SMALL",
      message: `${rule.label} must be at least ${rule.minWidth} x ${rule.minHeight}px`,
    };
  }

  const expectedRatio = rule.recommendedWidth / rule.recommendedHeight;
  const actualRatio = media.width / media.height;
  const ratioDifference = Math.abs(actualRatio - expectedRatio) / expectedRatio;

  if (ratioDifference > rule.ratioTolerance) {
    return {
      code: "CMS_PAGE_HOME_MEDIA_RATIO_INVALID",
      message: `${rule.label} must follow the ${rule.recommendedWidth}:${rule.recommendedHeight} aspect ratio`,
    };
  }

  return null;
};

//==================================================
//==== LIST
//==================================================

export const CMS_PAGE_LIST_DEFAULT_LIMIT = 15;

export const CMS_PAGE_LIST_MAX_LIMIT = 100;
