import { Pool } from "mysql2/promise";

import { AuthRequest } from "../ctrl/middleware/authJwt";

export type AdminScopeResult =
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

export const getAdminScope = async (
  req: AuthRequest,
  pool: Pool,
): Promise<AdminScopeResult> => {
  const idAdminAcct = Number(req.user?.id_admin_acct);

  if (!Number.isSafeInteger(idAdminAcct) || idAdminAcct <= 0) {
    return {
      success: false,
      status: 401,
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }

  const [rows] = await pool.query(
    `
      SELECT id_admin_acct, id_master_comp, admin_acct_status
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
      code: account ? "AUTH_ACCOUNT_INACTIVE" : "AUTH_SESSION_INVALID",
      message: account ? "Your account is not active" : "Invalid session",
    };
  }

  return {
    success: true,
    idAdminAcct,
    idMasterComp: Number(account.id_master_comp),
  };
};
