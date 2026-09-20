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
//==== TYPES
//==================================================

type SessionScopeResult =
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
  };
};

//==================================================
//==== DECODE CHAIR ID
//==================================================

const decodeChairId = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const decoded = keyhsid.idChair.decode(value.trim())[0];

  const idChair = Number(decoded);

  if (!decoded || !Number.isInteger(idChair) || idChair <= 0) {
    return null;
  }

  return idChair;
};

//==================================================
//==== LIST QUERY
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
//==== CHAIR - GET LIST
//==================================================

app.get(
  "/api/v1/chair",

  verifyToken,

  requirePermission("chair.view"),

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
      //==== SORT
      //==================================================

      const order = typeof req.query.ord === "string" ? req.query.ord : "";

      const sort = req.query.srt;

      const allowedOrder: Record<string, string> = {
        id: "ch.id_chair",

        chair_name: "ch.chair_name",

        admin_count: "admin_count",

        created: "ch.created",

        updated: "ch.updated",
      };

      const orderQuery = allowedOrder[order] ?? "ch.id_chair";

      const sortQuery = sort === "desc" || sort === "true" ? "DESC" : "ASC";

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM chair ch

            WHERE ch.id_master_comp = ?
              AND ch.chair_status IN (0, 1)
              AND (
                ch.chair_name LIKE ?
                OR COALESCE(
                  ch.chair_description,
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
              ch.id_chair,

              ch.chair_name,

              ch.chair_description,

              ch.chair_status,

              ch.created,

              ch.updated,

              COUNT(
                DISTINCT aa.id_admin_acct
              ) AS admin_count

            FROM chair ch

            LEFT JOIN admin_acct aa
              ON ch.id_chair =
                aa.id_chair
              AND aa.admin_acct_status IN (0, 1)

            WHERE ch.id_master_comp = ?
              AND ch.chair_status IN (0, 1)
              AND (
                ch.chair_name LIKE ?
                OR COALESCE(
                  ch.chair_description,
                  ''
                ) LIKE ?
              )

            GROUP BY
              ch.id_chair,
              ch.chair_name,
              ch.chair_description,
              ch.chair_status,
              ch.created,
              ch.updated

            ORDER BY
              ${orderQuery}
              ${sortQuery}

            LIMIT ?
            OFFSET ?
          `,
        [scope.idMasterComp, searchValue, searchValue, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
        id_chair: keyhsid.idChair.encode(item.id_chair),

        chair_name: item.chair_name,

        chair_description: item.chair_description,

        admin_count: Number(item.admin_count ?? 0),

        chair_status: Number(item.chair_status),

        status_label: Number(item.chair_status) === 1 ? "Active" : "Inactive",

        created: item.created,

        updated: item.updated,
      }));

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
      console.error("Get chair list error:", error);

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
//==== CHAIR - CREATE
//==================================================

app.post(
  "/api/v1/chair",

  verifyToken,

  requirePermission("chair.create"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const {
        chair_name,

        chair_description,
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

      const cleanName = typeof chair_name === "string" ? chair_name.trim() : "";

      const cleanDescription =
        typeof chair_description === "string" && chair_description.trim()
          ? chair_description.trim()
          : null;

      //==================================================
      //==== VALIDATE
      //==================================================

      if (!cleanName) {
        return sendError(
          res,
          400,
          "CHAIR_NAME_REQUIRED",
          "Position name is required",
        );
      }

      if (cleanName.length > 255) {
        return sendError(
          res,
          400,
          "CHAIR_NAME_TOO_LONG",
          "Position name is too long",
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== DUPLICATE
      //==================================================

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_chair

            FROM chair

            WHERE id_master_comp = ?
              AND LOWER(
                chair_name
              ) =
                LOWER(?)
              AND chair_status IN (0, 1)

            LIMIT 1
          `,
        [scope.idMasterComp, cleanName],
      );

      if ((duplicateRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "CHAIR_ALREADY_EXISTS",
          "Position name is already in use",
        );
      }

      //==================================================
      //==== INSERT
      //==================================================

      const [insertResult] = await connection.query(
        `
            INSERT INTO chair
            (
              id_master_comp,

              chair_name,

              chair_description,

              chair_status,

              created,

              updated
            )
            VALUES
            (
              ?,

              ?,

              ?,

              1,

              NOW(),

              NOW()
            )
          `,
        [scope.idMasterComp, cleanName, cleanDescription],
      );

      const idChair = Number((insertResult as any).insertId);

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "chair.created",

        category: "data_change",

        module: "chair",

        action: "create",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "chair",

        entityId: idChair,

        entityLabel: cleanName,

        after: {
          chair_name: cleanName,

          chair_description: cleanDescription,

          chair_status: 1,
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
        "CHAIR_CREATED",
        "Position created successfully",
        {
          id_chair: keyhsid.idChair.encode(idChair),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Create chair error:", error);

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
//==== CHAIR - GET DETAIL
//==================================================

app.get(
  "/api/v1/chair/:id",

  verifyToken,

  requirePermission("chair.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      const { id } = req.params;

      //==================================================
      //==== ID
      //==================================================

      const idChair = decodeChairId(id);

      if (!idChair) {
        return sendError(
          res,
          400,
          "CHAIR_INVALID_ID",
          "Invalid position identifier",
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
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              ch.id_chair,

              ch.chair_name,

              ch.chair_description,

              ch.chair_status,

              ch.created,

              ch.updated,

              (
                SELECT
                  COUNT(*)

                FROM admin_acct aa

                WHERE aa.id_chair =
                  ch.id_chair
                  AND aa.admin_acct_status IN (0, 1)
              ) AS admin_count

            FROM chair ch

            WHERE ch.id_chair = ?
              AND ch.id_master_comp = ?
              AND ch.chair_status IN (0, 1)

            LIMIT 1
          `,
        [idChair, scope.idMasterComp],
      );

      const chairs = rows as any[];

      if (!chairs.length) {
        return sendError(res, 404, "CHAIR_NOT_FOUND", "Position not found");
      }

      const chair = chairs[0];

      return res.status(200).json({
        success: true,

        data: {
          id_chair: keyhsid.idChair.encode(chair.id_chair),

          chair_name: chair.chair_name,

          chair_description: chair.chair_description,

          chair_status: Number(chair.chair_status),

          status_label:
            Number(chair.chair_status) === 1 ? "Active" : "Inactive",

          admin_count: Number(chair.admin_count ?? 0),

          created: chair.created,

          updated: chair.updated,
        },
      });
    } catch (error) {
      console.error("Get chair detail error:", error);

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
//==== CHAIR - UPDATE
//==================================================

app.put(
  "/api/v1/chair/:id",

  verifyToken,

  requirePermission("chair.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      const {
        chair_name,

        chair_description,
      } = req.body;

      //==================================================
      //==== ID
      //==================================================

      const idChair = decodeChairId(id);

      if (!idChair) {
        return sendError(
          res,
          400,
          "CHAIR_INVALID_ID",
          "Invalid position identifier",
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

      const cleanName = typeof chair_name === "string" ? chair_name.trim() : "";

      const cleanDescription =
        typeof chair_description === "string" && chair_description.trim()
          ? chair_description.trim()
          : null;

      //==================================================
      //==== VALIDATE
      //==================================================

      if (!cleanName) {
        return sendError(
          res,
          400,
          "CHAIR_NAME_REQUIRED",
          "Position name is required",
        );
      }

      if (cleanName.length > 255) {
        return sendError(
          res,
          400,
          "CHAIR_NAME_TOO_LONG",
          "Position name is too long",
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

      const [targetRows] = await connection.query(
        `
            SELECT
              id_chair,

              chair_name,

              chair_description,

              chair_status

            FROM chair

            WHERE id_chair = ?
              AND id_master_comp = ?
              AND chair_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idChair, scope.idMasterComp],
      );

      const chairs = targetRows as any[];

      if (!chairs.length) {
        await connection.rollback();

        return sendError(res, 404, "CHAIR_NOT_FOUND", "Position not found");
      }

      const chair = chairs[0];

      //==================================================
      //==== DUPLICATE
      //==================================================

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_chair

            FROM chair

            WHERE id_master_comp = ?
              AND LOWER(
                chair_name
              ) =
                LOWER(?)
              AND id_chair != ?
              AND chair_status IN (0, 1)

            LIMIT 1
          `,
        [scope.idMasterComp, cleanName, idChair],
      );

      if ((duplicateRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "CHAIR_ALREADY_EXISTS",
          "Position name is already in use",
        );
      }

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        chair_name: chair.chair_name,

        chair_description: chair.chair_description ?? null,

        chair_status: Number(chair.chair_status),
      };

      //==================================================
      //==== AUDIT AFTER
      //==================================================

      const auditAfter = {
        chair_name: cleanName,

        chair_description: cleanDescription,

        chair_status: Number(chair.chair_status),
      };

      //==================================================
      //==== CHANGE CHECK
      //==================================================

      const changed =
        auditBefore.chair_name !== auditAfter.chair_name ||
        auditBefore.chair_description !== auditAfter.chair_description;

      //==================================================
      //==== UPDATE + AUDIT
      //==================================================

      if (changed) {
        await connection.query(
          `
            UPDATE chair

            SET
              chair_name = ?,

              chair_description = ?,

              updated = NOW()

            WHERE id_chair = ?
              AND id_master_comp = ?
          `,
          [cleanName, cleanDescription, idChair, scope.idMasterComp],
        );

        //==================================================
        //==== AUDIT
        //==================================================

        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "chair.updated",

          category: "data_change",

          module: "chair",

          action: "update",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "chair",

          entityId: idChair,

          entityLabel: cleanName,

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
        "CHAIR_UPDATED",
        "Position updated successfully",
        {
          id_chair: keyhsid.idChair.encode(idChair),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Update chair error:", error);

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
//==== CHAIR - UPDATE STATUS
//==================================================

app.patch(
  "/api/v1/chair/:id/status",

  verifyToken,

  requirePermission("chair.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      const { chair_status } = req.body;

      //==================================================
      //==== ID
      //==================================================

      const idChair = decodeChairId(id);

      if (!idChair) {
        return sendError(
          res,
          400,
          "CHAIR_INVALID_ID",
          "Invalid position identifier",
        );
      }

      //==================================================
      //==== STATUS
      //==================================================

      const newStatus = Number(chair_status);

      if (![0, 1].includes(newStatus)) {
        return sendError(
          res,
          400,
          "CHAIR_INVALID_STATUS",
          "Invalid position status",
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

      const [rows] = await connection.query(
        `
            SELECT
              id_chair,

              chair_name,

              chair_status

            FROM chair

            WHERE id_chair = ?
              AND id_master_comp = ?
              AND chair_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idChair, scope.idMasterComp],
      );

      const chairs = rows as any[];

      if (!chairs.length) {
        await connection.rollback();

        return sendError(res, 404, "CHAIR_NOT_FOUND", "Position not found");
      }

      const chair = chairs[0];

      //==================================================
      //==== SAME STATUS
      //==================================================

      if (Number(chair.chair_status) === newStatus) {
        await connection.rollback();

        return sendSuccess(
          res,
          200,
          newStatus === 1 ? "CHAIR_ALREADY_ACTIVE" : "CHAIR_ALREADY_INACTIVE",
          newStatus === 1
            ? "Position is already active"
            : "Position is already inactive",
          {
            id_chair: keyhsid.idChair.encode(idChair),

            chair_status: newStatus,
          },
        );
      }

      //==================================================
      //==== AFFECTED ACCOUNTS
      //==================================================

      const [accountRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_acct

            WHERE id_master_comp = ?
              AND id_chair = ?
              AND admin_acct_status IN (0, 1)
          `,
        [scope.idMasterComp, idChair],
      );

      const affectedAccounts = Number((accountRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== UPDATE
      //==================================================

      await connection.query(
        `
          UPDATE chair

          SET
            chair_status = ?,

            updated = NOW()

          WHERE id_chair = ?
            AND id_master_comp = ?
        `,
        [newStatus, idChair, scope.idMasterComp],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "chair.status_changed",

        category: "data_change",

        module: "chair",

        action: "status_change",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "chair",

        entityId: idChair,

        entityLabel: chair.chair_name,

        before: {
          chair_status: Number(chair.chair_status),
        },

        after: {
          chair_status: newStatus,
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
        newStatus === 1 ? "CHAIR_ACTIVATED" : "CHAIR_DEACTIVATED",
        newStatus === 1
          ? "Position activated successfully"
          : "Position deactivated successfully",
        {
          id_chair: keyhsid.idChair.encode(idChair),

          chair_status: newStatus,

          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Update chair status error:", error);

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
//==== CHAIR - DELETE
//==================================================

app.delete(
  "/api/v1/chair/:id",

  verifyToken,

  requirePermission("chair.delete"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const { id } = req.params;

      //==================================================
      //==== ID
      //==================================================

      const idChair = decodeChairId(id);

      if (!idChair) {
        return sendError(
          res,
          400,
          "CHAIR_INVALID_ID",
          "Invalid position identifier",
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

      const [rows] = await connection.query(
        `
            SELECT
              id_chair,

              chair_name,

              chair_description,

              chair_status

            FROM chair

            WHERE id_chair = ?
              AND id_master_comp = ?
              AND chair_status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idChair, scope.idMasterComp],
      );

      const chairs = rows as any[];

      if (!chairs.length) {
        await connection.rollback();

        return sendError(res, 404, "CHAIR_NOT_FOUND", "Position not found");
      }

      const chair = chairs[0];

      //==================================================
      //==== MUST BE INACTIVE
      //==================================================

      if (Number(chair.chair_status) !== 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "CHAIR_MUST_BE_INACTIVE",
          "Deactivate the position before deleting it",
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
              AND id_chair = ?
              AND admin_acct_status IN (0, 1)
          `,
        [scope.idMasterComp, idChair],
      );

      const references = Number((referenceRows as any[])[0]?.total ?? 0);

      if (references > 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "CHAIR_HAS_ADMIN_REFERENCES",
          "Position is still assigned to one or more admin accounts",
          {
            assigned_accounts: references,
          },
        );
      }

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        chair_name: chair.chair_name,

        chair_description: chair.chair_description ?? null,

        chair_status: Number(chair.chair_status),
      };

      //==================================================
      //==== SOFT DELETE
      //==================================================

      await connection.query(
        `
          UPDATE chair

          SET
            chair_status = 99,

            updated = NOW()

          WHERE id_chair = ?
            AND id_master_comp = ?
        `,
        [idChair, scope.idMasterComp],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "chair.deleted",

        category: "data_change",

        module: "chair",

        action: "delete",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "chair",

        entityId: idChair,

        entityLabel: chair.chair_name,

        before: auditBefore,

        after: {
          ...auditBefore,

          chair_status: 99,
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
        "CHAIR_DELETED",
        "Position deleted successfully",
        {
          id_chair: keyhsid.idChair.encode(idChair),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Delete chair error:", error);

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
