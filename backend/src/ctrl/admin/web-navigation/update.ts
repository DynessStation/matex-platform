// Update navigation metadata and change its status.
import express = require('express');
import { Response } from 'express';
import db = require('../../../db');
import keyhsid from '../../../hsid';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { writeAuditLog } from '../../../helper/audit-log.helper';

import { getSessionScope, decodeNavigationId } from './scope';
import { parseJsonValue, normalizeNavigationMetadata } from './metadata';

const { pool } = db;

const router = express.Router();

// Web navigation - update metadata

router.put(
  '/api/v1/web-navigation/:id',
  verifyToken,
  requirePermission('web_navigation.update'),
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

      const metadata = normalizeNavigationMetadata(req.body);

      if (!metadata.success) {
        return sendError(res, 400, metadata.code, metadata.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              web_navigation_key,

              web_navigation_name,

              web_navigation_location,

              web_navigation_default_locale,

              web_navigation_status,

              web_navigation_settings_json

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

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

      const before = navigations[0];

      await connection.query(
        `
          UPDATE web_navigation

          SET
            web_navigation_name = ?,

            web_navigation_location = ?,

            web_navigation_default_locale = ?,

            web_navigation_settings_json = ?,

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?
        `,
        [
          metadata.name,
          metadata.location,
          metadata.defaultLocale,
          metadata.settingsJson,
          scope.idAdminAcct,
          idNavigation,
          scope.idMasterComp,
        ],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation.updated',
        category: 'data_change',
        module: 'web_navigation',
        action: 'update',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation',
        entityId: idNavigation,
        entityLabel: metadata.name,
        before: {
          key: before.web_navigation_key,
          name: before.web_navigation_name,
          location: before.web_navigation_location,
          default_locale: before.web_navigation_default_locale,
          status: Number(before.web_navigation_status),
          settings: parseJsonValue(before.web_navigation_settings_json),
        },
        after: {
          key: before.web_navigation_key,
          name: metadata.name,
          location: metadata.location,
          default_locale: metadata.defaultLocale,
          status: Number(before.web_navigation_status),
          settings: metadata.settings,
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        'WEB_NAVIGATION_UPDATED',
        'Web navigation updated successfully',
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error('[Web Navigation] Failed to update navigation', error);

      return sendError(res, 500, 'WEB_NAVIGATION_UPDATE_FAILED', 'Unable to update web navigation');
    } finally {
      connection?.release();
    }
  },
);

// Web navigation - activate / deactivate

router.patch(
  '/api/v1/web-navigation/:id/status',
  verifyToken,
  requirePermission('web_navigation.publish'),
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

      const status = Number(req.body?.web_navigation_status);

      if (status !== 0 && status !== 1) {
        return sendError(
          res,
          400,
          'WEB_NAVIGATION_STATUS_INVALID',
          'Web navigation status must be 0 or 1',
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
              web_navigation_key,

              web_navigation_name,

              web_navigation_status

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

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
          UPDATE web_navigation

          SET
            web_navigation_status = ?,

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?
        `,
        [status, scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: status === 1 ? 'web_navigation.activated' : 'web_navigation.deactivated',
        category: 'data_change',
        module: 'web_navigation',
        action: status === 1 ? 'publish' : 'unpublish',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation',
        entityId: idNavigation,
        entityLabel: navigation.web_navigation_name,
        before: {
          status: Number(navigation.web_navigation_status),
        },
        after: {
          status,
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        status === 1 ? 'WEB_NAVIGATION_ACTIVATED' : 'WEB_NAVIGATION_DEACTIVATED',
        status === 1
          ? 'Web navigation activated successfully'
          : 'Web navigation deactivated successfully',
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
          status,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error('[Web Navigation] Failed to change navigation status', error);

      return sendError(
        res,
        500,
        'WEB_NAVIGATION_STATUS_UPDATE_FAILED',
        'Unable to change web navigation status',
      );
    } finally {
      connection?.release();
    }
  },
);

export default router;
