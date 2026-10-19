// Update an admin account and change its status.
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

import { assertAccountReferences, assertAccountUnique, readAccountInput } from './input';
import {
  accountAudit,
  assertAccountInScope,
  assertAnotherFullAccess,
  lockAccount,
} from './records';

const { pool } = db;

const router = express.Router();

const invalidId = (res: Response) =>
  sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_ID', 'Invalid admin account identifier');

router.put(
  '/api/v1/admin-acct/:id',
  verifyToken,
  requirePermission('admin_account.update'),
  async (req: AuthRequest, res: Response) => {
    const idAdminAcct = decodeId(req.params.id, keyhsid.idAdmin);
    if (!idAdminAcct) return invalidId(res);

    const input = readAccountInput(req.body, { withPassword: false });

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const target = await lockAccount(connection, idAdminAcct);
      const before = accountAudit(target);

      assertAccountInScope(target, scope);
      if (Number(target.is_all_access) === 1 && scope.isAllAccess !== 1) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_UPDATE_FORBIDDEN',
          'You are not allowed to update a full-access account',
        );
      }
      if (input.idMasterComp !== scope.idMasterComp) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_MOVE_COMPANY_FORBIDDEN',
          'You cannot move this account outside your company',
        );
      }
      if (scope.isAllAccess !== 1 && input.idOffice !== scope.idOffice) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_MOVE_OFFICE_FORBIDDEN',
          'You cannot move this account outside your assigned office',
        );
      }
      if (input.isAllAccess === 1 && scope.isAllAccess !== 1) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_GRANT_FORBIDDEN',
          'You are not allowed to grant full company access',
        );
      }
      if (Number(target.is_all_access) === 1 && input.isAllAccess === 0) {
        await assertAnotherFullAccess(connection, scope.idMasterComp, idAdminAcct);
      }

      // Without id_profile_photo in the request the current photo stays.
      const resolvedPhoto = await assertAccountReferences(connection, input, scope.isAllAccess);
      const idProfilePhoto =
        input.profilePhoto === undefined ? before.id_profile_photo : resolvedPhoto;
      await assertAccountUnique(connection, input, idAdminAcct);

      await connection.query(
        `UPDATE admin_acct
         SET id_master_comp = ?, id_office = ?, name = ?, alias = ?, email_1 = ?, email_2 = ?,
           phone_1 = ?, phone_2 = ?, id_profile_photo = ?, id_chair = ?, id_access = ?,
           is_all_access = ?, updated = NOW()
         WHERE id_admin_acct = ?`,
        [
          input.idMasterComp,
          input.idOffice,
          input.name,
          input.alias,
          input.email1,
          input.email2,
          input.phone1,
          input.phone2,
          idProfilePhoto,
          input.idChair,
          input.idAccess,
          input.isAllAccess,
          idAdminAcct,
        ],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'admin_account.updated',
        category: 'data_change',
        module: 'admin_account',
        action: 'update',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_account',
        entityId: idAdminAcct,
        entityLabel: input.name,
        before,
        after: {
          id_master_comp: input.idMasterComp,
          id_office: input.idOffice,
          name: input.name,
          alias: input.alias,
          email_1: input.email1,
          email_2: input.email2,
          phone_1: input.phone1,
          phone_2: input.phone2,
          id_profile_photo: idProfilePhoto,
          id_chair: input.idChair,
          id_access: input.idAccess,
          is_all_access: input.isAllAccess,
          admin_acct_status: before.admin_acct_status,
        },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'ADMIN_ACCOUNT_UPDATED', 'Admin account updated successfully', {
      id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
    });
  },
);

router.patch(
  '/api/v1/admin-acct/:id/status',
  verifyToken,
  requirePermission('admin_account.update'),
  async (req: AuthRequest, res: Response) => {
    const newStatus = Number(req.body?.admin_acct_status);
    if (![0, 1].includes(newStatus)) {
      return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_STATUS', 'Invalid account status');
    }

    const idAdminAcct = decodeId(req.params.id, keyhsid.idAdmin);
    if (!idAdminAcct) return invalidId(res);

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const unchanged = await withTransaction(pool, async (connection) => {
      const target = await lockAccount(connection, idAdminAcct);
      assertAccountInScope(target, scope);
      if (idAdminAcct === scope.idAdminAcct && newStatus === 0) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_SELF_DEACTIVATION_FORBIDDEN',
          'You cannot deactivate your own account',
        );
      }
      if (Number(target.is_all_access) === 1 && scope.isAllAccess !== 1) {
        throw new HttpError(
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_STATUS_FORBIDDEN',
          'You are not allowed to change the status of a full-access account',
        );
      }
      if (Number(target.is_all_access) === 1 && newStatus === 0) {
        await assertAnotherFullAccess(connection, scope.idMasterComp, idAdminAcct);
      }
      if (Number(target.admin_acct_status) === newStatus) return true;

      await connection.query(
        'UPDATE admin_acct SET admin_acct_status = ?, updated = NOW() WHERE id_admin_acct = ?',
        [newStatus, idAdminAcct],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'admin_account.status_changed',
        category: 'data_change',
        module: 'admin_account',
        action: 'status_change',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_account',
        entityId: idAdminAcct,
        entityLabel: target.name,
        before: { admin_acct_status: Number(target.admin_acct_status) },
        after: { admin_acct_status: newStatus },
        metadata: { transition: newStatus === 1 ? 'activated' : 'deactivated' },
        httpStatus: 200,
      });

      return false;
    });

    const data = {
      id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
      admin_acct_status: newStatus,
    };
    if (unchanged) {
      return sendSuccess(
        res,
        200,
        newStatus === 1 ? 'ADMIN_ACCOUNT_ALREADY_ACTIVE' : 'ADMIN_ACCOUNT_ALREADY_INACTIVE',
        newStatus === 1 ? 'Admin account is already active' : 'Admin account is already inactive',
        data,
      );
    }
    return sendSuccess(
      res,
      200,
      newStatus === 1 ? 'ADMIN_ACCOUNT_ACTIVATED' : 'ADMIN_ACCOUNT_DEACTIVATED',
      newStatus === 1
        ? 'Admin account activated successfully'
        : 'Admin account deactivated successfully',
      data,
    );
  },
);

export default router;
