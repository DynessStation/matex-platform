// Delete (soft delete) a navigation.
import express = require('express');
import { Response } from 'express';
import db = require('../../../db');
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { writeAuditLog } from '../../../helper/audit-log.helper';

import { getSessionScope, decodeNavigationId } from './scope';

const { pool } = db;

const router = express.Router();

// Web navigation - delete

router.delete(
  '/api/v1/web-navigation/:id',
  verifyToken,
  requirePermission('web_navigation.delete'),
  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          'WEB_NAVIGATION_INVALID_ID',
          'Invalid web navigation identifier',
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              navigation.web_navigation_key,

              navigation.web_navigation_name,

              navigation.web_navigation_location,

              navigation.web_navigation_status,

              COUNT(item.id_web_navigation_item)
                AS item_count

            FROM web_navigation navigation

            LEFT JOIN web_navigation_item item
              ON item.id_web_navigation =
                navigation.id_web_navigation

              AND item.id_master_comp =
                navigation.id_master_comp

              AND item.web_navigation_item_deleted_at
                IS NULL

            WHERE navigation.id_web_navigation = ?

              AND navigation.id_master_comp = ?

              AND navigation.web_navigation_deleted_at
                IS NULL

            GROUP BY
              navigation.id_web_navigation,

              navigation.web_navigation_key,

              navigation.web_navigation_name,

              navigation.web_navigation_location,

              navigation.web_navigation_status

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(res, 404, 'WEB_NAVIGATION_NOT_FOUND', 'Web navigation not found');
      }

      const navigation = navigations[0];

      await connection.query(
        `
          UPDATE web_navigation_item

          SET
            web_navigation_item_status = 0,

            web_navigation_item_deleted_at = NOW(),

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?

            AND web_navigation_item_deleted_at IS NULL
        `,
        [scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

      await connection.query(
        `
          UPDATE web_navigation

          SET
            web_navigation_status = 0,

            web_navigation_deleted_at = NOW(),

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?
        `,
        [scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

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
          key: navigation.web_navigation_key,
          name: navigation.web_navigation_name,
          location: navigation.web_navigation_location,
          status: Number(navigation.web_navigation_status),
          item_count: Number(navigation.item_count ?? 0),
          deleted_at: null,
        },
        after: {
          key: navigation.web_navigation_key,
          name: navigation.web_navigation_name,
          location: navigation.web_navigation_location,
          status: 0,
          item_count: Number(navigation.item_count ?? 0),
          deleted_at: 'set',
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(res, 200, 'WEB_NAVIGATION_DELETED', 'Web navigation deleted successfully');
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error('[Web Navigation] Failed to delete navigation', error);

      return sendError(res, 500, 'WEB_NAVIGATION_DELETE_FAILED', 'Unable to delete web navigation');
    } finally {
      connection?.release();
    }
  },
);

export default router;
