// Product list and detail.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { isPublicContentLocale } from '../../../config/public-content.config';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import { decodeId } from '../../../helper/id.helper';
import { trimTo } from '../../../helper/input.helper';
import { countOf, pageMeta, parseListQuery, sortColumn } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { FRONT_MAX } from './front';
import { BASE_SELECT, hydrate, productNotFound } from './records';

const { pool } = db;

const router = express.Router();

const SORTABLE: Record<string, string> = {
  name: 'i.product_name',
  sku: 'p.product_sku',
};

const SEARCH = `(? = '' OR p.product_key LIKE ? OR p.product_sku LIKE ? OR i.product_name LIKE ?)`;

// Optional category filter (D-6): products in that category, matched exactly.
const IN_CATEGORY = `(? IS NULL OR EXISTS (SELECT 1 FROM product_catalog_category pc
  WHERE pc.id_product = p.id_product AND pc.id_product_category = ?))`;

router.get(
  '/api/v1/products',
  verifyToken,
  requirePermission('product.view'),
  onFailure('PRODUCT_LIST_FAILED', 'Unable to load products'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const locale = isPublicContentLocale(req.query.locale) ? String(req.query.locale) : 'id-ID';
    const search = trimTo(req.query.search, 200);
    const like = `%${search}%`;
    const { page, limit, offset, sort, direction: requested } = parseListQuery(req.query);
    const categoryParam = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const idCategory = categoryParam ? decodeId(categoryParam, keyhsid.idProductCategory) : null;
    if (categoryParam && !idCategory) {
      return sendError(res, 400, 'PRODUCT_LIST_CATEGORY_INVALID', 'Invalid category filter');
    }
    const sortField = sortColumn(SORTABLE, sort, '');
    const direction = requested ?? 'ASC';
    const orderBy = sortField
      ? `${sortField} ${direction}, p.id_product ASC`
      : // The front of the catalog in its order first, then the rest by name.
        'p.product_sort_order = 0, p.product_sort_order, i.product_name ASC';

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT p.id_product) AS total
       FROM product_catalog p
       LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = ?
       WHERE p.id_master_comp = ? AND p.product_deleted_at IS NULL AND ${SEARCH} AND ${IN_CATEGORY}`,
      [locale, scope.idMasterComp, search, like, like, like, idCategory, idCategory],
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `${BASE_SELECT}
       WHERE p.id_master_comp = ? AND p.product_deleted_at IS NULL AND ${SEARCH} AND ${IN_CATEGORY}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [locale, scope.idMasterComp, search, like, like, like, idCategory, idCategory, limit, offset],
    );

    const totalAll = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM product_catalog
       WHERE id_master_comp = ? AND product_deleted_at IS NULL`,
      [scope.idMasterComp],
    );
    return sendList(
      res,
      'PRODUCTS_LISTED',
      'Products loaded',
      await hydrate(rows, scope.idMasterComp, locale),
      pageMeta({ page, limit }, Number(countRows[0]?.total ?? 0), totalAll),
    );
  },
);

// The detail carries the names in `translations`; category names are Indonesian.
router.get(
  '/api/v1/products/:id',
  verifyToken,
  requirePermission('product.view'),
  onFailure('PRODUCT_LOAD_FAILED', 'Unable to load product'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idProduct);
    if (!id) return productNotFound(res);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_catalog
       WHERE id_product = ? AND id_master_comp = ? AND product_deleted_at IS NULL`,
      [id, scope.idMasterComp],
    );
    if (!rows.length) return productNotFound(res);
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT product_locale locale, product_slug slug, product_name name,
         product_short_description short_description, product_description description,
         product_specifications_json specifications, product_meta_title meta_title,
         product_meta_description meta_description, product_canonical_url canonical_url,
         product_og_title og_title, product_og_description og_description,
         product_i18n_status status
       FROM product_catalog_i18n WHERE id_product = ? AND id_master_comp = ?
       ORDER BY product_locale`,
      [id, scope.idMasterComp],
    );
    const [product] = await hydrate(rows, scope.idMasterComp, 'id-ID');
    // Positions at the front are 1..n, so the sort order is the place ("Posisi 2 dari 5").
    const front_total = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM product_catalog
       WHERE id_master_comp = ? AND product_deleted_at IS NULL AND product_sort_order > 0`,
      [scope.idMasterComp],
    );

    return sendSuccess(res, 200, 'PRODUCT_FOUND', 'Product loaded', {
      ...product,
      front_total,
      front_max: FRONT_MAX,
      translations,
    });
  },
);

export default router;
