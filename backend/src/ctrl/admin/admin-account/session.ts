// Admin session: login, logout, and the current session (/me).
import express = require('express');
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';

import db = require('../../../db');
import { accessTokenCookieOptions } from '../../../config/cookie.config';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';

import {
  AccountRow,
  readPermissionKeys,
  SESSION_ACCOUNT_SELECT,
  sessionAccountDto,
} from './records';
import { issueAccessToken } from './token';

const { pool } = db;

const router = express.Router();

/** Identity for logs without exposing it: "ad***@example.com" or "***1234". */
const maskLoginIdentity = (value: unknown): string | null => {
  const clean = String(value ?? '').trim();
  if (!clean) return null;
  if (clean.includes('@')) {
    const [local, domain] = clean.split('@');
    return domain ? `${local.slice(0, 2)}***@${domain}` : '***';
  }
  return clean.length <= 4 ? '***' : `***${clean.slice(-4)}`;
};

const securityAudit = (req: Request, user: AccountRow, extra: Record<string, unknown>) =>
  writeAuditLog({
    req,
    writeMode: 'best_effort',
    idMasterComp: Number(user.id_master_comp),
    category: 'security',
    module: 'auth',
    actorType: 'admin',
    actorId: Number(user.id_admin_acct),
    actorLabel: user.alias ?? null,
    entityType: 'admin_account',
    entityId: Number(user.id_admin_acct),
    entityLabel: user.alias ?? null,
    ...extra,
  } as Parameters<typeof writeAuditLog>[0]);

router.post('/api/v1/admin-acct/login', multer().none(), async (req: Request, res: Response) => {
  const { identity, password } = req.body;
  if (!identity || !password) {
    return sendError(
      res,
      400,
      'AUTH_LOGIN_FIELDS_REQUIRED',
      'Email/Phone and password are required',
    );
  }

  const [rows] = await pool.query(
    `${SESSION_ACCOUNT_SELECT} WHERE (aa.email_1 = ? OR aa.phone_1 = ?) LIMIT 1`,
    [identity, identity],
  );
  const user = (rows as AccountRow[])[0];
  const invalidCredentials = () =>
    sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email/phone or password');

  if (!user) {
    await writeAuditLog({
      req,
      writeMode: 'best_effort',
      eventCode: 'auth.login.failed',
      category: 'security',
      module: 'auth',
      action: 'login',
      actorType: 'admin',
      actorId: null,
      actorLabel: null,
      entityType: 'admin_account',
      entityId: null,
      entityLabel: maskLoginIdentity(identity),
      outcome: 'failure',
      metadata: { reason: 'account_not_found', identity_hint: maskLoginIdentity(identity) },
      httpStatus: 401,
    });
    return invalidCredentials();
  }

  if (!(await bcrypt.compare(password, user.password))) {
    await securityAudit(req, user, {
      eventCode: 'auth.login.failed',
      action: 'login',
      outcome: 'failure',
      metadata: { reason: 'password_mismatch', identity_hint: maskLoginIdentity(identity) },
      httpStatus: 401,
    });
    return invalidCredentials();
  }

  if (Number(user.admin_acct_status) !== 1) {
    await securityAudit(req, user, {
      eventCode: 'auth.login.denied',
      action: 'login',
      outcome: 'denied',
      metadata: { reason: 'account_inactive' },
      httpStatus: 403,
    });
    return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
  }

  if (Number(user.is_all_access) !== 1 && Number(user.admin_access_status) !== 1) {
    await securityAudit(req, user, {
      eventCode: 'auth.login.denied',
      action: 'login',
      outcome: 'denied',
      metadata: { reason: 'access_profile_inactive', id_access: Number(user.id_access) },
      httpStatus: 403,
    });
    return sendError(res, 403, 'AUTH_ACCESS_PROFILE_INACTIVE', 'Your access profile is not active');
  }

  const permissions = await readPermissionKeys(user.id_access);

  const decoded = issueAccessToken(res, user);

  await securityAudit(req, user, {
    eventCode: 'auth.login.succeeded',
    action: 'login',
    outcome: 'success',
    metadata: {
      id_office: Number(user.id_office),
      id_access: Number(user.id_access),
      is_all_access: Number(user.is_all_access),
    },
    httpStatus: 200,
  });

  return res.status(200).json({
    success: true,
    code: 'AUTH_LOGIN_SUCCESS',
    message: 'Login successful',
    session: {
      issued_at: decoded.iat ? decoded.iat * 1000 : null,
      expires_at: decoded.exp ? decoded.exp * 1000 : null,
    },
    data: sessionAccountDto(user, permissions),
  });
});

// Logout always succeeds and clears the cookie. A valid token also revokes every token of the
// account (audit SEC-003) and adds the audit entry.
router.post('/api/v1/admin-acct/logout', async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.access_token;
  let logoutUser: jwt.JwtPayload | null = null;
  if (token && process.env.JWT_SECRET) {
    try {
      logoutUser = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    } catch {
      // Invalid or expired token: still log out.
    }
  }

  res.clearCookie('access_token', accessTokenCookieOptions());

  const idAdminAcct = Number(logoutUser?.id_admin_acct);
  if (Number.isInteger(idAdminAcct) && idAdminAcct > 0) {
    try {
      // A token that was already revoked matches no row, so it cannot end newer sessions.
      await pool.query(
        'UPDATE admin_acct SET token_version = token_version + 1 WHERE id_admin_acct = ? AND token_version = ?',
        [idAdminAcct, Number(logoutUser?.tv ?? 0)],
      );
      const [rows] = await pool.query(
        'SELECT id_admin_acct, id_master_comp, alias FROM admin_acct WHERE id_admin_acct = ? LIMIT 1',
        [idAdminAcct],
      );
      const user = (rows as AccountRow[])[0];
      if (user) {
        await writeAuditLog({
          req,
          writeMode: 'best_effort',
          idMasterComp: Number(user.id_master_comp),
          eventCode: 'auth.logout',
          category: 'security',
          module: 'auth',
          action: 'logout',
          actorType: 'admin',
          actorId: idAdminAcct,
          actorLabel: user.alias ?? logoutUser?.alias ?? null,
          entityType: 'admin_account',
          entityId: idAdminAcct,
          entityLabel: user.alias ?? null,
          outcome: 'success',
          httpStatus: 200,
        });
      }
    } catch (error) {
      console.error('Logout audit error:', error);
    }
  }

  return sendSuccess(res, 200, 'AUTH_LOGOUT_SUCCESS', 'Logout successful');
});

router.get('/api/v1/admin-acct/me', verifyToken, async (req: AuthRequest, res: Response) => {
  const idAdminAcct = req.user?.id_admin_acct;
  const sessionDenied = (entityId: number | null, reason: string) =>
    writeAuditLog({
      req,
      writeMode: 'best_effort',
      eventCode: 'auth.session.invalid',
      category: 'security',
      module: 'auth',
      action: 'session',
      actorType: 'admin',
      actorId: entityId,
      actorLabel: req.user?.alias ?? null,
      entityType: 'admin_account',
      entityId,
      entityLabel: req.user?.alias ?? null,
      outcome: 'denied',
      metadata: { reason },
      httpStatus: 401,
    });

  if (!idAdminAcct) {
    await sessionDenied(null, 'missing_admin_identity');
    return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
  }

  const [rows] = await pool.query(`${SESSION_ACCOUNT_SELECT} WHERE aa.id_admin_acct = ? LIMIT 1`, [
    idAdminAcct,
  ]);
  const user = (rows as AccountRow[])[0];
  if (!user) {
    await sessionDenied(idAdminAcct, 'account_not_found');
    return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
  }

  const idMasterComp = Number(user.id_master_comp);
  const actorAlias = user.alias ?? req.user?.alias ?? null;
  const accessAudit = (extra: Record<string, unknown>) =>
    writeAuditLog({
      req,
      writeMode: 'best_effort',
      idMasterComp,
      module: 'auth',
      action: 'session',
      actorType: 'admin',
      actorId: idAdminAcct,
      actorLabel: actorAlias,
      outcome: 'denied',
      httpStatus: 403,
      ...extra,
    } as Parameters<typeof writeAuditLog>[0]);

  if (Number(user.admin_acct_status) !== 1) {
    await accessAudit({
      eventCode: 'auth.account.inactive',
      category: 'security',
      entityType: 'admin_account',
      entityId: idAdminAcct,
      entityLabel: actorAlias,
      metadata: { reason: 'account_inactive' },
    });
    return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
  }

  if (Number(user.access_master_comp) !== idMasterComp) {
    await accessAudit({
      eventCode: 'auth.access_company_mismatch',
      category: 'security',
      entityType: 'admin_access',
      entityId: Number(user.id_access),
      entityLabel: user.access_name ?? null,
      metadata: {
        reason: 'access_company_mismatch',
        account_master_comp: idMasterComp,
        access_master_comp: Number(user.access_master_comp),
        id_access: Number(user.id_access),
      },
    });
    return sendError(
      res,
      403,
      'AUTH_ACCESS_COMPANY_MISMATCH',
      'Access profile does not belong to your company',
    );
  }

  if (Number(user.is_all_access) !== 1 && Number(user.admin_access_status) !== 1) {
    await accessAudit({
      eventCode: 'auth.access_profile.inactive',
      category: 'access_control',
      entityType: 'admin_access',
      entityId: Number(user.id_access),
      entityLabel: user.access_name ?? null,
      metadata: { reason: 'access_profile_inactive', id_access: Number(user.id_access) },
    });
    return sendError(res, 403, 'AUTH_ACCESS_PROFILE_INACTIVE', 'Your access profile is not active');
  }

  return res.status(200).json({
    success: true,
    code: 'AUTH_AUTHENTICATED',
    message: 'Authenticated',
    session: {
      issued_at: req.user?.issued_at ?? null,
      expires_at: req.user?.expires_at ?? null,
    },
    data: sessionAccountDto(user, await readPermissionKeys(user.id_access)),
  });
});

export default router;
