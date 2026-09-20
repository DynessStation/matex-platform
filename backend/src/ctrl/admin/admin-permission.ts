import express = require("express");

import db = require("../../db");

import keyhsid from "../../hsid";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

import { writeAuditLog } from "../../helper/audit-log.helper";

//==================================================
//==== APP
//==================================================

const app = express();

const { pool } = db;

//==================================================
//==== HELPERS
//==================================================

const decodePermissionId = (value: unknown): number | null => {
  const encodedId = String(value ?? "").trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idAdminPermission.decode(encodedId)[0];

  const idPermission = Number(decoded);

  if (!decoded || !Number.isInteger(idPermission) || idPermission <= 0) {
    return null;
  }

  return idPermission;
};

//==================================================
//==== NORMALIZE PERMISSION KEY
//==================================================

const normalizePermissionKey = (value: unknown): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

//==================================================
//==== VALID PERMISSION KEY
//==================================================

const isValidPermissionKey = (value: string): boolean => {
  return /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/.test(value);
};

//==================================================
//==== ADMIN PERMISSION - GET LIST
//==================================================

app.get(
  "/api/v1/admin-permission",

  verifyToken,

  requirePermission("admin_permission.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      //==================================================
      //==== PAGINATION
      //==================================================

      const parsedPage = Number(req.query.page);

      const parsedLimit = Number(req.query.paginate ?? req.query.limit);

      const page =
        Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 100)
          : 15;

      const offset = (page - 1) * limit;

      //==================================================
      //==== SEARCH
      //==================================================

      const search =
        typeof req.query.search === "string" ? req.query.search.trim() : "";

      const searchValue = `%${search}%`;

      //==================================================
      //==== SORT
      //==================================================

      const requestedField =
        typeof req.query.field === "string" ? req.query.field : "";

      const requestedSort =
        typeof req.query.sort === "string"
          ? req.query.sort.toLowerCase()
          : "asc";

      const allowedSortFields: Record<string, string> = {
        permission_key: "ap.permission_key",

        permission_name: "ap.permission_name",

        permission_group: "ap.permission_group",

        created: "ap.created",

        updated: "ap.updated",
      };

      const orderField =
        allowedSortFields[requestedField] ?? "ap.permission_group";

      const orderDirection = requestedSort === "desc" ? "DESC" : "ASC";

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_permission ap

            WHERE ap.permission_status IN (0, 1)

              AND (
                ap.permission_key LIKE ?
                OR ap.permission_name LIKE ?
                OR ap.permission_group LIKE ?
                OR ap.permission_description LIKE ?
              )
          `,
        [searchValue, searchValue, searchValue, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              ap.id_admin_permission,

              ap.permission_key,
              ap.permission_name,
              ap.permission_group,
              ap.permission_description,

              ap.permission_status,

              ap.created,
              ap.updated,

              COUNT(
                DISTINCT aap.id_admin_access
              ) AS access_count

            FROM admin_permission ap

            LEFT JOIN admin_access_permission aap
              ON ap.id_admin_permission =
                aap.id_admin_permission

            WHERE ap.permission_status IN (0, 1)

              AND (
                ap.permission_key LIKE ?
                OR ap.permission_name LIKE ?
                OR ap.permission_group LIKE ?
                OR ap.permission_description LIKE ?
              )

            GROUP BY
              ap.id_admin_permission

            ORDER BY
              ${orderField}
              ${orderDirection},
              ap.permission_name ASC

            LIMIT ?
            OFFSET ?
          `,
        [searchValue, searchValue, searchValue, searchValue, limit, offset],
      );

      //==================================================
      //==== RESPONSE DATA
      //==================================================

      const data = (rows as any[]).map((item) => ({
        id_admin_permission: keyhsid.idAdminPermission.encode(
          item.id_admin_permission,
        ),

        permission_key: item.permission_key,

        permission_name: item.permission_name,

        permission_group: item.permission_group,

        permission_description: item.permission_description,

        permission_status: Number(item.permission_status),

        status_label:
          Number(item.permission_status) === 1 ? "Active" : "Inactive",

        access_count: Number(item.access_count ?? 0),

        created: item.created,

        updated: item.updated,
      }));

      //==================================================
      //==== RESPONSE
      //==================================================

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          total,

          page,

          limit,

          length: data.length,

          pagerows: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get admin permission error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN PERMISSION - CREATE
//==================================================

app.post(
  "/api/v1/admin-permission",

  verifyToken,

  requirePermission("admin_permission.create"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const {
        permission_key,
        permission_name,
        permission_group,
        permission_description,
      } = req.body;

      //==================================================
      //==== CLEAN DATA
      //==================================================

      const cleanKey = normalizePermissionKey(permission_key);

      const cleanName = String(permission_name ?? "").trim();

      const cleanGroup = String(permission_group ?? "").trim();

      const cleanDescription = String(permission_description ?? "").trim();

      //==================================================
      //==== VALIDATION
      //==================================================

      if (!cleanKey) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_KEY_REQUIRED",
          "Permission key is required",
        );
      }

      if (!cleanName) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_NAME_REQUIRED",
          "Permission name is required",
        );
      }

      if (!isValidPermissionKey(cleanKey)) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_KEY_INVALID",
          "Permission key format is invalid",
        );
      }

      if (cleanKey.length > 100) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_KEY_TOO_LONG",
          "Permission key is too long",
        );
      }

      if (cleanName.length > 150) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_NAME_TOO_LONG",
          "Permission name is too long",
        );
      }

      if (cleanGroup.length > 100) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_GROUP_TOO_LONG",
          "Permission group is too long",
        );
      }

      if (cleanDescription.length > 500) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_DESCRIPTION_TOO_LONG",
          "Permission description is too long",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== DUPLICATE KEY
      //==================================================

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_admin_permission

            FROM admin_permission

            WHERE permission_key = ?

            LIMIT 1
          `,
        [cleanKey],
      );

      if ((duplicateRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ADMIN_PERMISSION_KEY_EXISTS",
          "Permission key already exists",
        );
      }

      //==================================================
      //==== INSERT
      //==================================================

      const [result] = await connection.query(
        `
            INSERT INTO admin_permission
            (
              permission_key,
              permission_name,
              permission_group,
              permission_description,

              permission_status,

              created,
              updated
            )
            VALUES
            (
              ?,
              ?,
              ?,
              ?,

              1,

              NOW(),
              NOW()
            )
          `,
        [cleanKey, cleanName, cleanGroup || null, cleanDescription || null],
      );

      const insertId = Number((result as any).insertId);

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        eventCode: "admin_permission.created",

        category: "access_control",

        module: "admin_permission",

        action: "create",

        actorType: "admin",

        actorId: req.user?.id_admin_acct,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_permission",

        entityId: insertId,

        entityLabel: cleanKey,

        after: {
          permission_key: cleanKey,

          permission_name: cleanName,

          permission_group: cleanGroup || null,

          permission_description: cleanDescription || null,

          permission_status: 1,
        },

        httpStatus: 201,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        201,
        "ADMIN_PERMISSION_CREATED",
        "Admin permission created successfully",
        {
          id_admin_permission: keyhsid.idAdminPermission.encode(insertId),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Create admin permission error:", error);

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

//==================================================
//==== ADMIN PERMISSION - GET DETAIL
//==================================================

app.get(
  "/api/v1/admin-permission/:id",

  verifyToken,

  requirePermission("admin_permission.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      const idPermission = decodePermissionId(req.params.id);

      if (!idPermission) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_INVALID_ID",
          "Invalid admin permission identifier",
        );
      }

      const [rows] = await pool.query(
        `
            SELECT
              ap.id_admin_permission,

              ap.permission_key,
              ap.permission_name,
              ap.permission_group,
              ap.permission_description,

              ap.permission_status,

              ap.created,
              ap.updated,

              COUNT(
                DISTINCT aap.id_admin_access
              ) AS access_count

            FROM admin_permission ap

            LEFT JOIN admin_access_permission aap
              ON ap.id_admin_permission =
                aap.id_admin_permission

            WHERE ap.id_admin_permission = ?
              AND ap.permission_status IN (0, 1)

            GROUP BY
              ap.id_admin_permission

            LIMIT 1
          `,
        [idPermission],
      );

      const permissions = rows as any[];

      if (!permissions.length) {
        return sendError(
          res,
          404,
          "ADMIN_PERMISSION_NOT_FOUND",
          "Admin permission not found",
        );
      }

      const item = permissions[0];

      return res.status(200).json({
        success: true,

        data: {
          id_admin_permission: keyhsid.idAdminPermission.encode(
            item.id_admin_permission,
          ),

          permission_key: item.permission_key,

          permission_name: item.permission_name,

          permission_group: item.permission_group,

          permission_description: item.permission_description,

          permission_status: Number(item.permission_status),

          access_count: Number(item.access_count ?? 0),

          created: item.created,

          updated: item.updated,
        },
      });
    } catch (error) {
      console.error("Get admin permission detail error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN PERMISSION - UPDATE
//==================================================

app.put(
  "/api/v1/admin-permission/:id",

  verifyToken,

  requirePermission("admin_permission.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const idPermission = decodePermissionId(req.params.id);

      if (!idPermission) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_INVALID_ID",
          "Invalid admin permission identifier",
        );
      }

      const { permission_name, permission_group, permission_description } =
        req.body;

      //==================================================
      //==== IMPORTANT
      //==== PERMISSION KEY IS IMMUTABLE
      //==================================================

      const cleanName = String(permission_name ?? "").trim();

      const cleanGroup = String(permission_group ?? "").trim();

      const cleanDescription = String(permission_description ?? "").trim();

      //==================================================
      //==== VALIDATION
      //==================================================

      if (!cleanName) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_NAME_REQUIRED",
          "Permission name is required",
        );
      }

      if (cleanName.length > 150) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_NAME_TOO_LONG",
          "Permission name is too long",
        );
      }

      if (cleanGroup.length > 100) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_GROUP_TOO_LONG",
          "Permission group is too long",
        );
      }

      if (cleanDescription.length > 500) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_DESCRIPTION_TOO_LONG",
          "Permission description is too long",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== TARGET
      //==================================================

      const [existingRows] = await connection.query(
        `
            SELECT
              id_admin_permission,

              permission_key,
              permission_name,
              permission_group,
              permission_description,

              permission_status

            FROM admin_permission

            WHERE id_admin_permission = ?
              AND permission_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idPermission],
      );

      const permissions = existingRows as any[];

      if (!permissions.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ADMIN_PERMISSION_NOT_FOUND",
          "Admin permission not found",
        );
      }

      const permission = permissions[0];

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        permission_key: permission.permission_key,

        permission_name: permission.permission_name,

        permission_group: permission.permission_group ?? null,

        permission_description: permission.permission_description ?? null,

        permission_status: Number(permission.permission_status),
      };

      //==================================================
      //==== AUDIT AFTER
      //==================================================

      const auditAfter = {
        permission_key: permission.permission_key,

        permission_name: cleanName,

        permission_group: cleanGroup || null,

        permission_description: cleanDescription || null,

        permission_status: Number(permission.permission_status),
      };

      //==================================================
      //==== UPDATE
      //==================================================

      await connection.query(
        `
          UPDATE admin_permission

          SET
            permission_name = ?,
            permission_group = ?,
            permission_description = ?,

            updated = NOW()

          WHERE id_admin_permission = ?
        `,
        [cleanName, cleanGroup || null, cleanDescription || null, idPermission],
      );

      //==================================================
      //==== CHANGE CHECK
      //==================================================

      const changed =
        auditBefore.permission_name !== auditAfter.permission_name ||
        auditBefore.permission_group !== auditAfter.permission_group ||
        auditBefore.permission_description !==
          auditAfter.permission_description;

      //==================================================
      //==== AUDIT
      //==================================================

      if (changed) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          eventCode: "admin_permission.updated",

          category: "access_control",

          module: "admin_permission",

          action: "update",

          actorType: "admin",

          actorId: req.user?.id_admin_acct,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_permission",

          entityId: idPermission,

          entityLabel: permission.permission_key,

          before: auditBefore,

          after: auditAfter,

          httpStatus: 200,
        });
      }

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        200,
        "ADMIN_PERMISSION_UPDATED",
        "Admin permission updated successfully",
        {
          id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Update admin permission error:", error);

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

//==================================================
//==== ADMIN PERMISSION - UPDATE STATUS
//==================================================

app.patch(
  "/api/v1/admin-permission/:id/status",

  verifyToken,

  requirePermission("admin_permission.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const idPermission = decodePermissionId(req.params.id);

      //==================================================
      //==== ID
      //==================================================

      if (!idPermission) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_INVALID_ID",
          "Invalid admin permission identifier",
        );
      }

      //==================================================
      //==== STATUS
      //==================================================

      const newStatus = Number(req.body?.permission_status);

      if (![0, 1].includes(newStatus)) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_INVALID_STATUS",
          "Invalid permission status",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== TARGET
      //==================================================

      const [rows] = await connection.query(
        `
            SELECT
              id_admin_permission,

              permission_key,
              permission_name,

              permission_status

            FROM admin_permission

            WHERE id_admin_permission = ?
              AND permission_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idPermission],
      );

      const permissions = rows as any[];

      if (!permissions.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ADMIN_PERMISSION_NOT_FOUND",
          "Admin permission not found",
        );
      }

      const permission = permissions[0];

      //==================================================
      //==== SAME STATUS
      //==================================================

      if (Number(permission.permission_status) === newStatus) {
        await connection.rollback();

        return sendSuccess(
          res,
          200,
          newStatus === 1
            ? "ADMIN_PERMISSION_ALREADY_ACTIVE"
            : "ADMIN_PERMISSION_ALREADY_INACTIVE",
          newStatus === 1
            ? "Admin permission is already active"
            : "Admin permission is already inactive",
          {
            id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),

            permission_status: newStatus,
          },
        );
      }

      //==================================================
      //==== AFFECTED ACTIVE ACCESS ROLES
      //==================================================

      const [referenceRows] = await connection.query(
        `
            SELECT
              COUNT(
                DISTINCT aa.id_admin_access
              ) AS total

            FROM admin_access_permission aap

            INNER JOIN admin_access aa
              ON aap.id_admin_access =
                aa.id_admin_access

            WHERE aap.id_admin_permission = ?
              AND aa.admin_access_status = 1
          `,
        [idPermission],
      );

      const affectedAccessRoles = Number(
        (referenceRows as any[])[0]?.total ?? 0,
      );

      //==================================================
      //==== UPDATE
      //==================================================

      await connection.query(
        `
          UPDATE admin_permission

          SET
            permission_status = ?,

            updated = NOW()

          WHERE id_admin_permission = ?
        `,
        [newStatus, idPermission],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        eventCode: "admin_permission.status_changed",

        category: "access_control",

        module: "admin_permission",

        action: "status_change",

        actorType: "admin",

        actorId: req.user?.id_admin_acct,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_permission",

        entityId: idPermission,

        entityLabel: permission.permission_key,

        before: {
          permission_status: Number(permission.permission_status),
        },

        after: {
          permission_status: newStatus,
        },

        metadata: {
          transition: newStatus === 1 ? "activated" : "deactivated",

          affected_access_roles: affectedAccessRoles,
        },

        httpStatus: 200,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        200,
        newStatus === 1
          ? "ADMIN_PERMISSION_ACTIVATED"
          : "ADMIN_PERMISSION_DEACTIVATED",
        newStatus === 1
          ? "Admin permission activated successfully"
          : "Admin permission deactivated successfully",
        {
          id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),

          permission_status: newStatus,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Update admin permission status error:", error);

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

//==================================================
//==== ADMIN PERMISSION - DELETE
//==================================================

app.delete(
  "/api/v1/admin-permission/:id",

  verifyToken,

  requirePermission("admin_permission.delete"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const idPermission = decodePermissionId(req.params.id);

      if (!idPermission) {
        return sendError(
          res,
          400,
          "ADMIN_PERMISSION_INVALID_ID",
          "Invalid admin permission identifier",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== GET PERMISSION
      //==================================================

      const [permissionRows] = await connection.query(
        `
            SELECT
              id_admin_permission,

              permission_key,
              permission_name,
              permission_group,
              permission_description,

              permission_status

            FROM admin_permission

            WHERE id_admin_permission = ?
              AND permission_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idPermission],
      );

      const permissions = permissionRows as any[];

      if (!permissions.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ADMIN_PERMISSION_NOT_FOUND",
          "Admin permission not found",
        );
      }

      const permission = permissions[0];

      //==================================================
      //==== MUST DEACTIVATE FIRST
      //==================================================

      if (Number(permission.permission_status) !== 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ADMIN_PERMISSION_MUST_BE_INACTIVE",
          "Deactivate the admin permission before deleting it",
        );
      }

      //==================================================
      //==== CHECK ACCESS REFERENCES
      //==================================================

      const [referenceRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_access_permission

            WHERE id_admin_permission = ?
          `,
        [idPermission],
      );

      const referenceCount = Number((referenceRows as any[])[0]?.total ?? 0);

      if (referenceCount > 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "ADMIN_PERMISSION_HAS_ACCESS_REFERENCES",
          "Admin permission is still assigned to one or more access roles",
          {
            access_roles: referenceCount,
          },
        );
      }

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        permission_key: permission.permission_key,

        permission_name: permission.permission_name,

        permission_group: permission.permission_group ?? null,

        permission_description: permission.permission_description ?? null,

        permission_status: Number(permission.permission_status),
      };

      //==================================================
      //==== SOFT DELETE
      //==================================================

      await connection.query(
        `
          UPDATE admin_permission

          SET
            permission_status = 99,

            updated = NOW()

          WHERE id_admin_permission = ?
        `,
        [idPermission],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        eventCode: "admin_permission.deleted",

        category: "access_control",

        module: "admin_permission",

        action: "delete",

        actorType: "admin",

        actorId: req.user?.id_admin_acct,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_permission",

        entityId: idPermission,

        entityLabel: permission.permission_key,

        before: auditBefore,

        after: {
          ...auditBefore,

          permission_status: 99,
        },

        metadata: {
          delete_type: "soft_delete",
        },

        httpStatus: 200,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        200,
        "ADMIN_PERMISSION_DELETED",
        "Admin permission deleted successfully",
        {
          id_admin_permission: keyhsid.idAdminPermission.encode(idPermission),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Delete admin permission error:", error);

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

export default app;
