// Product list and detail.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { isPublicContentLocale } from '../../../config/public-content.config';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { decodeId } from '../../../helper/id.helper';
import { trimTo } from '../../../helper/input.helper';
import { sortColumn, countOf } from '../../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
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
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const paginate = Math.min(100, Math.max(1, Math.floor(Number(req.query.paginate) || 15)));
    const offset = (page - 1) * paginate;
    const categoryParam = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const idCategory = categoryParam ? decodeId(categoryParam, keyhsid.idProductCategory) : null;
    if (categoryParam && !idCategory) {
      return sendError(res, 400, 'PRODUCT_LIST_CATEGORY_INVALID', 'Invalid category filter');
    }
    const sortField = sortColumn(SORTABLE, req.query.field, '');
    const direction = req.query.sort === 'desc' ? 'DESC' : 'ASC';
    const orderBy = sortField
      ? `${sortField} ${direction}, p.id_product ASC`
      : 'p.product_sort_order ASC, i.product_name ASC';

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
      [
        locale,
        scope.idMasterComp,
        search,
        like,
        like,
        like,
        idCategory,
        idCategory,
        paginate,
        offset,
      ],
    );

    return sendSuccess(res, 200, 'PRODUCTS_LISTED', 'Products loaded', {
      data: await hydrate(rows, scope.idMasterComp, locale),
      total: Number(countRows[0]?.total ?? 0),
      total_all: await countOf(
        pool,
        `SELECT COUNT(*) AS total FROM product_catalog
         WHERE id_master_comp = ? AND product_deleted_at IS NULL`,
        [scope.idMasterComp],
      ),
      current_page: page,
      per_page: paginate,
    });
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

    return sendSuccess(res, 200, 'PRODUCT_FOUND', 'Product loaded', { ...product, translations });
  },
);

export default router;
