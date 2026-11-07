// Product update and status change.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { decodeId } from '../../../helper/id.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { PRODUCT_DUPLICATE, PRODUCT_STATUSES } from './input';
import { changeProduct, productNotFound, saveProduct } from './records';

const { pool } = db;

const router = express.Router();

router.put(
  '/api/v1/products/:id',
  verifyToken,
  requirePermission('product.update'),
  onFailure('PRODUCT_SAVE_FAILED', 'Unable to save product', { duplicate: PRODUCT_DUPLICATE }),
  (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idProduct);
    return id ? saveProduct(req, res, id) : productNotFound(res);
  },
);

router.patch(
  '/api/v1/products/:id/status',
  verifyToken,
  requirePermission('product.update'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idProduct);
    const status = String(req.body?.status ?? '');
    if (!id || !PRODUCT_STATUSES.has(status)) {
      return sendError(res, 400, 'PRODUCT_STATUS_INVALID', 'Invalid product status');
    }
    // A draft may still have no price; it cannot go public without one if it displays its price.
    if (status === 'published') {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT p.product_price_visibility AS visibility,
                COUNT(DISTINCT CASE
                  WHEN price.product_price_type = 'end_user' AND price.product_price_is_public = 1
                   AND price.product_price_is_active = 1
                  THEN price.product_price_currency END) AS currencies
         FROM product_catalog p
         LEFT JOIN product_catalog_price price
           ON price.id_product = p.id_product AND price.id_master_comp = p.id_master_comp
         WHERE p.id_product = ? AND p.id_master_comp = ? AND p.product_deleted_at IS NULL
         GROUP BY p.id_product, p.product_price_visibility`,
        [id, scope.idMasterComp],
      );
      if (rows[0]?.visibility === 'displayed' && Number(rows[0].currencies) < 2) {
        return sendError(res, 400, 'PRODUCT_PRICE_REQUIRED', 'Public prices are required');
      }
    }

    const found = await changeProduct(id, scope.idMasterComp, async (connection, product) => {
      await connection.query(
        `UPDATE product_catalog SET product_status = ?, id_updated_by = ?
         WHERE id_product = ? AND id_master_comp = ? AND product_deleted_at IS NULL`,
        [status, scope.idAdminAcct, id, scope.idMasterComp],
      );
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'product.status_updated',
        category: 'data_change',
        module: 'product',
        action: 'update_status',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'product',
        entityId: id,
        entityLabel: product.product_sku,
        before: { status: product.product_status },
        after: { status },
        httpStatus: 200,
      });
    });
    return found
      ? sendSuccess(res, 200, 'PRODUCT_STATUS_UPDATED', 'Product status updated', null)
      : productNotFound(res);
  },
);

export default router;
