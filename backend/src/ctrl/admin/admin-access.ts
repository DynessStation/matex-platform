import express = require("express");

import db = require("../../db");

import keyhsid from "../../hsid";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { writeAuditLog } from "../../helper/audit-log.helper";

//==================================================
//==== APP
//==================================================

const app = express();

const { pool } = db;

//==================================================
//==== TYPES
//==================================================

type SessionScopeResult =
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

type PermissionResolveResult =
  | {
      success: true;

      ids: number[];
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

const getSessionScope = async (
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

    idAccess: Number(user.id_access),

    isAllAccess: Number(user.is_all_access),
  };
};

//==================================================
//==== DECODE ACCESS ID
//==================================================

const decodeAdminAccessId = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const decoded = keyhsid.idAdminAccess.decode(value.trim())[0];

  const idAccess = Number(decoded);

  if (!decoded || !Number.isInteger(idAccess) || idAccess <= 0) {
    return null;
  }

  return idAccess;
};

//==================================================
//==== RESOLVE PERMISSIONS
//==================================================

const resolvePermissionIds = async (
  executor: any,

  value: unknown,
): Promise<PermissionResolveResult> => {
  //==================================================
  //==== ARRAY REQUIRED
  //==================================================

  if (!Array.isArray(value)) {
    return {
      success: false,

      status: 400,

      code: "ADMIN_ACCESS_PERMISSIONS_ARRAY_INVALID",

      message: "Permissions must be an array",
    };
  }

  //==================================================
  //==== EMPTY IS ALLOWED
  //==================================================

  if (value.length === 0) {
    return {
      success: true,

      ids: [],
    };
  }

  //==================================================
  //==== VALIDATE RAW VALUES
  //==================================================

  const encodedPermissions: string[] = [];

  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) {
      return {
        success: false,

        status: 400,

        code: "ADMIN_ACCESS_PERMISSION_ID_INVALID",

        message: "Invalid permission identifier",
      };
    }

    encodedPermissions.push(item.trim());
  }

  //==================================================
  //==== UNIQUE
  //==================================================

  const uniqueEncoded = [...new Set(encodedPermissions)];

  //==================================================
  //==== DECODE
  //==================================================

  const permissionIds: number[] = [];

  for (const encoded of uniqueEncoded) {
    const decoded = keyhsid.idAdminPermission.decode(encoded)[0];

    const idPermission = Number(decoded);

    if (!decoded || !Number.isInteger(idPermission) || idPermission <= 0) {
      return {
        success: false,

        status: 400,

        code: "ADMIN_ACCESS_PERMISSION_ID_INVALID",

        message: "Invalid permission identifier",
      };
    }

    permissionIds.push(idPermission);
  }

  //==================================================
  //==== UNIQUE NUMERIC IDS
  //==================================================

  const uniqueIds = [...new Set(permissionIds)];

  //==================================================
  //==== VALIDATE ACTIVE PERMISSIONS
  //==================================================

  const placeholders = uniqueIds.map(() => "?").join(", ");

  const [permissionRows] = await executor.query(
    `
    SELECT
      id_admin_permission,
      permission_key

    FROM admin_permission

    WHERE id_admin_permission IN (
      ${placeholders}
    )
      AND permission_status = 1
  `,
    uniqueIds,
  );

  const permissions = permissionRows as any[];

  if (permissions.length !== uniqueIds.length) {
    return {
      success: false,

      status: 400,

      code: "ADMIN_ACCESS_PERMISSION_NOT_AVAILABLE",

      message: "One or more permissions are not available",
    };
  }

  //==================================================
  //==== PERMISSION DEPENDENCIES
  //==================================================

  const permissionKeys = new Set(
    permissions.map((item) => String(item.permission_key)),
  );

  const dependencies: Record<string, string[]> = {
    "attachment.create": ["attachment.view"],

    "attachment.delete": ["attachment.view"],
  };

  for (const [permissionKey, requiredKeys] of Object.entries(dependencies)) {
    if (!permissionKeys.has(permissionKey)) {
      continue;
    }

    for (const requiredKey of requiredKeys) {
      if (permissionKeys.has(requiredKey)) {
        continue;
      }

      return {
        success: false,

        status: 400,

        code: "ADMIN_ACCESS_PERMISSION_DEPENDENCY_REQUIRED",

        message: `${requiredKey} is required when assigning ${permissionKey}`,
      };
    }
  }

  return {
    success: true,

    ids: uniqueIds,
  };
};

//==================================================
//==== GET PERMISSION KEYS BY IDS
//==================================================

const getPermissionKeysByIds = async (
  executor: any,

  ids: number[],
): Promise<string[]> => {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");

  const [rows] = await executor.query(
    `
        SELECT
          permission_key

        FROM admin_permission

        WHERE id_admin_permission IN (
          ${placeholders}
        )

        ORDER BY
          permission_key ASC
      `,
    ids,
  );

  return (rows as any[]).map((item) => String(item.permission_key));
};

//==================================================
//==== GET ACCESS PERMISSION KEYS
//==================================================

const getAccessPermissionKeys = async (
  executor: any,

  idAccess: number,
): Promise<string[]> => {
  const [rows] = await executor.query(
    `
        SELECT
          ap.permission_key

        FROM admin_access_permission aap

        INNER JOIN admin_permission ap
          ON aap.id_admin_permission =
            ap.id_admin_permission

        WHERE aap.id_admin_access = ?

        ORDER BY
          ap.permission_key ASC
      `,
    [idAccess],
  );

  return (rows as any[]).map((item) => String(item.permission_key));
};

//==================================================
//==== PERMISSION DIFF
//==================================================

const getPermissionDiff = (
  before: string[],

  after: string[],
) => {
  const beforeSet = new Set(before);

  const afterSet = new Set(after);

  const added = after.filter((permission) => !beforeSet.has(permission));

  const removed = before.filter((permission) => !afterSet.has(permission));

  return {
    added,

    removed,

    changed: added.length > 0 || removed.length > 0,
  };
};

//==================================================
//==== LIST QUERY HELPER
//==================================================

const getListQuery = (query: any) => {
  const parsedPage =
    typeof query.page === "string" && query.page !== ""
      ? Number(query.page)
      : 1;

  const parsedLimit =
    typeof query.limit === "string" && query.limit !== ""
      ? Number(query.limit)
      : 15;

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 15;

  const offset = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : "";

  const searchValue = `%${search}%`;

  return {
    page,

    limit,

    offset,

    search,

    searchValue,
  };
};

//==================================================
//==== ADMIN ACCESS - GET LIST
//==================================================

app.get(
  "/api/v1/admin-access",

  verifyToken,

  requirePermission("admin_access.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== QUERY
      //==================================================

      const { page, limit, offset, searchValue } = getListQuery(req.query);

      //==================================================
      //==== SORTING
      //==================================================

      const order = typeof req.query.ord === "string" ? req.query.ord : "";

      const sort = req.query.srt;

      const allowedOrder: Record<string, string> = {
        id: "aa.id_admin_access",

        access_name: "aa.access_name",

        permission_count: "permission_count",

        admin_count: "admin_count",

        created: "aa.created",

        updated: "aa.updated",
      };

      const orderQuery = allowedOrder[order] ?? "aa.id_admin_access";

      const sortQuery = sort === "desc" || sort === "true" ? "DESC" : "ASC";

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_access aa

            WHERE aa.id_master_comp = ?
              AND aa.admin_access_status IN (0, 1)
              AND (
                aa.access_name LIKE ?
                OR COALESCE(
                  aa.access_description,
                  ''
                ) LIKE ?
              )
          `,
        [scope.idMasterComp, searchValue, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              aa.id_admin_access,

              aa.access_name,

              aa.access_description,

              aa.admin_access_status,

              aa.created,

              aa.updated,

              COUNT(
                DISTINCT ap.id_admin_permission
              ) AS permission_count,

              COUNT(
                DISTINCT acct.id_admin_acct
              ) AS admin_count

            FROM admin_access aa

            LEFT JOIN admin_access_permission aap
              ON aa.id_admin_access =
                aap.id_admin_access

            LEFT JOIN admin_permission ap
              ON aap.id_admin_permission =
                ap.id_admin_permission
              AND ap.permission_status = 1

            LEFT JOIN admin_acct acct
              ON aa.id_admin_access =
                acct.id_access
              AND acct.admin_acct_status IN (0, 1)

            WHERE aa.id_master_comp = ?
              AND aa.admin_access_status IN (0, 1)
              AND (
                aa.access_name LIKE ?
                OR COALESCE(
                  aa.access_description,
                  ''
                ) LIKE ?
              )

            GROUP BY
              aa.id_admin_access,
              aa.access_name,
              aa.access_description,
              aa.admin_access_status,
              aa.created,
              aa.updated

            ORDER BY
              ${orderQuery}
              ${sortQuery}

            LIMIT ?
            OFFSET ?
          `,
        [scope.idMasterComp, searchValue, searchValue, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
        id_admin_access: keyhsid.idAdminAccess.encode(item.id_admin_access),

        access_name: item.access_name,

        access_description: item.access_description,

        permission_count: Number(item.permission_count ?? 0),

        admin_count: Number(item.admin_count ?? 0),

        admin_access_status: Number(item.admin_access_status),

        status_label:
          Number(item.admin_access_status) === 1 ? "Active" : "Inactive",

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
          page,

          limit,

          total,

          length: data.length,

          pagerows: Math.ceil(total / limit),

          total_pages: Math.ceil(total / limit),

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Get admin access list error:", error);

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
//==== ADMIN ACCESS - PERMISSION MATRIX
//==================================================
//
// IMPORTANT:
// Route ini HARUS berada sebelum /:id
// supaya "permission-matrix" tidak dianggap ID.
//==================================================

app.get(
  "/api/v1/admin-access/permission-matrix",

  verifyToken,

  requirePermission("admin_access.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== ACTIVE GLOBAL PERMISSIONS
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              id_admin_permission,

              permission_key,

              permission_name,

              permission_group,

              permission_description

            FROM admin_permission

            WHERE permission_status = 1

            ORDER BY
              COALESCE(
                permission_group,
                'Other'
              ) ASC,

              permission_key ASC
          `,
      );

      const permissionRows = rows as any[];

      //==================================================
      //==== GROUP MATRIX
      //==================================================

      const grouped = new Map<string, any[]>();

      for (const item of permissionRows) {
        const group = item.permission_group
          ? String(item.permission_group).trim()
          : "Other";

        if (!grouped.has(group)) {
          grouped.set(group, []);
        }

        grouped.get(group)!.push({
          id_admin_permission: keyhsid.idAdminPermission.encode(
            item.id_admin_permission,
          ),

          permission_key: item.permission_key,

          permission_name: item.permission_name,

          permission_description: item.permission_description,
        });
      }

      const data = Array.from(grouped.entries()).map(
        ([group, permissions]) => ({
          permission_group: group,

          permissions,
        }),
      );

      return res.status(200).json({
        success: true,

        data,
      });
    } catch (error) {
      console.error("Get permission matrix error:", error);

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
//==== ADMIN ACCESS - CREATE
//==================================================

app.post(
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

//==================================================
//==== ADMIN ACCESS - GET DETAIL
//==================================================

app.get(
  "/api/v1/admin-access/:id",

  verifyToken,

  requirePermission("admin_access.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
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
      //==== ACCESS
      //==================================================

      const [accessRows] = await pool.query(
        `
            SELECT
              aa.id_admin_access,

              aa.access_name,

              aa.access_description,

              aa.admin_access_status,

              aa.created,

              aa.updated,

              (
                SELECT
                  COUNT(*)

                FROM admin_acct acct

                WHERE acct.id_access =
                  aa.id_admin_access
                  AND acct.admin_acct_status IN (0, 1)
              ) AS admin_count

            FROM admin_access aa

            WHERE aa.id_admin_access = ?
              AND aa.id_master_comp = ?
              AND aa.admin_access_status IN (0, 1)

            LIMIT 1
          `,
        [idAccess, scope.idMasterComp],
      );

      const accesses = accessRows as any[];

      if (!accesses.length) {
        return sendError(
          res,
          404,
          "ADMIN_ACCESS_NOT_FOUND",
          "Admin access not found",
        );
      }

      const access = accesses[0];

      //==================================================
      //==== PERMISSIONS
      //==================================================

      const [permissionRows] = await pool.query(
        `
            SELECT
              ap.id_admin_permission,

              ap.permission_key,

              ap.permission_name,

              ap.permission_group,

              ap.permission_description

            FROM admin_access_permission aap

            INNER JOIN admin_permission ap
              ON aap.id_admin_permission =
                ap.id_admin_permission

            WHERE aap.id_admin_access = ?
              AND ap.permission_status = 1

            ORDER BY
              COALESCE(
                ap.permission_group,
                'Other'
              ) ASC,

              ap.permission_key ASC
          `,
        [idAccess],
      );

      const permissions = (permissionRows as any[]).map((item) => ({
        id_admin_permission: keyhsid.idAdminPermission.encode(
          item.id_admin_permission,
        ),

        permission_key: item.permission_key,

        permission_name: item.permission_name,

        permission_group: item.permission_group,

        permission_description: item.permission_description,
      }));

      return res.status(200).json({
        success: true,

        data: {
          id_admin_access: keyhsid.idAdminAccess.encode(access.id_admin_access),

          access_name: access.access_name,

          access_description: access.access_description,

          admin_access_status: Number(access.admin_access_status),

          status_label:
            Number(access.admin_access_status) === 1 ? "Active" : "Inactive",

          admin_count: Number(access.admin_count ?? 0),

          permission_ids: permissions.map((item) => item.id_admin_permission),

          permissions,

          created: access.created,

          updated: access.updated,
        },
      });
    } catch (error) {
      console.error("Get admin access detail error:", error);

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
//==== ADMIN ACCESS - UPDATE
//==================================================

app.put(
  "/api/v1/admin-access/:id",

  verifyToken,

  requirePermission("admin_access.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      const {
        access_name,

        access_description,

        permissions,
      } = req.body;

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
      //==== NORMALIZE
      //==================================================

      const cleanName =
        typeof access_name === "string" ? access_name.trim() : "";

      const cleanDescription =
        typeof access_description === "string" && access_description.trim()
          ? access_description.trim()
          : null;

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
      //==== TARGET ACCESS
      //==================================================

      const [targetRows] = await connection.query(
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

      if (!(targetRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "ADMIN_ACCESS_NOT_FOUND",
          "Admin access not found",
        );
      }

      const targetAccess = (targetRows as any[])[0];

      //==================================================
      //==== AUDIT BEFORE PERMISSIONS
      //==================================================

      const beforePermissionKeys = await getAccessPermissionKeys(
        connection,

        idAccess,
      );

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
              AND id_admin_access != ?
              AND admin_access_status IN (0, 1)

            LIMIT 1
          `,
        [scope.idMasterComp, cleanName, idAccess],
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
      //==== AUDIT AFTER PERMISSIONS
      //==================================================

      const afterPermissionKeys = await getPermissionKeysByIds(
        connection,

        permissionResult.ids,
      );

      //==================================================
      //==== UPDATE ACCESS
      //==================================================

      await connection.query(
        `
          UPDATE admin_access

          SET
            access_name = ?,

            access_description = ?,

            updated = NOW()

          WHERE id_admin_access = ?
            AND id_master_comp = ?
        `,
        [cleanName, cleanDescription, idAccess, scope.idMasterComp],
      );

      //==================================================
      //==== REPLACE PERMISSION MAPPING
      //==================================================

      await connection.query(
        `
          DELETE FROM admin_access_permission

          WHERE id_admin_access = ?
        `,
        [idAccess],
      );

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
      //==== AUDIT ACCESS CHANGE
      //==================================================

      const accessChanged =
        String(targetAccess.access_name) !== cleanName ||
        (targetAccess.access_description ?? null) !== cleanDescription;

      if (accessChanged) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "admin_access.updated",

          category: "access_control",

          module: "admin_access",

          action: "update",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_access",

          entityId: idAccess,

          entityLabel: cleanName,

          before: {
            access_name: targetAccess.access_name,

            access_description: targetAccess.access_description ?? null,
          },

          after: {
            access_name: cleanName,

            access_description: cleanDescription,
          },

          httpStatus: 200,
        });
      }

      //==================================================
      //==== AUDIT PERMISSION CHANGE
      //==================================================

      const permissionDiff = getPermissionDiff(
        beforePermissionKeys,

        afterPermissionKeys,
      );

      if (permissionDiff.changed) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "admin_access.permissions_changed",

          category: "access_control",

          module: "admin_access",

          action: "permissions_change",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_access",

          entityId: idAccess,

          entityLabel: cleanName,

          before: {
            permissions: beforePermissionKeys,
          },

          after: {
            permissions: afterPermissionKeys,
          },

          metadata: {
            added_permissions: permissionDiff.added,

            removed_permissions: permissionDiff.removed,
          },

          httpStatus: 200,
        });
      }

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "ADMIN_ACCESS_UPDATED",
        "Admin access updated successfully",
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

      console.error("Update admin access error:", error);

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
//==== ADMIN ACCESS - UPDATE STATUS
//==================================================

app.patch(
  "/api/v1/admin-access/:id/status",

  verifyToken,

  requirePermission("admin_access.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      const { admin_access_status } = req.body;

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
      //==== STATUS
      //==================================================

      const newStatus = Number(admin_access_status);

      if (![0, 1].includes(newStatus)) {
        return sendError(
          res,
          400,
          "ADMIN_ACCESS_INVALID_STATUS",
          "Invalid admin access status",
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
      //==== PREVENT SELF ROLE DEACTIVATION
      //==================================================

      if (
        newStatus === 0 &&
        scope.isAllAccess !== 1 &&
        scope.idAccess === idAccess
      ) {
        await connection.rollback();

        return sendError(
          res,
          403,
          "ADMIN_ACCESS_SELF_DEACTIVATION_FORBIDDEN",
          "You cannot deactivate your own access profile",
        );
      }

      //==================================================
      //==== SAME STATUS
      //==================================================

      if (Number(access.admin_access_status) === newStatus) {
        await connection.rollback();

        return sendSuccess(
          res,
          200,
          newStatus === 1
            ? "ADMIN_ACCESS_ALREADY_ACTIVE"
            : "ADMIN_ACCESS_ALREADY_INACTIVE",
          newStatus === 1
            ? "Admin access is already active"
            : "Admin access is already inactive",
          {
            id_admin_access: keyhsid.idAdminAccess.encode(idAccess),

            admin_access_status: newStatus,
          },
        );
      }

      //==================================================
      //==== AFFECTED NORMAL ACCOUNTS
      //==================================================

      const [accountRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_acct

            WHERE id_master_comp = ?
              AND id_access = ?
              AND is_all_access != 1
              AND admin_acct_status = 1
          `,
        [scope.idMasterComp, idAccess],
      );

      const affectedAccounts = Number((accountRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== UPDATE
      //==================================================

      await connection.query(
        `
          UPDATE admin_access

          SET
            admin_access_status = ?,

            updated = NOW()

          WHERE id_admin_access = ?
            AND id_master_comp = ?
        `,
        [newStatus, idAccess, scope.idMasterComp],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "admin_access.status_changed",

        category: "access_control",

        module: "admin_access",

        action: "status_change",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_access",

        entityId: idAccess,

        entityLabel: access.access_name,

        before: {
          admin_access_status: Number(access.admin_access_status),
        },

        after: {
          admin_access_status: newStatus,
        },

        metadata: {
          transition: newStatus === 1 ? "activated" : "deactivated",

          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
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
        newStatus === 1 ? "ADMIN_ACCESS_ACTIVATED" : "ADMIN_ACCESS_DEACTIVATED",
        newStatus === 1
          ? "Admin access activated successfully"
          : "Admin access deactivated successfully",
        {
          id_admin_access: keyhsid.idAdminAccess.encode(idAccess),

          admin_access_status: newStatus,

          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Update admin access status error:", error);

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
//==== ADMIN ACCESS - DELETE
//==================================================

app.delete(
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

//==================================================
//==== ROUTER
//==================================================

export default app;
