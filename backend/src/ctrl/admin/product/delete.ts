// Product delete: soft delete (archived); the product keeps its slugs reserved.
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
import { changeProduct, productNotFound } from './records';

const { pool } = db;

const router = express.Router();

router.delete(
  '/api/v1/products/:id',
  verifyToken,
  requirePermission('product.delete'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idProduct);
    if (!id) return productNotFound(res);

    const found = await changeProduct(id, scope.idMasterComp, async (connection, product) => {
      await connection.query(
        `UPDATE product_catalog
         SET product_status = 'archived', product_deleted_at = NOW(), id_updated_by = ?
         WHERE id_product = ? AND id_master_comp = ? AND product_deleted_at IS NULL`,
        [scope.idAdminAcct, id, scope.idMasterComp],
      );
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'product.deleted',
        category: 'data_change',
        module: 'product',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'product',
        entityId: id,
        entityLabel: product.product_sku,
        before: { status: product.product_status },
        after: { deleted: true },
        httpStatus: 200,
      });
    });
    return found
      ? sendSuccess(res, 200, 'PRODUCT_DELETED', 'Product archived', null)
      : productNotFound(res);
  },
);

export default router;
