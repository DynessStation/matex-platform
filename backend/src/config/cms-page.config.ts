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

export const CMS_GADGET_HOME_ATTACHMENT_ROLES = [
  "home_main",
  "home_side_1",
  "home_side_2",
  "home_tile_1",
  "home_tile_2",
  "home_tile_3",
  "home_tile_4",
] as const;

//==================================================
//==== LIST
//==================================================

export const CMS_PAGE_LIST_DEFAULT_LIMIT = 15;

export const CMS_PAGE_LIST_MAX_LIMIT = 100;
