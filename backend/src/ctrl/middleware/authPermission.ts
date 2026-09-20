import { NextFunction, Response } from "express";

import db = require("../../db");

import { sendError } from "../../helper/api-response.helper";

import { writeAuditLog } from "../../helper/audit-log.helper";

import { AuthRequest } from "./authJwt";

//==================================================
//==== DATABASE
//==================================================

const { pool } = db;

//==================================================
//==== REQUIRE PERMISSION
//==================================================

export const requirePermission =
  (permissionKey: string) =>
  async (
    req: AuthRequest,

    res: Response,

    next: NextFunction,
  ): Promise<void> => {
    try {
      //==================================================
      //==== SESSION
      //==================================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        //==================================================
        //==== AUDIT INVALID SESSION
        //==================================================

        await writeAuditLog({
          req,

          writeMode: "best_effort",

          eventCode: "auth.session.invalid",

          category: "security",

          module: "auth",

          action: "authorize",

          actorType: "admin",

          actorId: null,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_account",

          entityId: null,

          entityLabel: req.user?.alias ?? null,

          outcome: "denied",

          metadata: {
            reason: "missing_admin_identity",

            permission_key: permissionKey,
          },

          httpStatus: 401,
        });

        sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");

        return;
      }

      //==================================================
      //==== CURRENT ACCOUNT + ACCESS
      //==================================================

      const [accountRows] = await pool.query(
        `
            SELECT
              aa.id_admin_acct,

              aa.alias,

              aa.id_master_comp,
              aa.id_access,

              aa.is_all_access,
              aa.admin_acct_status,

              ac.id_master_comp
                AS access_master_comp,

              ac.access_name,
              ac.admin_access_status

            FROM admin_acct aa

            INNER JOIN admin_access ac
              ON aa.id_access =
                ac.id_admin_access

            WHERE aa.id_admin_acct = ?

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const accounts = accountRows as any[];

      //==================================================
      //==== ACCOUNT NOT FOUND
      //==================================================

      if (!accounts.length) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          eventCode: "auth.session.invalid",

          category: "security",

          module: "auth",

          action: "authorize",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_account",

          entityId: idAdminAcct,

          entityLabel: req.user?.alias ?? null,

          outcome: "denied",

          metadata: {
            reason: "account_not_found",

            permission_key: permissionKey,
          },

          httpStatus: 401,
        });

        sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");

        return;
      }

      const account = accounts[0];

      const idMasterComp = Number(account.id_master_comp);

      const idAccess = Number(account.id_access);

      const actorAlias = account.alias ?? req.user?.alias ?? null;

      //==================================================
      //==== ACCOUNT STATUS
      //==================================================

      if (Number(account.admin_acct_status) !== 1) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.account.inactive",

          category: "security",

          module: "auth",

          action: "authorize",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_account",

          entityId: idAdminAcct,

          entityLabel: actorAlias,

          outcome: "denied",

          metadata: {
            reason: "account_inactive",

            permission_key: permissionKey,
          },

          httpStatus: 403,
        });

        sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );

        return;
      }

      //==================================================
      //==== ACCESS COMPANY CONSISTENCY
      //==================================================

      if (Number(account.access_master_comp) !== idMasterComp) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.access_company_mismatch",

          category: "security",

          module: "auth",

          action: "authorize",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_access",

          entityId: idAccess,

          entityLabel: account.access_name ?? null,

          outcome: "denied",

          metadata: {
            reason: "access_company_mismatch",

            permission_key: permissionKey,

            account_master_comp: idMasterComp,

            access_master_comp: Number(account.access_master_comp),
          },

          httpStatus: 403,
        });

        sendError(
          res,
          403,
          "AUTH_ACCESS_COMPANY_MISMATCH",
          "Access profile does not belong to your company",
        );

        return;
      }

      //==================================================
      //==== FULL COMPANY ACCESS
      //==================================================

      if (Number(account.is_all_access) === 1) {
        next();

        return;
      }

      //==================================================
      //==== ACCESS PROFILE STATUS
      //==================================================

      if (Number(account.admin_access_status) !== 1) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.access_profile.inactive",

          category: "access_control",

          module: "auth",

          action: "authorize",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_access",

          entityId: idAccess,

          entityLabel: account.access_name ?? null,

          outcome: "denied",

          metadata: {
            reason: "access_profile_inactive",

            permission_key: permissionKey,

            id_access: idAccess,
          },

          httpStatus: 403,
        });

        sendError(
          res,
          403,
          "AUTH_ACCESS_PROFILE_INACTIVE",
          "Your access profile is not active",
        );

        return;
      }

      //==================================================
      //==== PERMISSION
      //==================================================

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

      const permissions = permissionRows as any[];

      //==================================================
      //==== PERMISSION DENIED
      //==================================================

      if (!permissions.length) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.permission.denied",

          category: "access_control",

          module: "auth",

          action: "authorize",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_access",

          entityId: idAccess,

          entityLabel: account.access_name ?? null,

          outcome: "denied",

          metadata: {
            reason: "permission_missing",

            permission_key: permissionKey,

            id_access: idAccess,
          },

          httpStatus: 403,
        });

        sendError(
          res,
          403,
          "AUTH_PERMISSION_DENIED",
          "You do not have permission to perform this action",
        );

        return;
      }

      //==================================================
      //==== ALLOWED
      //==================================================

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);

      sendError(res, 500, "INTERNAL_SERVER_ERROR", "Internal Server Error");
    }
  };
