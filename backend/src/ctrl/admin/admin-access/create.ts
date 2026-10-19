// Create an access profile.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';

import { assertAccessNameUnique, readAccessInput } from './input';
import {
  getPermissionKeysByIds,
  replaceAccessPermissions,
  resolvePermissionIds,
} from './permissions';

const { pool } = db;

const router = express.Router();

router.post(
  '/api/v1/admin-access',
  verifyToken,
  requirePermission('admin_access.create'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const input = readAccessInput(req.body);

    const idAccess = await withTransaction(pool, async (connection) => {
      await assertAccessNameUnique(connection, scope.idMasterComp, input.name);
      const permissionIds = await resolvePermissionIds(connection, input.permissions);

      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO admin_access
           (id_master_comp, access_name, access_description, access_var, admin_access_status,
            created, updated)
         VALUES (?, ?, ?, NULL, 1, NOW(), NOW())`,
        [scope.idMasterComp, input.name, input.description],
      );
      const id = Number(insert.insertId);
      await replaceAccessPermissions(connection, id, permissionIds);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'admin_access.created',
        category: 'access_control',
        module: 'admin_access',
        action: 'create',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_access',
        entityId: id,
        entityLabel: input.name,
        after: {
          access_name: input.name,
          access_description: input.description,
          permissions: await getPermissionKeysByIds(connection, permissionIds),
          admin_access_status: 1,
        },
        httpStatus: 201,
      });

      return id;
    });

    return sendSuccess(res, 201, 'ADMIN_ACCESS_CREATED', 'Admin access created successfully', {
      id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
    });
  },
);

export default router;
