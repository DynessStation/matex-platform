// Delete (soft delete) a navigation and its menu items.
import express = require('express');
import { RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

import { assertNotPrimary } from './records';

const { pool } = db;

const router = express.Router();

router.delete(
  '/api/v1/web-navigation/:id',
  verifyToken,
  requirePermission('web_navigation.delete'),
  onFailure('WEB_NAVIGATION_DELETE_FAILED', 'Unable to delete web navigation'),
  async (req: AuthRequest, res: Response) => {
    const idNavigation = decodeId(req.params.id, keyhsid.idWebNavigation);
    if (!idNavigation) {
      return sendError(res, 400, 'WEB_NAVIGATION_INVALID_ID', 'Invalid web navigation identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const [rows] = await connection.query(
        `SELECT navigation.web_navigation_key, navigation.web_navigation_name,
           navigation.web_navigation_location, navigation.web_navigation_status,
           COUNT(item.id_web_navigation_item) AS item_count
         FROM web_navigation navigation
         LEFT JOIN web_navigation_item item ON item.id_web_navigation = navigation.id_web_navigation
           AND item.id_master_comp = navigation.id_master_comp
           AND item.web_navigation_item_deleted_at IS NULL
         WHERE navigation.id_web_navigation = ? AND navigation.id_master_comp = ?
           AND navigation.web_navigation_deleted_at IS NULL
         GROUP BY navigation.id_web_navigation, navigation.web_navigation_key,
           navigation.web_navigation_name, navigation.web_navigation_location,
           navigation.web_navigation_status
         LIMIT 1
         FOR UPDATE`,
        [idNavigation, scope.idMasterComp],
      );
      const navigation = (rows as RowDataPacket[])[0];
      if (!navigation) {
        throw new HttpError(404, 'WEB_NAVIGATION_NOT_FOUND', 'Web navigation not found');
      }
      assertNotPrimary(navigation.web_navigation_key, 'delete');

      await connection.query(
        `UPDATE web_navigation_item
         SET web_navigation_item_status = 0, web_navigation_item_deleted_at = NOW(),
           id_updated_by = ?, updated = NOW()
         WHERE id_web_navigation = ? AND id_master_comp = ? AND web_navigation_item_deleted_at IS NULL`,
        [scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );
      await connection.query(
        `UPDATE web_navigation
         SET web_navigation_status = 0, web_navigation_deleted_at = NOW(), id_updated_by = ?,
           updated = NOW()
         WHERE id_web_navigation = ? AND id_master_comp = ?`,
        [scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

      const summary = {
        key: navigation.web_navigation_key,
        name: navigation.web_navigation_name,
        location: navigation.web_navigation_location,
      };
      const itemCount = Number(navigation.item_count ?? 0);
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation.deleted',
        category: 'data_change',
        module: 'web_navigation',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation',
        entityId: idNavigation,
        entityLabel: navigation.web_navigation_name,
        before: {
          ...summary,
          status: Number(navigation.web_navigation_status),
          item_count: itemCount,
          deleted_at: null,
        },
        after: { ...summary, status: 0, item_count: itemCount, deleted_at: 'set' },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'WEB_NAVIGATION_DELETED', 'Web navigation deleted successfully', {
      id: req.params.id,
    });
  },
);

export default router;
