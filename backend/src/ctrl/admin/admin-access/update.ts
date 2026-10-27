// Update an access profile and change its status.
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

import { assertAccessNameUnique, readAccessInput } from './input';
import {
  getAccessPermissionKeys,
  getPermissionDiff,
  getPermissionKeysByIds,
  replaceAccessPermissions,
  resolvePermissionIds,
} from './permissions';

const { pool } = db;

const router = express.Router();

const invalidId = (res: Response) =>
  sendError(res, 400, 'ADMIN_ACCESS_INVALID_ID', 'Invalid admin access identifier');
const accessNotFound = () => new HttpError(404, 'ADMIN_ACCESS_NOT_FOUND', 'Admin access not found');

router.put(
  '/api/v1/admin-access/:id',
  verifyToken,
  requirePermission('admin_access.update'),
  async (req: AuthRequest, res: Response) => {
    const idAccess = decodeId(req.params.id, keyhsid.idAdminAccess);
    if (!idAccess) return invalidId(res);

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const input = readAccessInput(req.body);

    await withTransaction(pool, async (connection) => {
      const [accessRows] = await connection.query(
        `SELECT id_admin_access, access_name, access_description, admin_access_status
         FROM admin_access
         WHERE id_admin_access = ? AND id_master_comp = ? AND admin_access_status IN (0, 1)
         LIMIT 1
         FOR UPDATE`,
        [idAccess, scope.idMasterComp],
      );
      const current = (accessRows as RowDataPacket[])[0];
      if (!current) throw accessNotFound();

      const permissionsBefore = await getAccessPermissionKeys(connection, idAccess);
      await assertAccessNameUnique(connection, scope.idMasterComp, input.name, idAccess);
      const permissionIds = await resolvePermissionIds(connection, input.permissions);
      const permissionsAfter = await getPermissionKeysByIds(connection, permissionIds);

      await connection.query(
        `UPDATE admin_access SET access_name = ?, access_description = ?, updated = NOW()
         WHERE id_admin_access = ? AND id_master_comp = ?`,
        [input.name, input.description, idAccess, scope.idMasterComp],
      );
      await replaceAccessPermissions(connection, idAccess, permissionIds);

      const audit = {
        req,
        connection,
        writeMode: 'strict' as const,
        idMasterComp: scope.idMasterComp,
        category: 'access_control' as const,
        module: 'admin_access',
        actorType: 'admin' as const,
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_access',
        entityId: idAccess,
        entityLabel: input.name,
        httpStatus: 200,
      };
      const accessChanged =
        String(current.access_name) !== input.name ||
        (current.access_description ?? null) !== input.description;
      if (accessChanged) {
        await writeAuditLog({
          ...audit,
          eventCode: 'admin_access.updated',
          action: 'update',
          before: {
            access_name: current.access_name,
            access_description: current.access_description ?? null,
          },
          after: { access_name: input.name, access_description: input.description },
        });
      }
      const diff = getPermissionDiff(permissionsBefore, permissionsAfter);
      if (diff.changed) {
        await writeAuditLog({
          ...audit,
          eventCode: 'admin_access.permissions_changed',
          action: 'permissions_change',
          before: { permissions: permissionsBefore },
          after: { permissions: permissionsAfter },
          metadata: { added_permissions: diff.added, removed_permissions: diff.removed },
        });
      }
    });

    return sendSuccess(res, 200, 'ADMIN_ACCESS_UPDATED', 'Admin access updated successfully', {
      id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
    });
  },
);

router.patch(
  '/api/v1/admin-access/:id/status',
  verifyToken,
  requirePermission('admin_access.update'),
  async (req: AuthRequest, res: Response) => {
    const idAccess = decodeId(req.params.id, keyhsid.idAdminAccess);
    if (!idAccess) return invalidId(res);

    const newStatus = Number(req.body?.admin_access_status);
    if (![0, 1].includes(newStatus)) {
      return sendError(res, 400, 'ADMIN_ACCESS_INVALID_STATUS', 'Invalid admin access status');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const result = await withTransaction(pool, async (connection) => {
      const [accessRows] = await connection.query(
        `SELECT id_admin_access, access_name, admin_access_status
         FROM admin_access
         WHERE id_admin_access = ? AND id_master_comp = ? AND admin_access_status IN (0, 1)
         LIMIT 1
         FOR UPDATE`,
        [idAccess, scope.idMasterComp],
      );
      const access = (accessRows as RowDataPacket[])[0];
      if (!access) throw accessNotFound();

      // Admins without full access cannot lock themselves out by deactivating their own profile.
      if (newStatus === 0 && scope.isAllAccess !== 1 && scope.idAccess === idAccess) {
        throw new HttpError(
          403,
          'ADMIN_ACCESS_SELF_DEACTIVATION_FORBIDDEN',
          'You cannot deactivate your own access profile',
        );
      }
      if (Number(access.admin_access_status) === newStatus) {
        return { unchanged: true, affectedAccounts: 0 };
      }

      const [accountRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM admin_acct
         WHERE id_master_comp = ? AND id_access = ? AND is_all_access != 1 AND admin_acct_status = 1`,
        [scope.idMasterComp, idAccess],
      );
      const affectedAccounts = Number((accountRows as RowDataPacket[])[0]?.total ?? 0);

      await connection.query(
        `UPDATE admin_access SET admin_access_status = ?, updated = NOW()
         WHERE id_admin_access = ? AND id_master_comp = ?`,
        [newStatus, idAccess, scope.idMasterComp],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'admin_access.status_changed',
        category: 'access_control',
        module: 'admin_access',
        action: 'status_change',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_access',
        entityId: idAccess,
        entityLabel: access.access_name,
        before: { admin_access_status: Number(access.admin_access_status) },
        after: { admin_access_status: newStatus },
        metadata: {
          transition: newStatus === 1 ? 'activated' : 'deactivated',
          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
        httpStatus: 200,
      });

      return { unchanged: false, affectedAccounts };
    });

    const id = keyhsid.idAdminAccess.encode(idAccess);
    if (result.unchanged) {
      return sendSuccess(
        res,
        200,
        newStatus === 1 ? 'ADMIN_ACCESS_ALREADY_ACTIVE' : 'ADMIN_ACCESS_ALREADY_INACTIVE',
        newStatus === 1 ? 'Admin access is already active' : 'Admin access is already inactive',
        { id_admin_access: id, admin_access_status: newStatus },
      );
    }
    return sendSuccess(
      res,
      200,
      newStatus === 1 ? 'ADMIN_ACCESS_ACTIVATED' : 'ADMIN_ACCESS_DEACTIVATED',
      newStatus === 1
        ? 'Admin access activated successfully'
        : 'Admin access deactivated successfully',
      {
        id_admin_access: id,
        admin_access_status: newStatus,
        affected_accounts: newStatus === 0 ? result.affectedAccounts : 0,
      },
    );
  },
);

export default router;
