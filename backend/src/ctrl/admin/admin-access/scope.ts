// Session scope and access-profile id decoding shared by the access-profile routes.
import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AuthRequest } from '../../../middleware/auth-jwt.middleware';

const { pool } = db;

export type SessionScopeResult =
  | {
      success: true;
      idAdminAcct: number;
      idMasterComp: number;
      idAccess: number;
      isAllAccess: number;
    }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

// Session scope

export const getSessionScope = async (req: AuthRequest): Promise<SessionScopeResult> => {
  const idAdminAcct = req.user?.id_admin_acct;

  if (!idAdminAcct) {
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
            id_access,
            is_all_access,
            admin_acct_status

          FROM admin_acct

          WHERE id_admin_acct = ?

          LIMIT 1
        `,
    [idAdminAcct],
  );

  const users = rows as any[];

  if (!users.length) {
    return {
      success: false,
      status: 401,
      code: 'AUTH_SESSION_INVALID',
      message: 'Invalid session',
    };
  }

  const user = users[0];

  if (Number(user.admin_acct_status) !== 1) {
    return {
      success: false,
      status: 403,
      code: 'AUTH_ACCOUNT_INACTIVE',
      message: 'Your account is not active',
    };
  }

  return {
    success: true,
    idAdminAcct: Number(user.id_admin_acct),
    idMasterComp: Number(user.id_master_comp),
    idAccess: Number(user.id_access),
    isAllAccess: Number(user.is_all_access),
  };
};

// Decode access ID

export const decodeAdminAccessId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const decoded = keyhsid.idAdminAccess.decode(value.trim())[0];

  const idAccess = Number(decoded);

  if (!decoded || !Number.isInteger(idAccess) || idAccess <= 0) {
    return null;
  }

  return idAccess;
};
