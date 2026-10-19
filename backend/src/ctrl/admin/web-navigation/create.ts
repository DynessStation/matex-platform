// Create a navigation.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';

import { readNavigationKey, readNavigationMetadata } from './input';

const { pool } = db;

const router = express.Router();

const KEY_EXISTS = {
  code: 'WEB_NAVIGATION_KEY_EXISTS',
  message: 'Web navigation key is already in use',
};

router.post(
  '/api/v1/web-navigation',
  verifyToken,
  requirePermission('web_navigation.create'),
  onFailure('WEB_NAVIGATION_CREATE_FAILED', 'Unable to create web navigation', {
    duplicate: KEY_EXISTS,
  }),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const key = readNavigationKey(req.body?.web_navigation_key);
    const metadata = readNavigationMetadata(req.body);

    const idNavigation = await withTransaction(pool, async (connection) => {
      // Deleted navigations keep their key, so it stays reserved.
      const [existing] = await connection.query(
        `SELECT id_web_navigation FROM web_navigation
         WHERE id_master_comp = ? AND web_navigation_key = ?
         LIMIT 1
         FOR UPDATE`,
        [scope.idMasterComp, key],
      );
      if ((existing as unknown[]).length)
        throw new HttpError(409, KEY_EXISTS.code, KEY_EXISTS.message);

      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO web_navigation
           (id_master_comp, web_navigation_key, web_navigation_name, web_navigation_location,
            web_navigation_default_locale, web_navigation_status, web_navigation_settings_json,
            id_created_by, id_updated_by, created, updated)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())`,
        [
          scope.idMasterComp,
          key,
          metadata.name,
          metadata.location,
          metadata.defaultLocale,
          metadata.settingsJson,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      const id = Number(insert.insertId);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'web_navigation.created',
        category: 'data_change',
        module: 'web_navigation',
        action: 'create',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'web_navigation',
        entityId: id,
        entityLabel: metadata.name,
        after: {
          key,
          name: metadata.name,
          location: metadata.location,
          default_locale: metadata.defaultLocale,
          status: 0,
          settings: metadata.settings,
        },
        httpStatus: 201,
      });

      return id;
    });

    return sendSuccess(res, 201, 'WEB_NAVIGATION_CREATED', 'Web navigation created successfully', {
      id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
    });
  },
);

export default router;
