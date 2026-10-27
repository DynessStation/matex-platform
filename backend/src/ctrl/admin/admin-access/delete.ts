// Delete (soft delete) an access profile.
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

import { getAccessPermissionKeys, replaceAccessPermissions } from './permissions';

const { pool } = db;

const router = express.Router();

// Only an inactive profile without assigned admins can be deleted. Its permissions are removed;
// the profile row is kept with status 99.
router.delete(
  '/api/v1/admin-access/:id',
  verifyToken,
  requirePermission('admin_access.delete'),
  async (req: AuthRequest, res: Response) => {
    const idAccess = decodeId(req.params.id, keyhsid.idAdminAccess);
    if (!idAccess) {
      return sendError(res, 400, 'ADMIN_ACCESS_INVALID_ID', 'Invalid admin access identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const [accessRows] = await connection.query(
        `SELECT id_admin_access, access_name, access_description, admin_access_status
         FROM admin_access
         WHERE id_admin_access = ? AND id_master_comp = ? AND admin_access_status IN (0, 1)
         LIMIT 1
         FOR UPDATE`,
        [idAccess, scope.idMasterComp],
      );
      const access = (accessRows as RowDataPacket[])[0];
      if (!access) throw new HttpError(404, 'ADMIN_ACCESS_NOT_FOUND', 'Admin access not found');
      if (Number(access.admin_access_status) !== 0) {
        throw new HttpError(
          409,
          'ADMIN_ACCESS_MUST_BE_INACTIVE',
          'Deactivate the admin access before deleting it',
        );
      }

      const [accountRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM admin_acct
         WHERE id_master_comp = ? AND id_access = ? AND admin_acct_status IN (0, 1)`,
        [scope.idMasterComp, idAccess],
      );
      const assignedAccounts = Number((accountRows as RowDataPacket[])[0]?.total ?? 0);
      if (assignedAccounts > 0) {
        throw new HttpError(
          409,
          'ADMIN_ACCESS_HAS_ADMIN_REFERENCES',
          'Admin access is still assigned to one or more admin accounts',
          { assigned_accounts: assignedAccounts },
        );
      }

      const permissions = await getAccessPermissionKeys(connection, idAccess);
      const before = {
        access_name: access.access_name,
        access_description: access.access_description ?? null,
        permissions,
        admin_access_status: Number(access.admin_access_status),
      };

      await replaceAccessPermissions(connection, idAccess, []);
      await connection.query(
        `UPDATE admin_access SET admin_access_status = 99, updated = NOW()
         WHERE id_admin_access = ? AND id_master_comp = ?`,
        [idAccess, scope.idMasterComp],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'admin_access.deleted',
        category: 'access_control',
        module: 'admin_access',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_access',
        entityId: idAccess,
        entityLabel: access.access_name,
        before,
        after: { ...before, permissions: [], admin_access_status: 99 },
        metadata: { delete_type: 'soft_delete', removed_permissions: permissions },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'ADMIN_ACCESS_DELETED', 'Admin access deleted successfully', {
      id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
    });
  },
);

export default router;
