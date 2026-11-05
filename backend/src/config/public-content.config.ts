export const PUBLIC_CONTENT_LOCALES = ['id-ID', 'en-US'] as const;

export type PublicContentLocale = (typeof PUBLIC_CONTENT_LOCALES)[number];

export const isPublicContentLocale = (value: unknown): value is PublicContentLocale =>
  typeof value === 'string' && PUBLIC_CONTENT_LOCALES.includes(value as PublicContentLocale);

export const PUBLIC_CONTACT_CHANNEL_TYPES = [
  'whatsapp',
  'email',
  'phone',
  'social',
  'website',
  'other',
] as const;

export type PublicContactChannelType = (typeof PUBLIC_CONTACT_CHANNEL_TYPES)[number];

export const isPublicContactChannelType = (value: unknown): value is PublicContactChannelType =>
  typeof value === 'string' &&
  PUBLIC_CONTACT_CHANNEL_TYPES.includes(value as PublicContactChannelType);

export const normalizePublicContentKey = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

// What makes a record public, for a query with the record as a/p/c and its translation as i.
// Parameters, in order: company, locale.
export const PUBLIC_WHERE = {
  article: `a.id_master_comp=? AND i.article_locale=? AND i.article_i18n_status=1 AND (a.article_status='published' OR (a.article_status='scheduled' AND a.article_published_at IS NOT NULL)) AND a.article_deleted_at IS NULL AND (a.article_published_at IS NULL OR a.article_published_at<=UTC_TIMESTAMP()) AND (a.article_unpublished_at IS NULL OR a.article_unpublished_at>UTC_TIMESTAMP())`,
  product: `p.id_master_comp=? AND i.product_locale=? AND p.product_status='published'
 AND i.product_i18n_status=1 AND p.product_deleted_at IS NULL`,
  product_category: `c.id_master_comp=? AND i.product_category_locale=? AND c.product_category_status='published' AND i.product_category_i18n_status=1 AND c.product_category_deleted_at IS NULL`,
} as const;
