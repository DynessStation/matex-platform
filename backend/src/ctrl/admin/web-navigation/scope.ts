// Session scope and navigation id decoding shared by the navigation routes.
import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AuthRequest } from '../../../middleware/auth-jwt.middleware';

const { pool } = db;

export type SessionScopeResult =
  | {
      success: true;
      idAdminAcct: number;
      idMasterComp: number;
    }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

export const getSessionScope = async (req: AuthRequest): Promise<SessionScopeResult> => {
  const idAdminAcct = Number(req.user?.id_admin_acct);

  if (!Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
    return {
      success: false,
      status: 401,
      code: 'AUTH_SESSION_INVALID',
      message: 'Invalid session',
    };
  }

  const [rows] = await pool.query(
    `
      SELECT
        id_admin_acct,
        id_master_comp,
        admin_acct_status

      FROM admin_acct

      WHERE id_admin_acct = ?

      LIMIT 1
    `,
    [idAdminAcct],
  );

  const accounts = rows as any[];

  if (!accounts.length) {
    return {
      success: false,
      status: 401,
      code: 'AUTH_SESSION_INVALID',
      message: 'Invalid session',
    };
  }

  const account = accounts[0];

  if (Number(account.admin_acct_status) !== 1) {
    return {
      success: false,
      status: 403,
      code: 'AUTH_ACCOUNT_INACTIVE',
      message: 'Your account is not active',
    };
  }

  return {
    success: true,
    idAdminAcct: Number(account.id_admin_acct),
    idMasterComp: Number(account.id_master_comp),
  };
};

export const decodeNavigationId = (value: unknown): number | null => {
  const encodedId = String(value ?? '').trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idWebNavigation.decode(encodedId)[0];

  const id = Number(decoded);

  if (!decoded || !Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};
