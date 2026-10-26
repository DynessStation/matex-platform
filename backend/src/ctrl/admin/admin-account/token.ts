// The admin access token: signed JWT in an httpOnly cookie (login, password change).
import { Response } from 'express';
import jwt from 'jsonwebtoken';

import { accessTokenCookieOptions } from '../../../config/cookie.config';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Signs a token for the account and sets the cookie. A new session lasts JWT_EXPIRES_IN
 * (24h); `expiresAt` (seconds) keeps the end of the current session instead.
 */
export const issueAccessToken = (
  res: Response,
  user: { id_admin_acct: unknown; alias: unknown; id_access: unknown; token_version?: unknown },
  expiresAt?: number,
): jwt.JwtPayload => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) throw new Error('JWT_SECRET is not configured');

  const payload = {
    id_admin_acct: user.id_admin_acct,
    alias: user.alias,
    id_access: user.id_access,
    tv: Number(user.token_version ?? 0),
  };
  const token = expiresAt
    ? jwt.sign({ ...payload, exp: expiresAt }, secretKey)
    : jwt.sign(payload, secretKey, {
        expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '24h',
      });

  const maxAge = expiresAt ? Math.max(0, expiresAt * 1000 - Date.now()) : DAY_MS;
  res.cookie('access_token', token, { ...accessTokenCookieOptions(), maxAge });

  return jwt.decode(token) as jwt.JwtPayload;
};
