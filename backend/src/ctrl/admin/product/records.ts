// Database steps shared by the product routes: reading a product with its relations, and
// saving a whole product (create and update).
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../../helper/attachment.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest } from '../../../middleware/auth-jwt.middleware';
import { ProductPayload, parsePayload } from './input';

const { pool } = db;

export const BASE_SELECT = `SELECT p.*, i.product_slug, i.product_name,
    i.product_short_description, i.product_description, i.product_specifications_json,
    i.product_meta_title, i.product_meta_description, i.product_canonical_url,
    i.product_og_title, i.product_og_description
  FROM product_catalog p
  LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = ?`;

export const productNotFound = (res: Response) =>
  sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');

const mediaDto = (row: any) => ({
  id_attachment: keyhsid.idAttachment.encode(Number(row.id_attachment)),
  asset_url: buildAttachmentUrl(row.storage_path),
  original_url: buildAttachmentUrl(row.storage_path),
  name: row.name ?? '',
  width: row.width == null ? null : Number(row.width),
  height: row.height == null ? null : Number(row.height),
  mime_type: row.mime_type ?? '',
  role: row.product_attachment_role,
  sort_order: Number(row.product_attachment_sort_order),
});

const priceDto = (item: any) => ({
  id: Number(item.id_product_price),
  type: item.product_price_type,
  label: item.product_price_label,
  currency: item.product_price_currency,
  amount: Number(item.product_price_amount),
  compare_at: item.product_price_compare_at == null ? null : Number(item.product_price_compare_at),
  min_qty: item.product_price_min_qty == null ? null : Number(item.product_price_min_qty),
  max_qty: item.product_price_max_qty == null ? null : Number(item.product_price_max_qty),
  starts_at: item.product_price_starts_at,
  ends_at: item.product_price_ends_at,
  is_public: Boolean(item.product_price_is_public),
  is_active: Boolean(item.product_price_is_active),
  sort_order: Number(item.product_price_sort_order),
});

const marketplaceDto = (item: any) => ({
  id: Number(item.id_product_marketplace),
  provider: item.product_marketplace_provider,
  label: item.product_marketplace_label,
  url: item.product_marketplace_url,
  sku: item.product_marketplace_sku,
  price: item.product_marketplace_price == null ? null : Number(item.product_marketplace_price),
  currency: item.product_marketplace_currency,
  is_primary: Boolean(item.product_marketplace_is_primary),
  is_active: Boolean(item.product_marketplace_is_active),
  sort_order: Number(item.product_marketplace_sort_order),
});

/**
 * Product rows with their categories (names in `locale`), media, prices, and marketplaces.
 * The raw row columns are kept in the result (the admin UI reads some of them).
 */
export const hydrate = async (rows: RowDataPacket[], company: number, locale: string) => {
  if (!rows.length) return [];
  const ids = rows.map((row) => Number(row.id_product));
  const marks = ids.map(() => '?').join(',');
  const [categories] = await pool.query<RowDataPacket[]>(
    `SELECT pc.id_product, c.id_product_category, i.product_category_name,
       i.product_category_slug
     FROM product_catalog_category pc
     JOIN product_category c ON c.id_product_category = pc.id_product_category
       AND c.id_master_comp = pc.id_master_comp
     LEFT JOIN product_category_i18n i ON i.id_product_category = c.id_product_category
       AND i.product_category_locale = ?
     WHERE pc.id_product IN (${marks}) AND pc.id_master_comp = ?
     ORDER BY pc.sort_order`,
    [locale, ...ids, company],
  );
  const [media] = await pool.query<RowDataPacket[]>(
    `SELECT pa.id_product, pa.product_attachment_role, pa.product_attachment_sort_order, a.*
     FROM product_catalog_attachment pa
     JOIN attachment a ON a.id_attachment = pa.id_attachment
     WHERE pa.id_product IN (${marks}) AND pa.id_master_comp = ?
     ORDER BY pa.product_attachment_sort_order`,
    [...ids, company],
  );
  const [prices] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM product_catalog_price WHERE id_product IN (${marks}) AND id_master_comp = ?
     ORDER BY product_price_sort_order`,
    [...ids, company],
  );
  const [marketplaces] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM product_catalog_marketplace
     WHERE id_product IN (${marks}) AND id_master_comp = ?
     ORDER BY product_marketplace_sort_order`,
    [...ids, company],
  );
  const ofProduct = (items: RowDataPacket[], id: number) =>
    items.filter((item) => Number(item.id_product) === id);

  return rows.map((row) => {
    const id = Number(row.id_product);
    const productMedia = ofProduct(media, id).map(mediaDto);
    const productPrices = ofProduct(prices, id).map(priceDto);
    const publicPrice = productPrices.find((item) => item.is_public) ?? productPrices[0];
    return {
      ...row,
      id: keyhsid.idProduct.encode(id),
      key: row.product_key,
      sku: row.product_sku,
      name: row.product_name ?? row.product_key,
      slug: row.product_slug ?? '',
      short_description: row.product_short_description ?? '',
      description: row.product_description ?? '',
      product_type: row.product_type,
      product_kind: row.product_kind,
      origin_province: row.product_origin_province,
      origin_city: row.product_origin_city,
      status: row.product_status,
      stock_status: row.product_stock_status,
      quantity: row.product_stock_quantity == null ? 0 : Number(row.product_stock_quantity),
      price_visibility: row.product_price_visibility,
      price: publicPrice?.amount ?? 0,
      sale_price: publicPrice?.amount ?? 0,
      is_featured: Boolean(row.product_is_featured),
      sort_order: Number(row.product_sort_order),
      product_thumbnail: productMedia.find((item) => item.role === 'thumbnail') ?? null,
      product_galleries: productMedia.filter((item) => item.role === 'gallery'),
      media: productMedia,
      categories: ofProduct(categories, id).map((item) => ({
        id: keyhsid.idProductCategory.encode(Number(item.id_product_category)),
        name: item.product_category_name,
        slug: item.product_category_slug,
      })),
      prices: productPrices,
      marketplaces: ofProduct(marketplaces, id).map(marketplaceDto),
    };
  });
};

/** Key, SKU, and slugs must not be used by another product (slugs of deleted ones count). */
const assertUnique = async (
  connection: PoolConnection,
  idMasterComp: number,
  id: number | null,
  payload: ProductPayload,
) => {
  const [products] = await connection.query<RowDataPacket[]>(
    `SELECT product_key FROM product_catalog
     WHERE id_master_comp = ? AND product_deleted_at IS NULL AND (? IS NULL OR id_product <> ?)
       AND (product_key = ? OR product_sku = ?)
     LIMIT 1`,
    [idMasterComp, id, id, payload.key, payload.sku],
  );
  if (products.length) {
    if (String(products[0].product_key) === payload.key) {
      throw new HttpError(409, 'PRODUCT_KEY_EXISTS', 'Kunci internal produk sudah digunakan', {
        field: 'key',
      });
    }
    throw new HttpError(409, 'PRODUCT_SKU_EXISTS', 'SKU produk sudah digunakan', { field: 'sku' });
  }
  for (const translation of payload.translations) {
    const [slugs] = await connection.query<RowDataPacket[]>(
      `SELECT id_product FROM product_catalog_i18n
       WHERE id_master_comp = ? AND product_locale = ? AND product_slug = ?
         AND (? IS NULL OR id_product <> ?)
       LIMIT 1`,
      [idMasterComp, translation.locale, translation.slug, id, id],
    );
    if (slugs.length) {
      throw new HttpError(
        409,
        'PRODUCT_SLUG_EXISTS',
        `Alamat produk ${translation.locale} sudah digunakan`,
        { field: 'slug', locale: translation.locale },
      );
    }
  }
};

const PRODUCT_COLUMNS = [
  'product_key',
  'product_sku',
  'product_type',
  'product_kind',
  'product_status',
  'product_unit',
  'product_barcode',
  'product_manufacturer_code',
  'product_country_origin',
  'product_origin_province',
  'product_origin_city',
  'product_hs_code',
  'product_weight_grams',
  'product_length_mm',
  'product_width_mm',
  'product_height_mm',
  'product_min_order_qty',
  'product_lead_time_days',
  'product_manage_stock',
  'product_stock_quantity',
  'product_stock_status',
  'product_price_visibility',
  'product_internal_commerce_enabled',
  'product_is_featured',
  'product_sort_order',
];

// Values in PRODUCT_COLUMNS order.
const productValues = (payload: ProductPayload) => [
  payload.key,
  payload.sku,
  payload.productType,
  payload.kind,
  payload.status,
  payload.unit,
  payload.barcode,
  payload.manufacturerCode,
  payload.countryOrigin,
  payload.provinceOrigin,
  payload.cityOrigin,
  payload.hsCode,
  payload.weight,
  payload.length,
  payload.width,
  payload.height,
  payload.minOrderQty,
  payload.leadTimeDays,
  payload.manageStock,
  payload.stockQuantity,
  payload.stockStatus,
  payload.priceVisibility,
  payload.internalCommerce,
  payload.isFeatured,
  payload.sortOrder,
];

// Translations, categories, media, prices, and marketplaces are replaced as a whole.
const replaceRelations = async (
  connection: PoolConnection,
  id: number,
  idMasterComp: number,
  payload: ProductPayload,
) => {
  const clear = (table: string) =>
    connection.query(`DELETE FROM ${table} WHERE id_product = ? AND id_master_comp = ?`, [
      id,
      idMasterComp,
    ]);

  await clear('product_catalog_i18n');
  for (const item of payload.translations) {
    await connection.query(
      `INSERT INTO product_catalog_i18n (id_product, id_master_comp, product_locale, product_slug,
         product_name, product_short_description, product_description,
         product_specifications_json, product_meta_title, product_meta_description,
         product_canonical_url, product_og_title, product_og_description, product_i18n_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, JSON_EXTRACT(?, '$'), ?, ?, ?, ?, ?, ?)`,
      [
        id,
        idMasterComp,
        item.locale,
        item.slug,
        item.name,
        item.shortDescription,
        item.description,
        item.specifications == null ? null : JSON.stringify(item.specifications),
        item.metaTitle,
        item.metaDescription,
        item.canonicalUrl,
        item.ogTitle,
        item.ogDescription,
        item.status,
      ],
    );
  }

  // The first category is the primary one.
  await clear('product_catalog_category');
  for (const [index, categoryId] of payload.categoryIds.entries()) {
    const [valid] = await connection.query<RowDataPacket[]>(
      `SELECT id_product_category FROM product_category
       WHERE id_product_category = ? AND id_master_comp = ? AND product_category_deleted_at IS NULL`,
      [categoryId, idMasterComp],
    );
    if (!valid.length) {
      throw new HttpError(400, 'PRODUCT_CATEGORY_INVALID', 'Selected category is unavailable');
    }
    await connection.query(
      `INSERT INTO product_catalog_category (id_product, id_product_category, id_master_comp,
         is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [id, categoryId, idMasterComp, index === 0 ? 1 : 0, index],
    );
  }

  // Thumbnail and share image must be images; gallery items may also be videos.
  await clear('product_catalog_attachment');
  for (const item of payload.media) {
    const [valid] = await connection.query<RowDataPacket[]>(
      `SELECT id_attachment, mime_type FROM attachment
       WHERE id_attachment = ? AND id_master_comp = ? AND attachment_status = 1
         AND deleted_at IS NULL`,
      [item.id, idMasterComp],
    );
    if (!valid.length) {
      throw new HttpError(400, 'PRODUCT_MEDIA_INVALID', 'Selected media is unavailable');
    }
    const mime = String(valid[0].mime_type ?? '');
    const isImage = mime.startsWith('image/');
    const isVideo = ['video/mp4', 'video/webm', 'video/ogg'].includes(mime);
    if (
      ((item.role === 'thumbnail' || item.role === 'og') && !isImage) ||
      (item.role === 'gallery' && !isImage && !isVideo)
    ) {
      throw new HttpError(
        400,
        'PRODUCT_MEDIA_TYPE_INVALID',
        'Thumbnail and social media must be images; gallery media may be images or supported videos',
      );
    }
    await connection.query(
      `INSERT INTO product_catalog_attachment (id_product, id_master_comp, id_attachment,
         product_attachment_role, product_attachment_sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [id, idMasterComp, item.id, item.role, item.sortOrder],
    );
  }

  await clear('product_catalog_price');
  for (const item of payload.prices) {
    await connection.query(
      `INSERT INTO product_catalog_price (id_product, id_master_comp, product_price_type,
         product_price_label, product_price_currency, product_price_amount,
         product_price_compare_at, product_price_min_qty, product_price_max_qty,
         product_price_starts_at, product_price_ends_at, product_price_is_public,
         product_price_is_active, product_price_sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        idMasterComp,
        item.type,
        item.label,
        item.currency,
        item.amount,
        item.compareAt,
        item.minQty,
        item.maxQty,
        item.startsAt,
        item.endsAt,
        item.isPublic,
        item.isActive,
        item.sortOrder,
      ],
    );
  }

  await clear('product_catalog_marketplace');
  for (const item of payload.marketplaces) {
    await connection.query(
      `INSERT INTO product_catalog_marketplace (id_product, id_master_comp,
         product_marketplace_provider, product_marketplace_label, product_marketplace_url,
         product_marketplace_sku, product_marketplace_price, product_marketplace_currency,
         product_marketplace_is_primary, product_marketplace_is_active,
         product_marketplace_sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        idMasterComp,
        item.provider,
        item.label,
        item.url,
        item.sku,
        item.price,
        item.currency,
        item.isPrimary,
        item.isActive,
        item.sortOrder,
      ],
    );
  }
};

/** Creates (`id` null) or updates a whole product. */
export const saveProduct = async (req: AuthRequest, res: Response, id: number | null) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const payload = parsePayload(req.body);
  if (!payload) {
    return sendError(res, 400, 'PRODUCT_PAYLOAD_INVALID', 'Product data is incomplete or invalid');
  }

  const productId = await withTransaction(pool, async (connection) => {
    await assertUnique(connection, scope.idMasterComp, id, payload);
    let savedId: number;
    if (id) {
      const [exists] = await connection.query<RowDataPacket[]>(
        `SELECT id_product FROM product_catalog
         WHERE id_product = ? AND id_master_comp = ? AND product_deleted_at IS NULL FOR UPDATE`,
        [id, scope.idMasterComp],
      );
      if (!exists.length) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      await connection.query(
        `UPDATE product_catalog SET ${PRODUCT_COLUMNS.map((column) => `${column} = ?`).join(', ')},
           id_updated_by = ?
         WHERE id_product = ? AND id_master_comp = ?`,
        [...productValues(payload), scope.idAdminAcct, id, scope.idMasterComp],
      );
      savedId = id;
    } else {
      const columns = ['id_master_comp', ...PRODUCT_COLUMNS, 'id_created_by', 'id_updated_by'];
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO product_catalog (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})`,
        [scope.idMasterComp, ...productValues(payload), scope.idAdminAcct, scope.idAdminAcct],
      );
      savedId = insert.insertId;
    }
    await replaceRelations(connection, savedId, scope.idMasterComp, payload);
    await writeAuditLog({
      req,
      connection,
      writeMode: 'strict',
      idMasterComp: scope.idMasterComp,
      eventCode: id ? 'product.updated' : 'product.created',
      category: 'data_change',
      module: 'product',
      action: id ? 'update' : 'create',
      actorType: 'admin',
      actorId: scope.idAdminAcct,
      actorLabel: req.user?.alias ?? null,
      entityType: 'product',
      entityId: savedId,
      entityLabel: payload.sku,
    });
    return savedId;
  });

  return sendSuccess(
    res,
    id ? 200 : 201,
    id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
    id ? 'Product updated' : 'Product created',
    { id: keyhsid.idProduct.encode(productId) },
  );
};

/**
 * Locks the live product and runs `change` with it in one transaction; false when there is no
 * such product.
 */
export const changeProduct = async (
  id: number,
  idMasterComp: number,
  change: (connection: PoolConnection, product: RowDataPacket) => Promise<void>,
) =>
  withTransaction(pool, async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT product_sku, product_status FROM product_catalog
       WHERE id_product = ? AND id_master_comp = ? AND product_deleted_at IS NULL FOR UPDATE`,
      [id, idMasterComp],
    );
    if (!rows.length) return false;
    await change(connection, rows[0]);
    return true;
  });
