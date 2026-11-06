// The insight bands of Kategori and Produk: most viewed, marketplace clicks, products per
// category, and the data audits. Paths are under .../insight, and this file loads before
// product.ts and product-category.ts, so they are not taken for a record id.
// Contract: ops/e2e/write/catalog-insight-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../db');
import keyhsid from '../../hsid';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../helper/attachment.helper';
import { PRODUCT_AUDITS, ProductAudit } from '../../helper/product-audit.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

const TOP_LIMIT = 5;

const daysOf = (value: unknown) => {
  const days = Number(value);
  return days === 1 || days === 30 ? days : 7;
};

/** Page views per address under the given starts. */
const viewsBy = async (idMasterComp: number, days: number, prefixes: string[]) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT SUBSTRING_INDEX(path, '?', 1) AS clean_path, COUNT(*) AS total
     FROM public_analytics_event
     WHERE id_master_comp = ? AND event_name = 'page_view'
       AND (${prefixes.map(() => 'path LIKE ?').join(' OR ')})
       AND received_at >= NOW() - INTERVAL ? DAY
     GROUP BY clean_path`,
    [idMasterComp, ...prefixes.map((prefix) => `${prefix}%`), days],
  );
  return rows;
};

/** Views added up per record: `paths` knows which record each address (old ones too) is. */
const topByViews = (views: RowDataPacket[], paths: Map<string, number>) => {
  const totals = new Map<number, number>();
  for (const row of views) {
    const id = paths.get(row.clean_path);
    if (id) totals.set(id, (totals.get(id) ?? 0) + Number(row.total));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_LIMIT);
};

//==================================================
//==== PRODUCTS
//==================================================

router.get(
  '/api/v1/products/insight/top',
  verifyToken,
  requirePermission('product.view'),
  onFailure('PRODUCT_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const company = scope.idMasterComp;
    const views = await viewsBy(company, daysOf(req.query.days), ['/produk/', '/en/product/']);
    const [slugs] = await pool.query<RowDataPacket[]>(
      `SELECT id_product AS id, product_locale AS locale, product_slug AS slug
       FROM product_catalog_i18n WHERE id_master_comp = ?
       UNION ALL
       SELECT slug_redirect_entity_id, slug_redirect_locale, slug_redirect_old_slug
       FROM slug_redirect WHERE id_master_comp = ? AND slug_redirect_entity = 'product'`,
      [company, company],
    );
    const paths = new Map(
      slugs.map((row) => [
        `${row.locale === 'en-US' ? '/en/product/' : '/produk/'}${row.slug}`,
        Number(row.id),
      ]),
    );
    const top = topByViews(views, paths);
    if (!top.length) return sendSuccess(res, 200, 'PRODUCT_INSIGHT_TOP', 'Top products', []);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_product, p.product_sku, i.product_name, i.product_slug, a.storage_path
       FROM product_catalog p
       JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = 'id-ID'
       LEFT JOIN product_catalog_attachment pa ON pa.id_product = p.id_product
         AND pa.product_attachment_role = 'thumbnail'
       LEFT JOIN attachment a ON a.id_attachment = pa.id_attachment
       WHERE p.id_product IN (?) AND p.id_master_comp = ? AND p.product_deleted_at IS NULL`,
      [top.map(([id]) => id), company],
    );
    const byId = new Map(rows.map((row) => [Number(row.id_product), row]));
    return sendSuccess(
      res,
      200,
      'PRODUCT_INSIGHT_TOP',
      'Top products',
      top.flatMap(([id, total]) => {
        const row = byId.get(id);
        return row
          ? [
              {
                id: keyhsid.idProduct.encode(id),
                name: row.product_name,
                sku: row.product_sku,
                slug: row.product_slug,
                thumbnail: row.storage_path ? buildAttachmentUrl(row.storage_path) : null,
                views: total,
              },
            ]
          : [];
      }),
    );
  },
);

// A click on a marketplace link is saved with the address's host.
const MARKETPLACE_HOSTS: { key: string; name: string; pattern: RegExp }[] = [
  { key: 'shopee', name: 'Shopee', pattern: /(^|\.)shopee\./ },
  { key: 'tokopedia', name: 'Tokopedia', pattern: /(^|\.)tokopedia\./ },
  { key: 'tiktok-shop', name: 'TikTok Shop', pattern: /(^|\.)tiktok\.|tiktokshop/ },
  { key: 'lazada', name: 'Lazada', pattern: /(^|\.)lazada\./ },
  { key: 'blibli', name: 'Blibli', pattern: /(^|\.)blibli\./ },
];

router.get(
  '/api/v1/products/insight/marketplaces',
  verifyToken,
  requirePermission('product.view'),
  onFailure('PRODUCT_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const [clicks] = await pool.query<RowDataPacket[]>(
      `SELECT target_key, COUNT(*) AS total FROM public_analytics_event
       WHERE id_master_comp = ? AND event_name = 'outbound_click'
         AND (path LIKE '/produk/%' OR path LIKE '/en/product/%')
         AND received_at >= NOW() - INTERVAL ? DAY
       GROUP BY target_key`,
      [scope.idMasterComp, daysOf(req.query.days)],
    );
    const [links] = await pool.query<RowDataPacket[]>(
      `SELECT m.product_marketplace_provider AS provider, COUNT(DISTINCT m.id_product) AS products
       FROM product_catalog_marketplace m
       JOIN product_catalog p ON p.id_product = m.id_product AND p.product_deleted_at IS NULL
       WHERE p.id_master_comp = ? AND m.product_marketplace_is_active = 1
       GROUP BY provider`,
      [scope.idMasterComp],
    );
    const productsBy = new Map(links.map((row) => [row.provider, Number(row.products)]));
    return sendSuccess(
      res,
      200,
      'PRODUCT_INSIGHT_MARKETPLACES',
      'Marketplace clicks',
      MARKETPLACE_HOSTS.map((item) => ({
        key: item.key,
        name: item.name,
        clicks: clicks
          .filter((row) => item.pattern.test(String(row.target_key ?? '')))
          .reduce((all, row) => all + Number(row.total), 0),
        products: productsBy.get(item.key) ?? 0,
      }))
        .filter((item) => item.clicks > 0 || item.products > 0)
        .sort((a, b) => b.clicks - a.clicks || b.products - a.products),
    );
  },
);

router.get(
  '/api/v1/products/insight/audit',
  verifyToken,
  requirePermission('product.view'),
  onFailure('PRODUCT_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const keys = Object.keys(PRODUCT_AUDITS) as ProductAudit[];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
         SUM(p.product_status = 'published') AS published,
         SUM(p.product_status = 'draft') AS draft,
         SUM(p.product_status = 'archived') AS archived,
         ${keys.map((key) => `SUM(${PRODUCT_AUDITS[key]}) AS ${key}`).join(', ')}
       FROM product_catalog p
       WHERE p.id_master_comp = ? AND p.product_deleted_at IS NULL`,
      [scope.idMasterComp],
    );
    const number = (value: unknown) => Number(value ?? 0);
    return sendSuccess(res, 200, 'PRODUCT_INSIGHT_AUDIT', 'Product audit', {
      total: number(rows[0].total),
      published: number(rows[0].published),
      draft: number(rows[0].draft),
      archived: number(rows[0].archived),
      checks: Object.fromEntries(keys.map((key) => [key, number(rows[0][key])])),
    });
  },
);

//==================================================
//==== CATEGORIES
//==================================================

router.get(
  '/api/v1/product-categories/insight/top',
  verifyToken,
  requirePermission('product_category.view'),
  onFailure('PRODUCT_CATEGORY_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const company = scope.idMasterComp;
    const views = await viewsBy(company, daysOf(req.query.days), ['/kategori/', '/en/category/']);
    const [slugs] = await pool.query<RowDataPacket[]>(
      `SELECT id_product_category AS id, product_category_locale AS locale,
         product_category_slug AS slug
       FROM product_category_i18n WHERE id_master_comp = ?
       UNION ALL
       SELECT slug_redirect_entity_id, slug_redirect_locale, slug_redirect_old_slug
       FROM slug_redirect WHERE id_master_comp = ? AND slug_redirect_entity = 'product_category'`,
      [company, company],
    );
    const paths = new Map(
      slugs.map((row) => [
        `${row.locale === 'en-US' ? '/en/category/' : '/kategori/'}${row.slug}`,
        Number(row.id),
      ]),
    );
    const top = topByViews(views, paths);
    if (!top.length) return sendSuccess(res, 200, 'CATEGORY_INSIGHT_TOP', 'Top categories', []);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id_product_category, i.product_category_name, i.product_category_slug
       FROM product_category c
       JOIN product_category_i18n i ON i.id_product_category = c.id_product_category
         AND i.product_category_locale = 'id-ID'
       WHERE c.id_product_category IN (?) AND c.id_master_comp = ?
         AND c.product_category_deleted_at IS NULL`,
      [top.map(([id]) => id), company],
    );
    const byId = new Map(rows.map((row) => [Number(row.id_product_category), row]));
    return sendSuccess(
      res,
      200,
      'CATEGORY_INSIGHT_TOP',
      'Top categories',
      top.flatMap(([id, total]) => {
        const row = byId.get(id);
        return row
          ? [
              {
                id: keyhsid.idProductCategory.encode(id),
                name: row.product_category_name,
                slug: row.product_category_slug,
                views: total,
              },
            ]
          : [];
      }),
    );
  },
);

const CATEGORY_CHECKS = {
  no_product: `NOT EXISTS (SELECT 1 FROM product_catalog_category pc
      JOIN product_catalog p ON p.id_product = pc.id_product AND p.product_deleted_at IS NULL
      WHERE pc.id_product_category = c.id_product_category)`,
  no_image: `NOT EXISTS (SELECT 1 FROM product_category_attachment a
      WHERE a.id_product_category = c.id_product_category
        AND a.product_category_attachment_role = 'image')`,
  no_description: `EXISTS (SELECT 1 FROM product_category_i18n x
      WHERE x.id_product_category = c.id_product_category
        AND (x.product_category_description IS NULL OR TRIM(x.product_category_description) = ''))`,
  untranslated: `EXISTS (SELECT 1 FROM product_category_i18n x
      JOIN product_category_i18n e ON e.id_product_category = x.id_product_category
        AND e.product_category_locale = 'en-US'
      WHERE x.id_product_category = c.id_product_category AND x.product_category_locale = 'id-ID'
        AND x.product_category_name = e.product_category_name)`,
  no_seo: `EXISTS (SELECT 1 FROM product_category_i18n x
      WHERE x.id_product_category = c.id_product_category
        AND (x.product_category_meta_description IS NULL
          OR TRIM(x.product_category_meta_description) = ''))`,
} as const;

// Products per category, and for each check how many categories fail it and the first of them:
// the tree has no filter, so "Perbaiki" opens that one.
router.get(
  '/api/v1/product-categories/insight/audit',
  verifyToken,
  requirePermission('product_category.view'),
  onFailure('PRODUCT_CATEGORY_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const company = scope.idMasterComp;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id_product_category, c.product_category_status, i.product_category_name,
         (SELECT COUNT(DISTINCT p.id_product) FROM product_catalog_category pc
          JOIN product_catalog p ON p.id_product = pc.id_product AND p.product_deleted_at IS NULL
          WHERE pc.id_product_category = c.id_product_category) AS products,
         (SELECT COUNT(DISTINCT p.id_product) FROM product_catalog_category pc
          JOIN product_catalog p ON p.id_product = pc.id_product AND p.product_deleted_at IS NULL
            AND p.product_status = 'published'
          WHERE pc.id_product_category = c.id_product_category) AS published_products,
         ${Object.entries(CATEGORY_CHECKS)
           .map(([key, sql]) => `(${sql}) AS ${key}`)
           .join(', ')}
       FROM product_category c
       LEFT JOIN product_category_i18n i ON i.id_product_category = c.id_product_category
         AND i.product_category_locale = 'id-ID'
       WHERE c.id_master_comp = ? AND c.product_category_deleted_at IS NULL
       ORDER BY products DESC, i.product_category_name`,
      [company],
    );
    const count = (status: string) =>
      rows.filter((row) => row.product_category_status === status).length;
    return sendSuccess(res, 200, 'CATEGORY_INSIGHT_AUDIT', 'Category audit', {
      total: rows.length,
      published: count('published'),
      draft: count('draft'),
      archived: count('archived'),
      products: rows.slice(0, TOP_LIMIT).map((row) => ({
        id: keyhsid.idProductCategory.encode(Number(row.id_product_category)),
        name: row.product_category_name ?? '',
        products: Number(row.products),
        published_products: Number(row.published_products),
      })),
      checks: Object.fromEntries(
        Object.keys(CATEGORY_CHECKS).map((key) => {
          const failing = rows.filter((row) => Number(row[key]) === 1);
          return [
            key,
            {
              count: failing.length,
              first_id: failing[0]
                ? keyhsid.idProductCategory.encode(Number(failing[0].id_product_category))
                : null,
            },
          ];
        }),
      ),
    });
  },
);

export default router;
