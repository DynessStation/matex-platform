// Delete (soft delete) an admin account.
import express = require("express");
import keyhsid from "../../../hsid";
import db = require("../../../db");

import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";

const { pool } = db;

const router = express.Router();

//==================================================
//==== ADMIN ACCOUNT - DELETE
//==================================================

router.delete(
  "/api/v1/admin-acct/:id",

  verifyToken,

  requirePermission("admin_account.delete"),

  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const sessionAdminId = req.user?.id_admin_acct;

      //==================================================
      //==== SESSION
      //==================================================

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== TARGET ID
      //==================================================

      const decodedAdminAcct = keyhsid.idAdmin.decode(String(id))[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (
        !decodedAdminAcct ||
        !Number.isInteger(idAdminAcct) ||
        idAdminAcct <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_INVALID_ID",
          "Invalid admin account identifier",
        );
      }

      //==================================================
      //==== GET SESSION
      //==================================================

      const [sessionRows] = await pool.query(
        `
            SELECT
              id_admin_acct,
              id_master_comp,
              id_office,
              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [sessionAdminId],
      );

      const sessionUsers = sessionRows as any[];

      if (!sessionUsers.length) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const sessionUser = sessionUsers[0];

      if (Number(sessionUser.admin_acct_status) !== 1) {
        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      const sessionCompany = Number(sessionUser.id_master_comp);

      const sessionOffice = Number(sessionUser.id_office);

      const sessionAllAccess = Number(sessionUser.is_all_access);

      //==================================================
      //==== GET TARGET
      //==================================================

      const [targetRows] = await pool.query(
        `
            SELECT
              id_admin_acct,

              id_master_comp,
              id_office,

              name,
              alias,

              email_1,
              email_2,

              phone_1,
              phone_2,

              id_profile_photo,

              id_chair,
              id_access,

              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?
              AND admin_acct_status IN (0, 1)

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const targetUsers = targetRows as any[];

      if (!targetUsers.length) {
        return sendError(
          res,
          404,
          "ADMIN_ACCOUNT_NOT_FOUND",
          "Admin account not found",
        );
      }

      const targetUser = targetUsers[0];

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        id_master_comp: Number(targetUser.id_master_comp),

        id_office: Number(targetUser.id_office),

        name: targetUser.name,

        alias: targetUser.alias,

        email_1: targetUser.email_1,

        email_2: targetUser.email_2,

        phone_1: targetUser.phone_1,

        phone_2: targetUser.phone_2,

        id_profile_photo: targetUser.id_profile_photo
          ? Number(targetUser.id_profile_photo)
          : null,

        id_chair: Number(targetUser.id_chair),

        id_access: Number(targetUser.id_access),

        is_all_access: Number(targetUser.is_all_access),

        admin_acct_status: Number(targetUser.admin_acct_status),
      };

      //==================================================
      //==== PREVENT SELF DELETE
      //==================================================

      if (idAdminAcct === sessionAdminId) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_SELF_DELETE_FORBIDDEN",
          "You cannot delete your own account",
        );
      }

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (Number(targetUser.id_master_comp) !== sessionCompany) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company account",
        );
      }

      //==================================================
      //==== OFFICE SCOPE
      //==================================================

      if (
        sessionAllAccess !== 1 &&
        Number(targetUser.id_office) !== sessionOffice
      ) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN",
          "You do not have access to this office account",
        );
      }

      //==================================================
      //==== PROTECT FULL ACCESS
      //==================================================

      if (Number(targetUser.is_all_access) === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_FULL_ACCESS_DELETE_FORBIDDEN",
          "You are not allowed to delete a full-access account",
        );
      }

      //==================================================
      //==== MUST BE INACTIVE
      //==================================================

      if (Number(targetUser.admin_acct_status) !== 0) {
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_MUST_BE_INACTIVE",
          "Deactivate the admin account before deleting it",
        );
      }

      //==================================================
      //==== SOFT DELETE
      //==================================================

      await pool.query(
        `
            UPDATE admin_acct

            SET
              admin_acct_status = 99,
              updated = NOW()

            WHERE id_admin_acct = ?
          `,
        [idAdminAcct],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        idMasterComp: sessionCompany,

        eventCode: "admin_account.deleted",

        category: "data_change",

        module: "admin_account",

        action: "delete",

        actorType: "admin",

        actorId: sessionAdminId,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_account",

        entityId: idAdminAcct,

        entityLabel: targetUser.name,

        before: auditBefore,

        after: {
          ...auditBefore,

          admin_acct_status: 99,
        },

        metadata: {
          delete_type: "soft_delete",
        },

        httpStatus: 200,
      });

      return sendSuccess(
        res,
        200,
        "ADMIN_ACCOUNT_DELETED",
        "Admin account deleted successfully",
        {
          id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
        },
      );
    } catch (error) {
      console.error("Delete admin account error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

export default router;
