// Update navigation metadata and change its status.
import express = require('express');
import { Response } from 'express';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { decodeId } from '../../../helper/id.helper';
import { parseJsonValue } from '../../../helper/json.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

import { readNavigationMetadata } from './input';
import { lockNavigation } from './records';

const { pool } = db;

const router = express.Router();

const invalidId = (res: Response) =>
  sendError(res, 400, 'WEB_NAVIGATION_INVALID_ID', 'Invalid web navigation identifier');

router.put(
  '/api/v1/web-navigation/:id',
  verifyToken,
  requirePermission('web_navigation.update'),
  onFailure('WEB_NAVIGATION_UPDATE_FAILED', 'Unable to update web navigation'),
  async (req: AuthRequest, res: Response) => {
    const idNavigation = decodeId(req.params.id, keyhsid.idWebNavigation);
    if (!idNavigation) return invalidId(res);

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const metadata = readNavigationMetadata(req.body);

    await withTransaction(pool, async (connection) => {
      const before = await lockNavigation(
        connection,
        idNavigation,
        scope.idMasterComp,
        `web_navigation_key, web_navigation_name, web_navigation_location,
         web_navigation_default_locale, web_navigation_status, web_navigation_settings_json`,
      );

      await connection.query(
        `UPDATE web_navigation
         SET web_navigation_name = ?, web_navigation_location = ?, web_navigation_default_locale = ?,
           web_navigation_settings_json = ?, id_updated_by = ?, updated = NOW()
         WHERE id_web_navigation = ? AND id_master_comp = ?`,
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
    });

    return sendSuccess(res, 200, 'WEB_NAVIGATION_UPDATED', 'Web navigation updated successfully', {
      id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
    });
  },
);

router.patch(
  '/api/v1/web-navigation/:id/status',
  verifyToken,
  requirePermission('web_navigation.publish'),
  onFailure('WEB_NAVIGATION_STATUS_UPDATE_FAILED', 'Unable to change web navigation status'),
  async (req: AuthRequest, res: Response) => {
    const idNavigation = decodeId(req.params.id, keyhsid.idWebNavigation);
    if (!idNavigation) return invalidId(res);

    const status = Number(req.body?.web_navigation_status);
    if (status !== 0 && status !== 1) {
      return sendError(
        res,
        400,
        'WEB_NAVIGATION_STATUS_INVALID',
        'Web navigation status must be 0 or 1',
      );
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const navigation = await lockNavigation(
        connection,
        idNavigation,
        scope.idMasterComp,
        'web_navigation_key, web_navigation_name, web_navigation_status',
      );

      await connection.query(
        `UPDATE web_navigation SET web_navigation_status = ?, id_updated_by = ?, updated = NOW()
         WHERE id_web_navigation = ? AND id_master_comp = ?`,
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
        before: { status: Number(navigation.web_navigation_status) },
        after: { status },
        httpStatus: 200,
      });
    });

    return sendSuccess(
      res,
      200,
      status === 1 ? 'WEB_NAVIGATION_ACTIVATED' : 'WEB_NAVIGATION_DEACTIVATED',
      status === 1
        ? 'Web navigation activated successfully'
        : 'Web navigation deactivated successfully',
      { id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation), status },
    );
  },
);

export default router;
