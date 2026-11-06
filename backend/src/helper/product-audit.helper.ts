// What the product audit looks for: the same conditions count the problems in the insight band
// (ctrl/admin/catalog-insight.ts) and filter the list when "Perbaiki" is clicked (?audit=).
// Each is a condition on a product with the alias `p`.
export const PRODUCT_AUDITS = {
  no_image: `NOT EXISTS (SELECT 1 FROM product_catalog_attachment a
      WHERE a.id_product = p.id_product AND a.product_attachment_role = 'thumbnail')`,
  // Shows its price on the website, but has none to show.
  no_price: `(p.product_price_visibility = 'displayed' AND NOT EXISTS (
      SELECT 1 FROM product_catalog_price x
      WHERE x.id_product = p.id_product AND x.product_price_is_public = 1
        AND x.product_price_is_active = 1))`,
  no_channel: `NOT EXISTS (SELECT 1 FROM product_catalog_marketplace m
      WHERE m.id_product = p.id_product AND m.product_marketplace_is_active = 1)`,
  // Both languages are required to save, so "no English" shows as a name copied from Indonesian.
  untranslated: `EXISTS (SELECT 1 FROM product_catalog_i18n x
      JOIN product_catalog_i18n e ON e.id_product = x.id_product AND e.product_locale = 'en-US'
      WHERE x.id_product = p.id_product AND x.product_locale = 'id-ID'
        AND x.product_name = e.product_name)`,
  no_summary: `EXISTS (SELECT 1 FROM product_catalog_i18n x
      WHERE x.id_product = p.id_product
        AND (x.product_short_description IS NULL OR TRIM(x.product_short_description) = ''))`,
} as const;

export type ProductAudit = keyof typeof PRODUCT_AUDITS;

export const isProductAudit = (value: unknown): value is ProductAudit =>
  typeof value === 'string' && Object.keys(PRODUCT_AUDITS).includes(value);
