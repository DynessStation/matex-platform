import { RowDataPacket } from 'mysql2/promise';
import { NextFunction, Response } from 'express';

import db = require('../db');

import { sendError } from '../helper/api-response.helper';

import { writeAuditLog } from '../helper/audit-log.helper';

import type { AdminScope } from '../helper/admin-scope.helper';

import { ACCOUNT_ACCESS_QUERY, AuthRequest } from './auth-jwt.middleware';

// Database

const { pool } = db;

// Require permission

export const requirePermission =
  (permissionKey: string) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Session

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        // Audit invalid session

        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          eventCode: 'auth.session.invalid',
          category: 'security',
          module: 'auth',
          action: 'authorize',
          actorType: 'admin',
          actorId: null,
          actorLabel: req.user?.alias ?? null,
          entityType: 'admin_account',
          entityId: null,
          entityLabel: req.user?.alias ?? null,
          outcome: 'denied',
          metadata: {
            reason: 'missing_admin_identity',
            permission_key: permissionKey,
          },
          httpStatus: 401,
        });

        sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');

        return;
      }

      // Current account + access, already loaded by verifyToken() on normal routes.

      const accounts =
        req.adminAccount !== undefined
          ? req.adminAccount
            ? [req.adminAccount]
            : []
          : ((await pool.query(ACCOUNT_ACCESS_QUERY, [idAdminAcct]))[0] as RowDataPacket[]);

      // Account not found

      if (!accounts.length) {
        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          eventCode: 'auth.session.invalid',
          category: 'security',
          module: 'auth',
          action: 'authorize',
          actorType: 'admin',
          actorId: idAdminAcct,
          actorLabel: req.user?.alias ?? null,
          entityType: 'admin_account',
          entityId: idAdminAcct,
          entityLabel: req.user?.alias ?? null,
          outcome: 'denied',
          metadata: {
            reason: 'account_not_found',
            permission_key: permissionKey,
          },
          httpStatus: 401,
        });

        sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');

        return;
      }

      const account = accounts[0];

      const idMasterComp = Number(account.id_master_comp);

      const idAccess = Number(account.id_access);

      const actorAlias = account.alias ?? req.user?.alias ?? null;

      // Account status

      if (Number(account.admin_acct_status) !== 1) {
        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          idMasterComp,
          eventCode: 'auth.account.inactive',
          category: 'security',
          module: 'auth',
          action: 'authorize',
          actorType: 'admin',
          actorId: idAdminAcct,
          actorLabel: actorAlias,
          entityType: 'admin_account',
          entityId: idAdminAcct,
          entityLabel: actorAlias,
          outcome: 'denied',
          metadata: {
            reason: 'account_inactive',
            permission_key: permissionKey,
          },
          httpStatus: 403,
        });

        sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');

        return;
      }

      // Access company consistency

      if (Number(account.access_master_comp) !== idMasterComp) {
        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          idMasterComp,
          eventCode: 'auth.access_company_mismatch',
          category: 'security',
          module: 'auth',
          action: 'authorize',
          actorType: 'admin',
          actorId: idAdminAcct,
          actorLabel: actorAlias,
          entityType: 'admin_access',
          entityId: idAccess,
          entityLabel: account.access_name ?? null,
          outcome: 'denied',
          metadata: {
            reason: 'access_company_mismatch',
            permission_key: permissionKey,
            account_master_comp: idMasterComp,
            access_master_comp: Number(account.access_master_comp),
          },
          httpStatus: 403,
        });

        sendError(
          res,
          403,
          'AUTH_ACCESS_COMPANY_MISMATCH',
          'Access profile does not belong to your company',
        );

        return;
      }

      // Handlers read the scope from req instead of querying the account again.

      const scope: AdminScope = {
        idAdminAcct: Number(idAdminAcct),
        idMasterComp,
        idOffice: Number(account.id_office),
        idAccess,
        isAllAccess: Number(account.is_all_access),
      };

      // Full company access

      if (scope.isAllAccess === 1) {
        req.adminScope = scope;
        next();

        return;
      }

      // Access profile status

      if (Number(account.admin_access_status) !== 1) {
        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          idMasterComp,
          eventCode: 'auth.access_profile.inactive',
          category: 'access_control',
          module: 'auth',
          action: 'authorize',
          actorType: 'admin',
          actorId: idAdminAcct,
          actorLabel: actorAlias,
          entityType: 'admin_access',
          entityId: idAccess,
          entityLabel: account.access_name ?? null,
          outcome: 'denied',
          metadata: {
            reason: 'access_profile_inactive',
            permission_key: permissionKey,
            id_access: idAccess,
          },
          httpStatus: 403,
        });

        sendError(res, 403, 'AUTH_ACCESS_PROFILE_INACTIVE', 'Your access profile is not active');

        return;
      }

      // Permission

      const [permissionRows] = await pool.query(
        `
            SELECT
              ap.id_admin_permission

            FROM admin_access_permission aap

            INNER JOIN admin_permission ap
              ON aap.id_admin_permission =
                ap.id_admin_permission

            WHERE aap.id_admin_access = ?
              AND ap.permission_key = ?
              AND ap.permission_status = 1

            LIMIT 1
          `,
        [idAccess, permissionKey],
      );

      const permissions = permissionRows as RowDataPacket[];

      // Permission denied

      if (!permissions.length) {
        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          idMasterComp,
          eventCode: 'auth.permission.denied',
          category: 'access_control',
          module: 'auth',
          action: 'authorize',
          actorType: 'admin',
          actorId: idAdminAcct,
          actorLabel: actorAlias,
          entityType: 'admin_access',
          entityId: idAccess,
          entityLabel: account.access_name ?? null,
          outcome: 'denied',
          metadata: {
            reason: 'permission_missing',
            permission_key: permissionKey,
            id_access: idAccess,
          },
          httpStatus: 403,
        });

        sendError(
          res,
          403,
          'AUTH_PERMISSION_DENIED',
          'You do not have permission to perform this action',
        );

        return;
      }

      // Allowed

      req.adminScope = scope;
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);

      sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  };
