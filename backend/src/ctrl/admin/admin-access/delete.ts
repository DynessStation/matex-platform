// Delete (soft delete) an access profile.
import express = require("express");
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";

import { getSessionScope, decodeAdminAccessId } from "./scope";
import { getAccessPermissionKeys } from "./permissions";

const { pool } = db;

const router = express.Router();

//==================================================
//==== ADMIN ACCESS - DELETE
//==================================================

router.delete(
  "/api/v1/admin-access/:id",

  verifyToken,

  requirePermission("admin_access.delete"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      //==================================================
      //==== ACCESS ID
      //==================================================

      const idAccess = decodeAdminAccessId(id);

      if (!idAccess) {
        return sendError(
          res,
          400,
          "ADMIN_ACCESS_INVALID_ID",
          "Invalid admin access identifier",
        );
      }

      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== TARGET
      //==================================================

      const [accessRows] = await connection.query(
        `
            SELECT
              id_admin_access,

              access_name,

              access_description,

              admin_access_status

            FROM admin_access

            WHERE id_admin_access = ?
              AND id_master_comp = ?
              AND admin_access_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idAccess, scope.idMasterComp],
      );

      const accesses = accessRows as any[];

      if (!accesses.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ADMIN_ACCESS_NOT_FOUND",
          "Admin access not found",
        );
      }

      const access = accesses[0];

      //==================================================
      //==== MUST BE INACTIVE
      //==================================================

      if (Number(access.admin_access_status) !== 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ADMIN_ACCESS_MUST_BE_INACTIVE",
          "Deactivate the admin access before deleting it",
        );
      }

      //==================================================
      //==== ACCOUNT REFERENCES
      //==================================================

      const [referenceRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_acct

            WHERE id_master_comp = ?
              AND id_access = ?
              AND admin_acct_status IN (0, 1)
          `,
        [scope.idMasterComp, idAccess],
      );

      const references = Number((referenceRows as any[])[0]?.total ?? 0);

      if (references > 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ADMIN_ACCESS_HAS_ADMIN_REFERENCES",
          "Admin access is still assigned to one or more admin accounts",
          {
            assigned_accounts: references,
          },
        );
      }

      //==================================================
      //==== AUDIT BEFORE PERMISSIONS
      //==================================================

      const permissionKeys = await getAccessPermissionKeys(
        connection,

        idAccess,
      );

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        access_name: access.access_name,

        access_description: access.access_description ?? null,

        permissions: permissionKeys,

        admin_access_status: Number(access.admin_access_status),
      };

      //==================================================
      //==== DELETE PERMISSION MAPPING
      //==================================================

      await connection.query(
        `
          DELETE FROM admin_access_permission

          WHERE id_admin_access = ?
        `,
        [idAccess],
      );

      //==================================================
      //==== SOFT DELETE ACCESS
      //==================================================

      await connection.query(
        `
          UPDATE admin_access

          SET
            admin_access_status = 99,

            updated = NOW()

          WHERE id_admin_access = ?
            AND id_master_comp = ?
        `,
        [idAccess, scope.idMasterComp],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "admin_access.deleted",

        category: "access_control",

        module: "admin_access",

        action: "delete",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_access",

        entityId: idAccess,

        entityLabel: access.access_name,

        before: auditBefore,

        after: {
          ...auditBefore,

          permissions: [],

          admin_access_status: 99,
        },

        metadata: {
          delete_type: "soft_delete",

          removed_permissions: permissionKeys,
        },

        httpStatus: 200,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "ADMIN_ACCESS_DELETED",
        "Admin access deleted successfully",
        {
          id_admin_access: keyhsid.idAdminAccess.encode(idAccess),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Delete admin access error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

export default router;
