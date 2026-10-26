// Products at the front of the public catalog, under /api/v1/products/front. They hold positions
// 1..n (at most FRONT_MAX) in product_sort_order; every other product has 0 and the catalog
// shows those newest first (ctrl/public/product.ts).
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../../helper/attachment.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { lockGroup, readOrderIds, SortGroup, writeOrder } from '../../../helper/sort-order.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

const { pool } = db;

const router = express.Router();

export const FRONT_MAX = 12;

/** Live products at the front of the catalog. */
export const frontGroup = (idMasterComp: number): SortGroup => ({
  table: 'product_catalog',
  id: 'id_product',
  column: 'product_sort_order',
  where: 'id_master_comp = ? AND product_deleted_at IS NULL AND product_sort_order > 0',
  params: [idMasterComp],
});

export const frontFull = () =>
  new HttpError(
    409,
    'PRODUCT_FRONT_FULL',
    `At most ${FRONT_MAX} products can be shown at the front of the catalog`,
    { max: FRONT_MAX },
  );

router.get(
  '/api/v1/products/front',
  verifyToken,
  requirePermission('product.view'),
  onFailure('PRODUCT_FRONT_LOAD_FAILED', 'Unable to load the catalog front'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_product, p.product_sku, p.product_status, i.product_name,
         (SELECT a.storage_path FROM product_catalog_attachment pa
          JOIN attachment a ON a.id_attachment = pa.id_attachment
          WHERE pa.id_product = p.id_product AND pa.product_attachment_role = 'thumbnail'
          ORDER BY pa.product_attachment_sort_order LIMIT 1) AS thumbnail_path
       FROM product_catalog p
       LEFT JOIN product_catalog_i18n i ON i.id_product = p.id_product
         AND i.product_locale = 'id-ID'
       WHERE p.id_master_comp = ? AND p.product_deleted_at IS NULL AND p.product_sort_order > 0
       ORDER BY p.product_sort_order, p.id_product`,
      [scope.idMasterComp],
    );
    return sendSuccess(res, 200, 'PRODUCT_FRONT_FOUND', 'Catalog front loaded', {
      max: FRONT_MAX,
      data: rows.map((row, index) => ({
        id: keyhsid.idProduct.encode(Number(row.id_product)),
        key: row.product_sku,
        label: row.product_name ?? row.product_sku,
        status: row.product_status,
        thumbnail_url: row.thumbnail_path ? buildAttachmentUrl(row.thumbnail_path) : null,
        position: index + 1,
      })),
    });
  },
);

// `ids` is the whole front, first = position 1; products left out go back to "newest first".
router.put(
  '/api/v1/products/front',
  verifyToken,
  requirePermission('product.update'),
  onFailure('PRODUCT_FRONT_FAILED', 'Unable to save the catalog front'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    if (Array.isArray(req.body?.ids) && req.body.ids.length > FRONT_MAX) throw frontFull();
    const ids = readOrderIds(req.body?.ids, keyhsid.idProduct, 'PRODUCT_FRONT', FRONT_MAX);

    await withTransaction(pool, async (connection) => {
      if (ids.length) {
        const [found] = await connection.query<RowDataPacket[]>(
          `SELECT id_product FROM product_catalog
           WHERE id_master_comp = ? AND product_deleted_at IS NULL
             AND id_product IN (${ids.map(() => '?').join(',')})
           FOR UPDATE`,
          [scope.idMasterComp, ...ids],
        );
        if (found.length !== ids.length) {
          throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'One or more products were not found');
        }
      }
      const group = frontGroup(scope.idMasterComp);
      const current = (await lockGroup(connection, group)).map((row) => row.id);
      const removed = current.filter((id) => !ids.includes(id));
      if (removed.length) {
        await connection.query(
          `UPDATE product_catalog SET product_sort_order = 0
           WHERE id_master_comp = ? AND id_product IN (${removed.map(() => '?').join(',')})`,
          [scope.idMasterComp, ...removed],
        );
      }
      await writeOrder(connection, group, ids);
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'product.front_reordered',
        category: 'data_change',
        module: 'product',
        action: 'reorder',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'product',
        before: { ids: current },
        after: { ids },
        metadata: { item_count: ids.length, removed: removed.length },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'PRODUCT_FRONT_SAVED', 'Catalog front saved', {
      item_count: ids.length,
    });
  },
);

export default router;
