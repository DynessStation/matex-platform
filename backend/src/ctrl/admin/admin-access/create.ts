// Create an access profile.
import express = require("express");
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";

import { getSessionScope } from "./scope";
import { resolvePermissionIds, getPermissionKeysByIds } from "./permissions";

const { pool } = db;

const router = express.Router();

//==================================================
//==== ADMIN ACCESS - CREATE
//==================================================

router.post(
  "/api/v1/admin-access",

  verifyToken,

  requirePermission("admin_access.create"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const {
        access_name,

        access_description,

        permissions,
      } = req.body;

      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== NORMALIZE
      //==================================================

      const cleanName =
        typeof access_name === "string" ? access_name.trim() : "";

      const cleanDescription =
        typeof access_description === "string" && access_description.trim()
          ? access_description.trim()
          : null;

      //==================================================
      //==== VALIDATE NAME
      //==================================================

      if (!cleanName) {
        return sendError(
          res,
          400,
          "ADMIN_ACCESS_NAME_REQUIRED",
          "Access name is required",
        );
      }

      if (cleanName.length > 255) {
        return sendError(
          res,
          400,
          "ADMIN_ACCESS_NAME_TOO_LONG",
          "Access name is too long",
        );
      }

      if (cleanDescription && cleanDescription.length > 500) {
        return sendError(
          res,
          400,
          "ADMIN_ACCESS_DESCRIPTION_TOO_LONG",
          "Access description is too long",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== DUPLICATE NAME
      //==================================================

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_admin_access

            FROM admin_access

            WHERE id_master_comp = ?
              AND LOWER(access_name) =
                LOWER(?)
              AND admin_access_status IN (0, 1)

            LIMIT 1
          `,
        [scope.idMasterComp, cleanName],
      );

      if ((duplicateRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ADMIN_ACCESS_NAME_EXISTS",
          "Access name is already in use",
        );
      }

      //==================================================
      //==== RESOLVE PERMISSIONS
      //==================================================

      const permissionResult = await resolvePermissionIds(
        connection,

        permissions,
      );

      if (!permissionResult.success) {
        await connection.rollback();

        return sendError(
          res,
          permissionResult.status,
          permissionResult.code,
          permissionResult.message,
        );
      }

      //==================================================
      //==== INSERT ACCESS
      //==================================================

      const [insertResult] = await connection.query(
        `
            INSERT INTO admin_access
            (
              id_master_comp,

              access_name,

              access_description,

              access_var,

              admin_access_status,

              created,

              updated
            )
            VALUES
            (
              ?,

              ?,

              ?,

              NULL,

              1,

              NOW(),

              NOW()
            )
          `,
        [scope.idMasterComp, cleanName, cleanDescription],
      );

      const idAccess = Number((insertResult as any).insertId);

      //==================================================
      //==== INSERT PERMISSION MAPPING
      //==================================================

      if (permissionResult.ids.length) {
        const valuesSql = permissionResult.ids.map(() => "(?, ?)").join(", ");

        const values = permissionResult.ids.flatMap((idPermission) => [
          idAccess,

          idPermission,
        ]);

        await connection.query(
          `
            INSERT INTO admin_access_permission
            (
              id_admin_access,

              id_admin_permission
            )
            VALUES
              ${valuesSql}
          `,
          values,
        );
      }

      //==================================================
      //==== AUDIT PERMISSIONS
      //==================================================

      const permissionKeys = await getPermissionKeysByIds(
        connection,

        permissionResult.ids,
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "admin_access.created",

        category: "access_control",

        module: "admin_access",

        action: "create",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_access",

        entityId: idAccess,

        entityLabel: cleanName,

        after: {
          access_name: cleanName,

          access_description: cleanDescription,

          permissions: permissionKeys,

          admin_access_status: 1,
        },

        httpStatus: 201,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      return sendSuccess(
        res,
        201,
        "ADMIN_ACCESS_CREATED",
        "Admin access created successfully",
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

      console.error("Create admin access error:", error);

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
