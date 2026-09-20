import { randomUUID } from "crypto";

import { ResultSetHeader } from "mysql2";

import db = require("../db");

import {
  AuditSource,
  WriteAuditLogOptions,
  WriteAuditLogResult,
} from "../interface/audit-log.interface";

import { getChangedFields } from "./audit-diff.helper";

import { createAuditIntegrityHash } from "./audit-integrity.helper";

import { sanitizeAuditData } from "./audit-sanitizer.helper";

//==================================================
//==== DATABASE
//==================================================

const { pool } = db;

//==================================================
//==== JSON
//==================================================

const toJson = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

//==================================================
//==== STRING VALUE
//==================================================

const toStringValue = (
  value: string | number | null | undefined,
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

//==================================================
//==== DATABASE DATETIME
//==================================================

const getDatabaseDateTime = (value: Date): string => {
  return value.toISOString().slice(0, 23).replace("T", " ");
};

//==================================================
//==== ROUTE PATH
//==================================================

const getRoutePath = (options: WriteAuditLogOptions): string | null => {
  const req = options.req;

  if (!req) {
    return null;
  }

  /**
   * Jangan simpan query string.
   *
   * Contoh berbahaya:
   *
   * /reset-password?token=SECRET
   *
   * Yang masuk audit cukup:
   *
   * /reset-password
   */
  const originalUrl = req.originalUrl;

  if (typeof originalUrl === "string" && originalUrl) {
    return originalUrl.split("?")[0] || null;
  }

  return req.path || null;
};

//==================================================
//==== IP
//==================================================

const getIpAddress = (options: WriteAuditLogOptions): string | null => {
  const req = options.req;

  if (!req) {
    return null;
  }

  /**
   * Jangan parse X-Forwarded-For manual.
   *
   * Production reverse proxy akan
   * dikonfigurasi melalui Express
   * trust proxy secara terkontrol.
   */
  return req.ip || req.socket?.remoteAddress || null;
};

//==================================================
//==== SOURCE
//==================================================

const getSource = (options: WriteAuditLogOptions): AuditSource => {
  if (options.source) {
    return options.source;
  }

  const source = options.req?.auditContext?.source;

  switch (source) {
    case "admin_web":
    case "public_web":
    case "api":
    case "system":
    case "job":
    case "integration":
      return source;

    default:
      return options.req ? "api" : "system";
  }
};

//==================================================
//==== WRITE AUDIT LOG
//==================================================

export const writeAuditLog = async (
  options: WriteAuditLogOptions,
): Promise<WriteAuditLogResult> => {
  const req = options.req;

  //==================================================
  //==== REQUEST CONTEXT
  //==================================================

  const requestId = req?.auditContext?.requestId ?? randomUUID();

  const correlationId = req?.auditContext?.correlationId ?? requestId;

  const startedAt = req?.auditContext?.startedAt ?? Date.now();

  //==================================================
  //==== CREATED
  //==================================================

  const createdDate = new Date();

  const created = getDatabaseDateTime(createdDate);

  //==================================================
  //==== SANITIZE
  //==================================================

  const sanitizedBefore = sanitizeAuditData(options.before);

  const sanitizedAfter = sanitizeAuditData(options.after);

  const sanitizedMetadata = sanitizeAuditData(options.metadata);

  //==================================================
  //==== DIFF
  //==================================================

  const changedFields =
    options.changedFields ??
    (options.before !== undefined && options.after !== undefined
      ? getChangedFields(sanitizedBefore, sanitizedAfter)
      : null);

  //==================================================
  //==== ACTOR
  //==================================================

  const actorType =
    options.actorType ?? (req?.user?.id_admin_acct ? "admin" : "system");

  const actorId = options.actorId ?? req?.user?.id_admin_acct ?? null;

  const actorLabel = options.actorLabel ?? req?.user?.alias ?? null;

  //==================================================
  //==== SOURCE / OUTCOME
  //==================================================

  const source = getSource(options);

  const outcome = options.outcome ?? "success";

  //==================================================
  //==== HTTP
  //==================================================

  const routePath = getRoutePath(options);

  const durationMs = Math.max(
    0,

    Date.now() - startedAt,
  );

  //==================================================
  //==== INTEGRITY PAYLOAD
  //==================================================

  const integrityPayload = {
    version: 1,

    id_master_comp: options.idMasterComp ?? null,

    request_id: requestId,

    correlation_id: correlationId,

    event_code: options.eventCode,

    category: options.category,

    module: options.module,

    action: options.action,

    actor_type: actorType,

    actor_id: toStringValue(actorId),

    actor_label: actorLabel,

    entity_type: options.entityType ?? null,

    entity_id: toStringValue(options.entityId),

    entity_label: options.entityLabel ?? null,

    source,

    outcome,

    http_method: req?.method ?? null,

    route_path: routePath,

    http_status: options.httpStatus ?? null,

    before_data: sanitizedBefore ?? null,

    after_data: sanitizedAfter ?? null,

    changed_fields: changedFields,

    metadata: sanitizedMetadata ?? null,

    created,
  };

  //==================================================
  //==== HASH
  //==================================================

  const integrityHash = createAuditIntegrityHash(integrityPayload);

  //==================================================
  //==== QUERY
  //==================================================

  const query = `
      INSERT INTO audit_log
      (
        id_master_comp,

        request_id,
        correlation_id,

        event_code,

        category,
        module,
        action,

        actor_type,
        actor_id,
        actor_label,

        entity_type,
        entity_id,
        entity_label,

        source,
        outcome,

        http_method,
        route_path,
        http_status,

        ip_address,
        user_agent,

        before_data,
        after_data,
        changed_fields,
        metadata,

        duration_ms,

        integrity_version,
        integrity_hash,

        created
      )
      VALUES
      (
        ?,

        ?,
        ?,

        ?,

        ?,
        ?,
        ?,

        ?,
        ?,
        ?,

        ?,
        ?,
        ?,

        ?,
        ?,

        ?,
        ?,
        ?,

        ?,
        ?,

        ?,
        ?,
        ?,
        ?,

        ?,

        1,
        ?,

        ?
      )
    `;

  //==================================================
  //==== PARAMS
  //==================================================

  const params = [
    options.idMasterComp ?? null,

    requestId,

    correlationId,

    options.eventCode,

    options.category,

    options.module,

    options.action,

    actorType,

    toStringValue(actorId),

    actorLabel,

    options.entityType ?? null,

    toStringValue(options.entityId),

    options.entityLabel ?? null,

    source,

    outcome,

    req?.method ?? null,

    routePath,

    options.httpStatus ?? null,

    getIpAddress(options),

    req?.get("user-agent") ?? null,

    toJson(sanitizedBefore),

    toJson(sanitizedAfter),

    toJson(changedFields),

    toJson(sanitizedMetadata),

    durationMs,

    integrityHash,

    created,
  ];

  //==================================================
  //==== EXECUTE
  //==================================================

  try {
    const executor = options.connection ?? pool;

    const [result] = await executor.query(query, params);

    const insertResult = result as ResultSetHeader;

    return {
      success: true,

      idAuditLog: Number(insertResult.insertId),

      requestId,

      correlationId,

      integrityHash,
    };
  } catch (error) {
    console.error("Audit log write error:", error);

    //==================================================
    //==== STRICT MODE
    //==================================================

    if (options.writeMode === "strict") {
      throw error;
    }

    //==================================================
    //==== BEST EFFORT
    //==================================================

    return {
      success: false,

      requestId,

      correlationId,

      integrityHash,
    };
  }
};
