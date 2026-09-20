import express = require("express");

import db = require("../../db");

import keyhsid from "../../hsid";

import {
  AuditCategory,
  AuditOutcome,
  AuditSource,
} from "../../interface/audit-log.interface";

import { verifyAuditIntegrityHash } from "../../helper/audit-integrity.helper";

import { sendError } from "../../helper/api-response.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

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
//==== DECODE AUDIT LOG ID
//==================================================

const decodeAuditLogId = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const decoded = keyhsid.idAuditLog.decode(value.trim())[0];

  const idAuditLog = Number(decoded);

  if (!decoded || !Number.isInteger(idAuditLog) || idAuditLog <= 0) {
    return null;
  }

  return idAuditLog;
};

//==================================================
//==== JSON VALUE
//==================================================

const parseJsonValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

//==================================================
//==== STRING QUERY
//==================================================

const getQueryString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  return clean ? clean : null;
};

//==================================================
//==== ENUM QUERY
//==================================================

const getEnumQuery = <T extends string>(
  value: unknown,

  allowed: readonly T[],
): T | null => {
  const clean = getQueryString(value);

  if (!clean) {
    return null;
  }

  return allowed.includes(clean as T) ? (clean as T) : null;
};

//==================================================
//==== DATABASE DATETIME
//==================================================

const getDatabaseDateTime = (value: Date): string => {
  return value.toISOString().slice(0, 23).replace("T", " ");
};

//==================================================
//==== DATE QUERY
//==================================================

const getDateQuery = (
  value: unknown,

  endOfDay = false,
): string | null => {
  const clean = getQueryString(value);

  if (!clean) {
    return null;
  }

  //==================================================
  //==== DATE ONLY
  //==================================================

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";

    const parsed = new Date(`${clean}${suffix}`);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return getDatabaseDateTime(parsed);
  }

  //==================================================
  //==== ISO / DATETIME
  //==================================================

  const parsed = new Date(clean);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return getDatabaseDateTime(parsed);
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
      : 20;

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;

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
//==== ALLOWED ENUMS
//==================================================

const allowedCategories: readonly AuditCategory[] = [
  "data_change",
  "security",
  "access_control",
  "file",
  "system",
  "business",
  "integration",
];

const allowedOutcomes: readonly AuditOutcome[] = [
  "success",
  "failure",
  "denied",
];

const allowedSources: readonly AuditSource[] = [
  "admin_web",
  "public_web",
  "api",
  "system",
  "job",
  "integration",
];

//==================================================
//==== COMPANY SCOPE SQL
//==================================================

/**
 * Audit biasa:
 *
 *   audit_log.id_master_comp = company user
 *
 * Global audit:
 *
 *   audit_log.id_master_comp IS NULL
 *
 * Global audit hanya terlihat oleh company
 * tempat ADMIN ACTOR berasal.
 *
 * Contoh:
 *
 * admin_permission.updated
 *
 * Permission master bersifat global sehingga
 * id_master_comp audit = NULL, tapi actor admin
 * tetap berasal dari company tertentu.
 */
const companyScopeSql = `
  (
    al.id_master_comp = ?

    OR (
      al.id_master_comp IS NULL

      AND al.actor_type = 'admin'

      AND EXISTS (
        SELECT
          1

        FROM admin_acct scope_actor

        WHERE scope_actor.id_admin_acct =
          CAST(
            al.actor_id
            AS UNSIGNED
          )

          AND scope_actor.id_master_comp = ?

        LIMIT 1
      )
    )
  )
`;

//==================================================
//==== AUDIT LOG - GET LIST
//==================================================

app.get(
  "/api/v1/audit-log",

  verifyToken,

  requirePermission("audit_log.view"),

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
      //==== PAGINATION
      //==================================================

      const { page, limit, offset, searchValue } = getListQuery(req.query);

      //==================================================
      //==== FILTERS
      //==================================================

      const category = getEnumQuery(req.query.category, allowedCategories);

      const outcome = getEnumQuery(req.query.outcome, allowedOutcomes);

      const source = getEnumQuery(req.query.source, allowedSources);

      const module = getQueryString(req.query.module);

      const action = getQueryString(req.query.action);

      const eventCode = getQueryString(req.query.event_code);

      const actorType = getQueryString(req.query.actor_type);

      const actorId = getQueryString(req.query.actor_id);

      const entityType = getQueryString(req.query.entity_type);

      const entityId = getQueryString(req.query.entity_id);

      const requestId = getQueryString(req.query.request_id);

      const correlationId = getQueryString(req.query.correlation_id);

      const dateFrom = getDateQuery(req.query.date_from);

      const dateTo = getDateQuery(req.query.date_to, true);

      //==================================================
      //==== WHERE
      //==================================================

      const where: string[] = [
        companyScopeSql,

        `
            (
              al.event_code LIKE ?

              OR al.module LIKE ?

              OR al.action LIKE ?

              OR COALESCE(
                al.actor_label,
                ''
              ) LIKE ?

              OR COALESCE(
                al.entity_label,
                ''
              ) LIKE ?

              OR COALESCE(
                al.route_path,
                ''
              ) LIKE ?

              OR al.request_id LIKE ?

              OR COALESCE(
                al.correlation_id,
                ''
              ) LIKE ?
            )
          `,
      ];

      const params: any[] = [
        scope.idMasterComp,
        scope.idMasterComp,

        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
      ];

      //==================================================
      //==== OPTIONAL FILTERS
      //==================================================

      if (category) {
        where.push("al.category = ?");

        params.push(category);
      }

      if (outcome) {
        where.push("al.outcome = ?");

        params.push(outcome);
      }

      if (source) {
        where.push("al.source = ?");

        params.push(source);
      }

      if (module) {
        where.push("al.module = ?");

        params.push(module);
      }

      if (action) {
        where.push("al.action = ?");

        params.push(action);
      }

      if (eventCode) {
        where.push("al.event_code = ?");

        params.push(eventCode);
      }

      if (actorType) {
        where.push("al.actor_type = ?");

        params.push(actorType);
      }

      if (actorId) {
        where.push("al.actor_id = ?");

        params.push(actorId);
      }

      if (entityType) {
        where.push("al.entity_type = ?");

        params.push(entityType);
      }

      if (entityId) {
        where.push("al.entity_id = ?");

        params.push(entityId);
      }

      if (requestId) {
        where.push("al.request_id = ?");

        params.push(requestId);
      }

      if (correlationId) {
        where.push("al.correlation_id = ?");

        params.push(correlationId);
      }

      if (dateFrom) {
        where.push("al.created >= ?");

        params.push(dateFrom);
      }

      if (dateTo) {
        where.push("al.created <= ?");

        params.push(dateTo);
      }

      const whereSql = where.join("\n AND ");

      //==================================================
      //==== SORT
      //==================================================

      const order = typeof req.query.ord === "string" ? req.query.ord : "";

      const sort = req.query.srt;

      const allowedOrder: Record<string, string> = {
        id: "al.id_audit_log",

        event_code: "al.event_code",

        category: "al.category",

        module: "al.module",

        action: "al.action",

        actor: "al.actor_label",

        entity: "al.entity_label",

        outcome: "al.outcome",

        http_status: "al.http_status",

        duration_ms: "al.duration_ms",

        created: "al.created",
      };

      const orderQuery = allowedOrder[order] ?? "al.id_audit_log";

      const sortQuery = sort === "asc" || sort === "false" ? "ASC" : "DESC";

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM audit_log al

            WHERE
              ${whereSql}
          `,
        params,
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              al.id_audit_log,

              al.id_master_comp,

              al.request_id,
              al.correlation_id,

              al.event_code,

              al.category,
              al.module,
              al.action,

              al.actor_type,
              al.actor_id,
              al.actor_label,

              al.entity_type,
              al.entity_id,
              al.entity_label,

              al.source,
              al.outcome,

              al.http_method,
              al.route_path,
              al.http_status,

              al.ip_address,

              al.duration_ms,

              al.integrity_version,

              CASE
                WHEN al.integrity_hash IS NOT NULL
                THEN 1
                ELSE 0
              END AS has_integrity,

              al.created

            FROM audit_log al

            WHERE
              ${whereSql}

            ORDER BY
              ${orderQuery}
              ${sortQuery}

            LIMIT ?
            OFFSET ?
          `,
        [...params, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
        id_audit_log: keyhsid.idAuditLog.encode(item.id_audit_log),

        id_master_comp:
          item.id_master_comp === null
            ? null
            : keyhsid.idMasterCompany.encode(item.id_master_comp),

        request_id: item.request_id,

        correlation_id: item.correlation_id,

        event_code: item.event_code,

        category: item.category,

        module: item.module,

        action: item.action,

        actor: {
          type: item.actor_type,

          id: item.actor_id,

          label: item.actor_label,
        },

        entity: {
          type: item.entity_type,

          id: item.entity_id,

          label: item.entity_label,
        },

        source: item.source,

        outcome: item.outcome,

        http: {
          method: item.http_method,

          route: item.route_path,

          status: item.http_status === null ? null : Number(item.http_status),
        },

        ip_address: item.ip_address,

        duration_ms:
          item.duration_ms === null ? null : Number(item.duration_ms),

        integrity_version: Number(item.integrity_version),

        has_integrity: Number(item.has_integrity) === 1,

        created: item.created,
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
      console.error("Get audit log list error:", error);

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
//==== AUDIT LOG - GET DETAIL
//==================================================

app.get(
  "/api/v1/audit-log/:id",

  verifyToken,

  requirePermission("audit_log.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      //==================================================
      //==== ID
      //==================================================

      const idAuditLog = decodeAuditLogId(req.params.id);

      if (!idAuditLog) {
        return sendError(
          res,
          400,
          "AUDIT_LOG_INVALID_ID",
          "Invalid audit log identifier",
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
              al.id_audit_log,

              al.id_master_comp,

              al.request_id,
              al.correlation_id,

              al.event_code,

              al.category,
              al.module,
              al.action,

              al.actor_type,
              al.actor_id,
              al.actor_label,

              al.entity_type,
              al.entity_id,
              al.entity_label,

              al.source,
              al.outcome,

              al.http_method,
              al.route_path,
              al.http_status,

              al.ip_address,
              al.user_agent,

              al.before_data,
              al.after_data,
              al.changed_fields,
              al.metadata,

              al.duration_ms,

              al.integrity_version,
              al.integrity_hash,

              al.created,

              LEFT(
                DATE_FORMAT(
                  al.created,
                  '%Y-%m-%d %H:%i:%s.%f'
                ),
                23
              ) AS created_integrity

            FROM audit_log al

            WHERE al.id_audit_log = ?

              AND ${companyScopeSql}

            LIMIT 1
          `,
        [idAuditLog, scope.idMasterComp, scope.idMasterComp],
      );

      const logs = rows as any[];

      if (!logs.length) {
        return sendError(
          res,
          404,
          "AUDIT_LOG_NOT_FOUND",
          "Audit log not found",
        );
      }

      const item = logs[0];

      //==================================================
      //==== JSON DATA
      //==================================================

      const beforeData = parseJsonValue(item.before_data);

      const afterData = parseJsonValue(item.after_data);

      const changedFields = parseJsonValue(item.changed_fields);

      const metadata = parseJsonValue(item.metadata);

      //==================================================
      //==== INTEGRITY PAYLOAD
      //==================================================

      const integrityPayload = {
        version: Number(item.integrity_version),

        id_master_comp:
          item.id_master_comp === null ? null : Number(item.id_master_comp),

        request_id: item.request_id,

        correlation_id: item.correlation_id,

        event_code: item.event_code,

        category: item.category,

        module: item.module,

        action: item.action,

        actor_type: item.actor_type,

        actor_id: item.actor_id === null ? null : String(item.actor_id),

        actor_label: item.actor_label,

        entity_type: item.entity_type,

        entity_id: item.entity_id === null ? null : String(item.entity_id),

        entity_label: item.entity_label,

        source: item.source,

        outcome: item.outcome,

        http_method: item.http_method,

        route_path: item.route_path,

        http_status:
          item.http_status === null ? null : Number(item.http_status),

        before_data: beforeData,

        after_data: afterData,

        changed_fields: changedFields,

        metadata,

        created: item.created_integrity,
      };

      //==================================================
      //==== INTEGRITY VERIFY
      //==================================================

      const integrityValid =
        Number(item.integrity_version) === 1 &&
        verifyAuditIntegrityHash(
          integrityPayload,

          item.integrity_hash ?? null,
        );

      //==================================================
      //==== RESPONSE
      //==================================================

      return res.status(200).json({
        success: true,

        data: {
          id_audit_log: keyhsid.idAuditLog.encode(item.id_audit_log),

          id_master_comp:
            item.id_master_comp === null
              ? null
              : keyhsid.idMasterCompany.encode(item.id_master_comp),

          request_id: item.request_id,

          correlation_id: item.correlation_id,

          event_code: item.event_code,

          category: item.category,

          module: item.module,

          action: item.action,

          actor: {
            type: item.actor_type,

            id: item.actor_id,

            label: item.actor_label,
          },

          entity: {
            type: item.entity_type,

            id: item.entity_id,

            label: item.entity_label,
          },

          source: item.source,

          outcome: item.outcome,

          http: {
            method: item.http_method,

            route: item.route_path,

            status: item.http_status === null ? null : Number(item.http_status),

            ip_address: item.ip_address,

            user_agent: item.user_agent,
          },

          changes: {
            before: beforeData,

            after: afterData,

            changed_fields: changedFields,
          },

          metadata,

          duration_ms:
            item.duration_ms === null ? null : Number(item.duration_ms),

          integrity: {
            version: Number(item.integrity_version),

            hash: item.integrity_hash,

            valid: integrityValid,
          },

          created: item.created,
        },
      });
    } catch (error) {
      console.error("Get audit log detail error:", error);

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
//==== ROUTER
//==================================================

export default app;
