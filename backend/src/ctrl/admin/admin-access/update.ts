// Update an access profile and change its status.
import express = require('express');
import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';

import { getSessionScope, decodeAdminAccessId } from './scope';
import {
  resolvePermissionIds,
  getPermissionKeysByIds,
  getAccessPermissionKeys,
  getPermissionDiff,
} from './permissions';

const { pool } = db;

const router = express.Router();

// Admin access - update

router.put(
  '/api/v1/admin-access/:id',
  verifyToken,
  requirePermission('admin_access.update'),
  async (req: AuthRequest, res) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      const { access_name, access_description, permissions } = req.body;

      // Access ID

      const idAccess = decodeAdminAccessId(id);

      if (!idAccess) {
        return sendError(res, 400, 'ADMIN_ACCESS_INVALID_ID', 'Invalid admin access identifier');
      }

      // Session

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      // Normalize

      const cleanName = typeof access_name === 'string' ? access_name.trim() : '';

      const cleanDescription =
        typeof access_description === 'string' && access_description.trim()
          ? access_description.trim()
          : null;

      if (!cleanName) {
        return sendError(res, 400, 'ADMIN_ACCESS_NAME_REQUIRED', 'Access name is required');
      }

      if (cleanName.length > 255) {
        return sendError(res, 400, 'ADMIN_ACCESS_NAME_TOO_LONG', 'Access name is too long');
      }

      if (cleanDescription && cleanDescription.length > 500) {
        return sendError(
          res,
          400,
          'ADMIN_ACCESS_DESCRIPTION_TOO_LONG',
          'Access description is too long',
        );
      }

      // Transaction

      connection = await pool.getConnection();

      await connection.beginTransaction();

      // Target access

      const [targetRows] = await connection.query(
        `
            SELECT
              id_admin_access,

              access_name,

              access_description,

              admin_access_status

            FROM admin_access

            WHERE id_admin_access = ?
              AND id_master_comp = ?
              AND admin_access_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idAccess, scope.idMasterComp],
      );

      if (!(targetRows as any[]).length) {
        await connection.rollback();

        return sendError(res, 404, 'ADMIN_ACCESS_NOT_FOUND', 'Admin access not found');
      }

      const targetAccess = (targetRows as any[])[0];

      // Audit before permissions

      const beforePermissionKeys = await getAccessPermissionKeys(connection, idAccess);

      // Duplicate name

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_admin_access

            FROM admin_access

            WHERE id_master_comp = ?
              AND LOWER(access_name) =
                LOWER(?)
              AND id_admin_access != ?
              AND admin_access_status IN (0, 1)

            LIMIT 1
          `,
        [scope.idMasterComp, cleanName, idAccess],
      );

      if ((duplicateRows as any[]).length) {
        await connection.rollback();

        return sendError(res, 409, 'ADMIN_ACCESS_NAME_EXISTS', 'Access name is already in use');
      }

      // Resolve permissions

      const permissionResult = await resolvePermissionIds(connection, permissions);

      if (!permissionResult.success) {
        await connection.rollback();

        return sendError(
          res,
          permissionResult.status,
          permissionResult.code,
          permissionResult.message,
        );
      }

      // Audit after permissions

      const afterPermissionKeys = await getPermissionKeysByIds(connection, permissionResult.ids);

      // Update access

      await connection.query(
        `
          UPDATE admin_access

          SET
            access_name = ?,

            access_description = ?,

            updated = NOW()

          WHERE id_admin_access = ?
            AND id_master_comp = ?
        `,
        [cleanName, cleanDescription, idAccess, scope.idMasterComp],
      );

      // Replace permission mapping

      await connection.query(
        `
          DELETE FROM admin_access_permission

          WHERE id_admin_access = ?
        `,
        [idAccess],
      );

      if (permissionResult.ids.length) {
        const valuesSql = permissionResult.ids.map(() => '(?, ?)').join(', ');

        const values = permissionResult.ids.flatMap((idPermission) => [idAccess, idPermission]);

        await connection.query(
          `
            INSERT INTO admin_access_permission
            (
              id_admin_access,

              id_admin_permission
            )
            VALUES
              ${valuesSql}
          `,
          values,
        );
      }

      // Audit access change

      const accessChanged =
        String(targetAccess.access_name) !== cleanName ||
        (targetAccess.access_description ?? null) !== cleanDescription;

      if (accessChanged) {
        await writeAuditLog({
          req,
          connection,
          writeMode: 'strict',
          idMasterComp: scope.idMasterComp,
          eventCode: 'admin_access.updated',
          category: 'access_control',
          module: 'admin_access',
          action: 'update',
          actorType: 'admin',
          actorId: scope.idAdminAcct,
          actorLabel: req.user?.alias ?? null,
          entityType: 'admin_access',
          entityId: idAccess,
          entityLabel: cleanName,
          before: {
            access_name: targetAccess.access_name,
            access_description: targetAccess.access_description ?? null,
          },
          after: {
            access_name: cleanName,
            access_description: cleanDescription,
          },
          httpStatus: 200,
        });
      }

      // Audit permission change

      const permissionDiff = getPermissionDiff(beforePermissionKeys, afterPermissionKeys);

      if (permissionDiff.changed) {
        await writeAuditLog({
          req,
          connection,
          writeMode: 'strict',
          idMasterComp: scope.idMasterComp,
          eventCode: 'admin_access.permissions_changed',
          category: 'access_control',
          module: 'admin_access',
          action: 'permissions_change',
          actorType: 'admin',
          actorId: scope.idAdminAcct,
          actorLabel: req.user?.alias ?? null,
          entityType: 'admin_access',
          entityId: idAccess,
          entityLabel: cleanName,
          before: {
            permissions: beforePermissionKeys,
          },
          after: {
            permissions: afterPermissionKeys,
          },
          metadata: {
            added_permissions: permissionDiff.added,
            removed_permissions: permissionDiff.removed,
          },
          httpStatus: 200,
        });
      }

      // Commit

      await connection.commit();

      return sendSuccess(res, 200, 'ADMIN_ACCESS_UPDATED', 'Admin access updated successfully', {
        id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error('Update admin access error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

// Admin access - update status

router.patch(
  '/api/v1/admin-access/:id/status',
  verifyToken,
  requirePermission('admin_access.update'),
  async (req: AuthRequest, res) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      const { admin_access_status } = req.body;

      // Access ID

      const idAccess = decodeAdminAccessId(id);

      if (!idAccess) {
        return sendError(res, 400, 'ADMIN_ACCESS_INVALID_ID', 'Invalid admin access identifier');
      }

      // Status

      const newStatus = Number(admin_access_status);

      if (![0, 1].includes(newStatus)) {
        return sendError(res, 400, 'ADMIN_ACCESS_INVALID_STATUS', 'Invalid admin access status');
      }

      // Session

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      // Transaction

      connection = await pool.getConnection();

      await connection.beginTransaction();

      // Target

      const [accessRows] = await connection.query(
        `
            SELECT
              id_admin_access,

              access_name,

              admin_access_status

            FROM admin_access

            WHERE id_admin_access = ?
              AND id_master_comp = ?
              AND admin_access_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idAccess, scope.idMasterComp],
      );

      const accesses = accessRows as any[];

      if (!accesses.length) {
        await connection.rollback();

        return sendError(res, 404, 'ADMIN_ACCESS_NOT_FOUND', 'Admin access not found');
      }

      const access = accesses[0];

      // Prevent self role deactivation

      if (newStatus === 0 && scope.isAllAccess !== 1 && scope.idAccess === idAccess) {
        await connection.rollback();

        return sendError(
          res,
          403,
          'ADMIN_ACCESS_SELF_DEACTIVATION_FORBIDDEN',
          'You cannot deactivate your own access profile',
        );
      }

      // Same status

      if (Number(access.admin_access_status) === newStatus) {
        await connection.rollback();

        return sendSuccess(
          res,
          200,
          newStatus === 1 ? 'ADMIN_ACCESS_ALREADY_ACTIVE' : 'ADMIN_ACCESS_ALREADY_INACTIVE',
          newStatus === 1 ? 'Admin access is already active' : 'Admin access is already inactive',
          {
            id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
            admin_access_status: newStatus,
          },
        );
      }

      // Affected normal accounts

      const [accountRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_acct

            WHERE id_master_comp = ?
              AND id_access = ?
              AND is_all_access != 1
              AND admin_acct_status = 1
          `,
        [scope.idMasterComp, idAccess],
      );

      const affectedAccounts = Number((accountRows as any[])[0]?.total ?? 0);

      // Update

      await connection.query(
        `
          UPDATE admin_access

          SET
            admin_access_status = ?,

            updated = NOW()

          WHERE id_admin_access = ?
            AND id_master_comp = ?
        `,
        [newStatus, idAccess, scope.idMasterComp],
      );

      // Audit

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
        before: {
          admin_access_status: Number(access.admin_access_status),
        },
        after: {
          admin_access_status: newStatus,
        },
        metadata: {
          transition: newStatus === 1 ? 'activated' : 'deactivated',
          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
        httpStatus: 200,
      });

      // Commit

      await connection.commit();

      // Response

      return sendSuccess(
        res,
        200,
        newStatus === 1 ? 'ADMIN_ACCESS_ACTIVATED' : 'ADMIN_ACCESS_DEACTIVATED',
        newStatus === 1
          ? 'Admin access activated successfully'
          : 'Admin access deactivated successfully',
        {
          id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
          admin_access_status: newStatus,
          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error('Update admin access status error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

export default router;
