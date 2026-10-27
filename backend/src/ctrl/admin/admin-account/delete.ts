// Delete (soft delete) an admin account.
import express = require('express');
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

import { accountAudit, assertAccountInScope, lockAccount } from './records';

const { pool } = db;

const router = express.Router();

// Only an inactive account other than your own can be deleted; the row is kept with a deletion time.
router.delete(
  '/api/v1/admin-acct/:id',
  verifyToken,
  requirePermission('admin_account.delete'),
  async (req: AuthRequest, res: Response) => {
    const idAdminAcct = decodeId(req.params.id, keyhsid.idAdmin);
    if (!idAdminAcct) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_ID', 'Invalid admin account identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const target = await lockAccount(connection, idAdminAcct);
      const before = accountAudit(target);

      if (idAdminAcct === scope.idAdminAcct) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_SELF_DELETE_FORBIDDEN',
          'You cannot delete your own account',
        );
      }
      assertAccountInScope(target, scope);
      if (Number(target.is_all_access) === 1 && scope.isAllAccess !== 1) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_DELETE_FORBIDDEN',
          'You are not allowed to delete a full-access account',
        );
      }
      if (Number(target.admin_acct_status) !== 0) {
        throw new HttpError(
          409,
          'ADMIN_ACCOUNT_MUST_BE_INACTIVE',
          'Deactivate the admin account before deleting it',
        );
      }

      await connection.query(
        `UPDATE admin_acct SET admin_acct_status = 0, admin_acct_deleted_at = NOW(), updated = NOW()
         WHERE id_admin_acct = ?`,
        [idAdminAcct],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'admin_account.deleted',
        category: 'data_change',
        module: 'admin_account',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_account',
        entityId: idAdminAcct,
        entityLabel: target.name,
        before,
        after: { ...before, admin_acct_status: 0, deleted_at: 'set' },
        metadata: { delete_type: 'soft_delete' },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'ADMIN_ACCOUNT_DELETED', 'Admin account deleted successfully', {
      id: keyhsid.idAdmin.encode(idAdminAcct),
    });
  },
);

export default router;
