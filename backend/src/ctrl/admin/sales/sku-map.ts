// The channel's SKUs of a store and the product of ours behind each. Rows appear on import;
// the team points each at a product once, and every order already imported follows.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { sendError, sendList, sendSuccess } from '../../../helper/api-response.helper';
import { productEntityWhere } from '../../../helper/business.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { auditSales, scopeOf, storeOf, storeWhere } from './shared';

const router = express.Router();
const { pool } = db;

const MAP_SELECT = `SELECT m.id_store_sku_map, m.id_store, s.store_name, m.store_sku_map_ref,
    m.store_sku_map_seller_sku, m.store_sku_map_product_name, m.store_sku_map_variation,
    m.id_product, i.product_name, p.product_sku,
    (SELECT COALESCE(SUM(l.sales_order_line_qty), 0) FROM sales_order_line l
     INNER JOIN sales_order o ON o.id_sales_order = l.id_sales_order
     WHERE o.id_store = m.id_store AND l.sales_order_line_sku_ref = m.store_sku_map_ref) AS sold_qty
  FROM store_sku_map m
  INNER JOIN store s ON s.id_store = m.id_store
  LEFT JOIN product_catalog p ON p.id_product = m.id_product
  LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = 'id-ID'`;

const mapDto = (row: RowDataPacket) => ({
  id: keyhsid.idStoreSkuMap.encode(row.id_store_sku_map),
  store_id: keyhsid.idStore.encode(row.id_store),
  store_name: row.store_name,
  ref: row.store_sku_map_ref,
  seller_sku: row.store_sku_map_seller_sku,
  name: row.store_sku_map_product_name,
  variation: row.store_sku_map_variation,
  product_id: row.id_product ? keyhsid.idProduct.encode(Number(row.id_product)) : null,
  product_name: row.product_name ?? null,
  product_sku: row.product_sku ?? null,
  sold_qty: Number(row.sold_qty),
});

/** ?store=, ?unmapped=1 for the ones still without a product. */
router.get(
  '/api/v1/sales/sku-map',
  verifyToken,
  requirePermission('sales.view'),
  onFailure('SALES_SKU_MAP_FAILED', 'Unable to load the SKU map'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const store = await storeOf(pool, scope, req.query.store, false);
    const visible = storeWhere(scope);
    const unmapped = req.query.unmapped === '1';
    const [rows] = await pool.query<RowDataPacket[]>(
      `${MAP_SELECT}
       WHERE m.id_master_comp = ? ${visible.sql} ${store ? 'AND m.id_store = ?' : ''}
         ${unmapped ? 'AND m.id_product IS NULL' : ''}
       ORDER BY (m.id_product IS NULL) DESC, s.store_name, m.store_sku_map_product_name, m.store_sku_map_variation`,
      [scope.idMasterComp, ...visible.params, ...(store ? [store.id_store] : [])],
    );
    const data = rows.map(mapDto);
    return sendList(res, 'SALES_SKU_MAP_FOUND', 'SKU map loaded', data, { total: data.length });
  },
);

/** Products the account may map to: id, name, SKU. */
router.get(
  '/api/v1/sales/products',
  verifyToken,
  requirePermission('sales.view'),
  onFailure('SALES_PRODUCTS_FAILED', 'Unable to load the products'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const visible = productEntityWhere(scope, 'p.');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_product, p.product_sku, p.product_status, i.product_name
       FROM product_catalog p
       LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product AND i.product_locale = 'id-ID'
       WHERE p.id_master_comp = ? AND p.product_deleted_at IS NULL ${visible.sql}
       ORDER BY i.product_name, p.product_sku LIMIT 1000`,
      [scope.idMasterComp, ...visible.params],
    );
    const data = rows.map((row) => ({
      id: keyhsid.idProduct.encode(Number(row.id_product)),
      name: row.product_name ?? row.product_sku ?? '',
      sku: row.product_sku,
      status: row.product_status,
    }));
    return sendList(res, 'SALES_PRODUCTS_FOUND', 'Products loaded', data, { total: data.length });
  },
);

/** Point a channel SKU at a product (product_id), or clear it (null). */
router.put(
  '/api/v1/sales/sku-map/:id',
  verifyToken,
  requirePermission('sales.import'),
  onFailure('SALES_SKU_MAP_SAVE_FAILED', 'Unable to save the SKU map'),
  async (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idStoreSkuMap);
    if (!id) return sendError(res, 400, 'SALES_SKU_MAP_INVALID_ID', 'Invalid SKU map identifier');
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const raw = req.body?.product_id;
    const idProduct = raw == null || raw === '' ? null : decodeId(raw, keyhsid.idProduct);
    if (raw != null && raw !== '' && !idProduct) {
      return sendError(res, 400, 'SALES_PRODUCT_INVALID', 'Check the product');
    }
    await withTransaction(pool, async (connection) => {
      const visible = storeWhere(scope);
      const [rows] = await connection.query<RowDataPacket[]>(
        `${MAP_SELECT} WHERE m.id_store_sku_map = ? AND m.id_master_comp = ? ${visible.sql} LIMIT 1 FOR UPDATE`,
        [id, scope.idMasterComp, ...visible.params],
      );
      const current = rows[0];
      if (!current) throw new HttpError(404, 'SALES_SKU_MAP_NOT_FOUND', 'SKU not found');
      if (idProduct) {
        const product = productEntityWhere(scope, 'p.');
        const [found] = await connection.query<RowDataPacket[]>(
          `SELECT 1 FROM product_catalog p WHERE p.id_product = ? AND p.id_master_comp = ?
             AND p.product_deleted_at IS NULL ${product.sql} LIMIT 1`,
          [idProduct, scope.idMasterComp, ...product.params],
        );
        if (!found.length) throw new HttpError(400, 'SALES_PRODUCT_INVALID', 'Check the product');
      }
      await connection.query(
        'UPDATE store_sku_map SET id_product = ?, updated = NOW() WHERE id_store_sku_map = ?',
        [idProduct, id],
      );
      await auditSales(req, connection, scope, {
        eventCode: 'sales.sku_mapped',
        action: 'update',
        entityType: 'store_sku_map',
        entityId: id,
        entityLabel: `${current.store_name}: ${current.store_sku_map_ref}`,
        before: { product_id: current.id_product ?? null },
        after: { product_id: idProduct },
      });
    });
    return sendSuccess(res, 200, 'SALES_SKU_MAPPED', 'SKU map saved', {
      id: keyhsid.idStoreSkuMap.encode(id),
    });
  },
);

export default router;
