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
//==== LIST
//==================================================

export const CMS_PAGE_LIST_DEFAULT_LIMIT = 15;

export const CMS_PAGE_LIST_MAX_LIMIT = 100;
