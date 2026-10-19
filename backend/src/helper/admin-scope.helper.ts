import { Pool } from 'mysql2/promise';

import db = require('../db');

import { AuthRequest } from '../middleware/auth-jwt.middleware';

// The signed-in admin's scope: who they are and which company, office, and access profile they
// act in. requirePermission() loads it once per request and stores it on req.adminScope, so
// handlers behind that middleware read it without querying the account again.
export interface AdminScope {
  idAdminAcct: number;
  idMasterComp: number;
  idOffice: number;
  idAccess: number;
  isAllAccess: number;
}

export type AdminScopeResult =
  | ({ success: true } & AdminScope)
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

/**
 * Whether the admin's access profile grants `permissionKey` (full-access admins always pass).
 * Pass the transaction connection as `executor` inside a transaction.
 */
export const adminHasPermission = async (
  scope: AdminScope,
  permissionKey: string,
  executor: Pick<Pool, 'query'> = db.pool,
): Promise<boolean> => {
  if (scope.isAllAccess === 1) return true;
  if (!Number.isInteger(scope.idAccess) || scope.idAccess <= 0) return false;

  const [rows] = await executor.query(
    `SELECT 1
     FROM admin_access_permission aap
     INNER JOIN admin_permission ap ON ap.id_admin_permission = aap.id_admin_permission
     WHERE aap.id_admin_access = ? AND ap.permission_key = ? AND ap.permission_status = 1
     LIMIT 1`,
    [scope.idAccess, permissionKey],
  );
  return (rows as unknown[]).length > 0;
};

export const getAdminScope = async (
  req: AuthRequest,
  pool: Pool = db.pool,
): Promise<AdminScopeResult> => {
  if (req.adminScope) {
    return { success: true, ...req.adminScope };
  }

  // verifyToken() already loaded the account on routes without requirePermission().
  if (req.adminAccount !== undefined) {
    const account = req.adminAccount;
    if (!account || Number(account.admin_acct_status) !== 1) {
      return {
        success: false,
        status: account ? 403 : 401,
        code: account ? 'AUTH_ACCOUNT_INACTIVE' : 'AUTH_SESSION_INVALID',
        message: account ? 'Your account is not active' : 'Invalid session',
      };
    }
    req.adminScope = {
      idAdminAcct: Number(account.id_admin_acct),
      idMasterComp: Number(account.id_master_comp),
      idOffice: Number(account.id_office),
      idAccess: Number(account.id_access),
      isAllAccess: Number(account.is_all_access),
    };
    return { success: true, ...req.adminScope };
  }

  const idAdminAcct = Number(req.user?.id_admin_acct);

  if (!Number.isSafeInteger(idAdminAcct) || idAdminAcct <= 0) {
    return {
      success: false,
      status: 401,
      code: 'AUTH_SESSION_INVALID',
      message: 'Invalid session',
    };
  }

  const [rows] = await pool.query(
    `
      SELECT id_admin_acct, id_master_comp, id_office, id_access, is_all_access, admin_acct_status
      FROM admin_acct
      WHERE id_admin_acct = ?
      LIMIT 1
    `,
    [idAdminAcct],
  );

  const account = (rows as any[])[0];

  if (!account || Number(account.admin_acct_status) !== 1) {
    return {
      success: false,
      status: account ? 403 : 401,
      code: account ? 'AUTH_ACCOUNT_INACTIVE' : 'AUTH_SESSION_INVALID',
      message: account ? 'Your account is not active' : 'Invalid session',
    };
  }

  req.adminScope = {
    idAdminAcct,
    idMasterComp: Number(account.id_master_comp),
    idOffice: Number(account.id_office),
    idAccess: Number(account.id_access),
    isAllAccess: Number(account.is_all_access),
  };

  return { success: true, ...req.adminScope };
};
