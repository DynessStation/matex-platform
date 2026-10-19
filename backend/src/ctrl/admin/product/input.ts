// Product save body: one function reads and validates the whole product (create and update).
import keyhsid from '../../../hsid';
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from '../../../config/public-content.config';
import { decodeId } from '../../../helper/id.helper';
import { trimTo } from '../../../helper/input.helper';
import { normalizeProductMediaSortOrder } from '../../../helper/product-media.helper';

export const PRODUCT_STATUSES = new Set(['draft', 'published', 'archived']);

// Answer for a duplicate-key error the checks before the write did not catch.
export const PRODUCT_DUPLICATE = {
  code: 'PRODUCT_DUPLICATE',
  message: 'Product key, SKU, or localized slug already exists',
};
const TYPES = new Set(['physical', 'service', 'digital']);
const STOCKS = new Set(['in_stock', 'out_of_stock', 'preorder', 'made_to_order']);
const PRICE_VISIBILITIES = new Set(['displayed', 'contact', 'hidden']);
const PRICE_TYPES = new Set(['end_user', 'wholesale']);
const PRICE_CURRENCIES = new Set(['IDR', 'USD']);
const MEDIA_ROLES = new Set(['thumbnail', 'gallery', 'og', 'size_chart', 'document']);

const numberOrNull = (value: unknown) =>
  value === '' || value == null || !Number.isFinite(Number(value)) ? null : Number(value);

const readTranslations = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const translations = [];
  const locales = new Set<string>();
  for (const item of value) {
    const locale = String(item?.locale ?? '');
    const slug = normalizePublicContentKey(item?.slug).slice(0, 255);
    const name = trimTo(item?.name, 255);
    if (!isPublicContentLocale(locale) || locales.has(locale) || !slug || !name) return null;
    locales.add(locale);
    translations.push({
      locale,
      slug,
      name,
      shortDescription: trimTo(item?.short_description, 4000) || null,
      description:
        String(item?.description ?? '')
          .trim()
          .slice(0, 100000) || null,
      specifications: item?.specifications ?? null,
      metaTitle: trimTo(item?.meta_title, 255) || null,
      metaDescription: trimTo(item?.meta_description, 500) || null,
      canonicalUrl: trimTo(item?.canonical_url, 1000) || null,
      ogTitle: trimTo(item?.og_title, 255) || null,
      ogDescription: trimTo(item?.og_description, 500) || null,
      status: Number(item?.status) === 0 ? 0 : 1,
    });
  }
  return PUBLIC_CONTENT_LOCALES.every((locale) => locales.has(locale)) ? translations : null;
};

// One thumbnail and one share image at most, up to ten gallery items, and no two items of a
// role on the same position.
const readMedia = (value: unknown) => {
  const media = (Array.isArray(value) ? value : []).map((item: any, index: number) => ({
    id: decodeId(item?.id, keyhsid.idAttachment),
    role: String(item?.role ?? 'gallery'),
    // Zero is a valid first position. Using `|| index` here made the first gallery item
    // inherit its position in the whole media array. When a thumbnail and OG image preceded
    // it, the third gallery item then got the same order and the payload was rejected.
    sortOrder: normalizeProductMediaSortOrder(item?.sort_order, index),
  }));
  if (media.some((item) => !item.id || !MEDIA_ROLES.has(item.role))) return null;
  const count = (role: string) => media.filter((item) => item.role === role).length;
  if (
    count('gallery') > 10 ||
    count('thumbnail') > 1 ||
    count('og') > 1 ||
    new Set(media.map((item) => `${item.role}:${item.sortOrder}`)).size !== media.length
  ) {
    return null;
  }
  return media as { id: number; role: string; sortOrder: number }[];
};

// Public end-user prices: one per currency; a "displayed" price needs an active one in both
// currencies. Only end-user prices can be public.
const readPrices = (value: unknown, priceVisibility: string) => {
  const prices = (Array.isArray(value) ? value : []).map((item: any, index: number) => ({
    type: trimTo(item?.type, 40),
    label: trimTo(item?.label, 120) || null,
    currency: trimTo(item?.currency || 'IDR', 3).toUpperCase(),
    amount: numberOrNull(item?.amount),
    compareAt: numberOrNull(item?.compare_at),
    minQty: numberOrNull(item?.min_qty),
    maxQty: numberOrNull(item?.max_qty),
    startsAt: item?.starts_at || null,
    endsAt: item?.ends_at || null,
    isPublic: item?.is_public ? 1 : 0,
    isActive: item?.is_active === false ? 0 : 1,
    sortOrder: Math.max(0, Number(item?.sort_order) || index),
  }));
  if (
    prices.some(
      (item) =>
        !PRICE_TYPES.has(item.type) ||
        item.amount == null ||
        item.amount < 0 ||
        !PRICE_CURRENCIES.has(item.currency),
    )
  ) {
    return null;
  }
  const publicConsumer = prices.filter((item) => item.isPublic && item.type === 'end_user');
  const publicCurrencies = publicConsumer.map((item) => item.currency);
  const activeCurrencies = new Set(
    publicConsumer.filter((item) => item.isActive).map((item) => item.currency),
  );
  if (
    new Set(publicCurrencies).size !== publicCurrencies.length ||
    (priceVisibility === 'displayed' &&
      !['IDR', 'USD'].every((currency) => activeCurrencies.has(currency)))
  ) {
    return null;
  }
  for (const item of prices) {
    if (item.type !== 'end_user') item.isPublic = 0;
  }
  return prices;
};

// At most one primary among the active marketplaces; the first active one becomes primary.
const readMarketplaces = (value: unknown) => {
  const marketplaces = (Array.isArray(value) ? value : []).map((item: any, index: number) => ({
    provider: trimTo(item?.provider, 50),
    label: trimTo(item?.label, 120) || null,
    url: trimTo(item?.url, 1000),
    sku: trimTo(item?.sku, 120) || null,
    price: numberOrNull(item?.price),
    currency: trimTo(item?.currency || 'IDR', 3).toUpperCase(),
    isPrimary: item?.is_primary ? 1 : 0,
    isActive: item?.is_active === false ? 0 : 1,
    sortOrder: Math.max(0, Number(item?.sort_order) || index),
  }));
  if (
    marketplaces.some(
      (item) =>
        !item.provider ||
        !/^https?:\/\//i.test(item.url) ||
        (item.price != null && item.price < 0) ||
        item.currency.length !== 3,
    )
  ) {
    return null;
  }
  for (const item of marketplaces) {
    if (!item.isActive) item.isPrimary = 0;
  }
  const active = marketplaces.filter((item) => item.isActive);
  if (active.filter((item) => item.isPrimary).length > 1) return null;
  if (active.length && !active.some((item) => item.isPrimary)) active[0].isPrimary = 1;
  return marketplaces;
};

/** The whole product body, or null when anything is missing or invalid. */
export const parsePayload = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const sku = trimTo(body?.sku, 120);
  const status = String(body?.status ?? 'draft');
  const productType = String(body?.product_type ?? 'physical');
  const stockStatus = String(body?.stock_status ?? 'in_stock');
  const priceVisibility = String(body?.price_visibility ?? 'contact');
  if (
    !key ||
    !sku ||
    !PRODUCT_STATUSES.has(status) ||
    !TYPES.has(productType) ||
    !STOCKS.has(stockStatus) ||
    !PRICE_VISIBILITIES.has(priceVisibility) ||
    !Array.isArray(body?.translations) ||
    !Array.isArray(body?.category_ids) ||
    body.category_ids.length === 0
  ) {
    return null;
  }

  const translations = readTranslations(body.translations);
  if (!translations) return null;
  // Unreadable category ids are dropped; at least one must remain.
  const categoryIds = [
    ...new Set(
      body.category_ids
        .map((id: unknown) => decodeId(id, keyhsid.idProductCategory))
        .filter(Boolean),
    ),
  ] as number[];
  if (!categoryIds.length) return null;
  const media = readMedia(body?.media);
  if (!media) return null;
  const prices = readPrices(body?.prices, priceVisibility);
  if (!prices) return null;
  const marketplaces = readMarketplaces(body?.marketplaces);
  if (!marketplaces) return null;

  const weight = numberOrNull(body?.weight_grams);
  const length = numberOrNull(body?.length_mm);
  const width = numberOrNull(body?.width_mm);
  const height = numberOrNull(body?.height_mm);
  const minOrderQty = numberOrNull(body?.min_order_qty) ?? 1;
  const leadTimeDays = numberOrNull(body?.lead_time_days);
  const stockQuantity = numberOrNull(body?.stock_quantity);
  if (
    [weight, length, width, height, leadTimeDays, stockQuantity].some(
      (value) => value != null && value < 0,
    ) ||
    minOrderQty < 1
  ) {
    return null;
  }

  return {
    key,
    sku,
    status,
    productType,
    stockStatus,
    priceVisibility,
    categoryIds,
    media,
    prices,
    marketplaces,
    translations,
    kind: trimTo(body?.product_kind, 120) || null,
    unit: trimTo(body?.unit, 40) || null,
    barcode: trimTo(body?.barcode, 120) || null,
    manufacturerCode: trimTo(body?.manufacturer_code, 120) || null,
    countryOrigin: trimTo(body?.country_origin, 100) || null,
    provinceOrigin: trimTo(body?.origin_province, 100) || null,
    cityOrigin: trimTo(body?.origin_city, 100) || null,
    hsCode: trimTo(body?.hs_code, 50) || null,
    weight,
    length,
    width,
    height,
    minOrderQty,
    leadTimeDays,
    manageStock: body?.manage_stock ? 1 : 0,
    stockQuantity,
    internalCommerce: body?.internal_commerce_enabled ? 1 : 0,
    isFeatured: body?.is_featured ? 1 : 0,
    sortOrder: Math.max(0, Number(body?.sort_order) || 0),
  };
};

export type ProductPayload = NonNullable<ReturnType<typeof parsePayload>>;
