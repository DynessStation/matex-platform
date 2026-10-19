// Session scope, permission lookup, and office id decoding shared by the office routes.
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { AuthRequest } from "../../../middleware/auth-jwt.middleware";

const { pool } = db;

export type SessionScopeResult =
  | {
      success: true;

      idAdminAcct: number;

      idMasterComp: number;

      idOffice: number;

      idAccess: number;

      isAllAccess: number;
    }
  | {
      success: false;

      status: number;

      code: string;

      message: string;
    };

//==================================================
//==== SESSION SCOPE
//==================================================

export const getSessionScope = async (
  req: AuthRequest,
): Promise<SessionScopeResult> => {
  const idAdminAcct = req.user?.id_admin_acct;

  if (!idAdminAcct) {
    return {
      success: false,
      status: 401,
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }

  const [rows] = await pool.query(
    `
    SELECT
      id_admin_acct,
      id_master_comp,
      id_office,
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
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }

  const user = users[0];

  if (Number(user.admin_acct_status) !== 1) {
    return {
      success: false,

      status: 403,
      code: "AUTH_ACCOUNT_INACTIVE",
      message: "Your account is not active",
    };
  }

  return {
    success: true,

    idAdminAcct: Number(user.id_admin_acct),

    idMasterComp: Number(user.id_master_comp),

    idOffice: Number(user.id_office),

    idAccess: Number(user.id_access),

    isAllAccess: Number(user.is_all_access),
  };
};

//==================================================
//==== SESSION HAS PERMISSION
//==================================================

export const sessionHasPermission = async (
  executor: any,

  scope: Extract<SessionScopeResult, { success: true }>,

  permissionKey: string,
): Promise<boolean> => {
  //==================================================
  //==== FULL ACCESS
  //==================================================

  if (scope.isAllAccess === 1) {
    return true;
  }

  //==================================================
  //==== ACCESS PROFILE
  //==================================================

  if (!Number.isInteger(scope.idAccess) || scope.idAccess <= 0) {
    return false;
  }

  //==================================================
  //==== PERMISSION
  //==================================================

  const [rows] = await executor.query(
    `
      SELECT
        1

      FROM admin_access_permission aap

      INNER JOIN admin_permission ap
        ON ap.id_admin_permission =
          aap.id_admin_permission

      WHERE aap.id_admin_access = ?

        AND ap.permission_key = ?

        AND ap.permission_status = 1

      LIMIT 1
    `,
    [scope.idAccess, permissionKey],
  );

  return (rows as any[]).length > 0;
};

//==================================================
//==== DECODE OFFICE
//==================================================

export const decodeOfficeId = (value: unknown): number | null => {
  const encoded = String(value ?? "").trim();

  if (!encoded) {
    return null;
  }

  const decoded = keyhsid.idOffice.decode(encoded)[0];

  const idOffice = Number(decoded);

  if (!decoded || !Number.isInteger(idOffice) || idOffice <= 0) {
    return null;
  }

  return idOffice;
};
