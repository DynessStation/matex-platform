// Product update and status change.
import express = require('express');
import { Response } from 'express';

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
