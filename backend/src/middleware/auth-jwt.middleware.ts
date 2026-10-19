import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import db = require('../db');
import { sendError } from '../helper/api-response.helper';
import { writeAuditLog } from '../helper/audit-log.helper';

import type { AdminScope } from '../helper/admin-scope.helper';

export interface AuthUser extends jwt.JwtPayload {
  id_admin_acct?: number;
  alias?: string;
  id_access?: number;
  /** The account's token_version when the token was issued (missing on older tokens: 0). */
  tv?: number;
  issued_at?: number | null;
  expires_at?: number | null;
}

/** The signed-in account and its access profile, loaded once by verifyToken(). */
export interface AuthAccount {
  id_admin_acct: number;
  alias: string | null;
  id_master_comp: number;
  id_office: number;
  id_access: number;
  is_all_access: number;
  admin_acct_status: number;
  token_version: number;
  access_master_comp: number;
  access_name: string | null;
  admin_access_status: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  /** The account row, or null when it no longer exists; requirePermission() checks it. */
  adminAccount?: AuthAccount | null;
  /** Set by requirePermission() or getAdminScope(); see helper/admin-scope.helper.ts. */
  adminScope?: AdminScope;
}

export const ACCOUNT_ACCESS_QUERY = `SELECT aa.id_admin_acct, aa.alias, aa.id_master_comp,
    aa.id_office, aa.id_access, aa.is_all_access, aa.admin_acct_status, aa.token_version,
    ac.id_master_comp AS access_master_comp, ac.access_name, ac.admin_access_status
  FROM admin_acct aa
  INNER JOIN admin_access ac ON aa.id_access = ac.id_admin_access
  WHERE aa.id_admin_acct = ?
  LIMIT 1`;

/**
 * Verifies the access token cookie and loads the account once for the rest of the request.
 * A token whose version no longer matches the account was revoked by a logout.
 */
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.cookies?.access_token;
  if (!token) {
    sendError(res, 401, 'AUTH_TOKEN_REQUIRED', 'Authentication token is required');
    return;
  }

  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    console.error('JWT_SECRET is not configured');
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    return;
  }

  let decoded: AuthUser;
  try {
    decoded = jwt.verify(token, secretKey) as AuthUser;
  } catch {
    // Expired or tampered tokens are normal failures: no audit entry.
    sendError(res, 401, 'AUTH_TOKEN_INVALID_OR_EXPIRED', 'Invalid or expired token');
    return;
  }

  const idAdminAcct = Number(decoded.id_admin_acct);
  if (!Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
    await writeAuditLog({
      req,
      writeMode: 'best_effort',
      eventCode: 'auth.session.invalid',
      category: 'security',
      module: 'auth',
      action: 'session',
      actorType: 'admin',
      actorId: null,
      actorLabel: decoded.alias ?? null,
      entityType: 'admin_account',
      entityId: null,
      entityLabel: decoded.alias ?? null,
      outcome: 'denied',
      metadata: { reason: 'invalid_token_identity' },
      httpStatus: 401,
    });
    sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
    return;
  }

  const [rows] = await db.pool.query(ACCOUNT_ACCESS_QUERY, [idAdminAcct]);
  const account = ((rows as AuthAccount[])[0] ?? null) as AuthAccount | null;
  if (account && Number(account.token_version ?? 0) !== Number(decoded.tv ?? 0)) {
    sendError(res, 401, 'AUTH_TOKEN_INVALID_OR_EXPIRED', 'Invalid or expired token');
    return;
  }

  req.user = {
    ...decoded,
    id_admin_acct: idAdminAcct,
    issued_at: decoded.iat ? decoded.iat * 1000 : null,
    expires_at: decoded.exp ? decoded.exp * 1000 : null,
  };
  req.adminAccount = account;

  next();
};
