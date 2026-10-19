// Audit log (read only), under /api/v1/audit-log.
// Contract: ops/e2e/write/audit-log-api.spec.ts.
import express = require('express');
import { Response } from 'express';

import db = require('../../db');
import keyhsid from '../../hsid';
import { AuditCategory, AuditOutcome, AuditSource } from '../../interface/audit-log.interface';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError } from '../../helper/api-response.helper';
import { verifyAuditIntegrityHash } from '../../helper/audit-integrity.helper';
import { decodeId } from '../../helper/id.helper';
import { parseJsonValue } from '../../helper/json.helper';
import { parseListQuery, sortColumn, sortDirection } from '../../helper/list-query.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';

const { pool } = db;

const router = express.Router();

const CATEGORIES: readonly AuditCategory[] = [
  'data_change',
  'security',
  'access_control',
  'file',
  'system',
  'business',
  'integration',
];
const OUTCOMES: readonly AuditOutcome[] = ['success', 'failure', 'denied'];
const SOURCES: readonly AuditSource[] = [
  'admin_web',
  'public_web',
  'api',
  'system',
  'job',
  'integration',
];

const SORTABLE: Record<string, string> = {
  id: 'al.id_audit_log',
  event_code: 'al.event_code',
  category: 'al.category',
  module: 'al.module',
  action: 'al.action',
  actor: 'al.actor_label',
  entity: 'al.entity_label',
  outcome: 'al.outcome',
  http_status: 'al.http_status',
  duration_ms: 'al.duration_ms',
  created: 'al.created',
};

// Query parameter -> column for exact-match filters.
const EXACT_FILTERS: Record<string, string> = {
  module: 'al.module',
  action: 'al.action',
  event_code: 'al.event_code',
  actor_type: 'al.actor_type',
  actor_id: 'al.actor_id',
  entity_type: 'al.entity_type',
  entity_id: 'al.entity_id',
  request_id: 'al.request_id',
  correlation_id: 'al.correlation_id',
};

const SEARCH = `(al.event_code LIKE ? OR al.module LIKE ? OR al.action LIKE ?
  OR COALESCE(al.actor_label, '') LIKE ? OR COALESCE(al.entity_label, '') LIKE ?
  OR COALESCE(al.route_path, '') LIKE ? OR al.request_id LIKE ?
  OR COALESCE(al.correlation_id, '') LIKE ?)`;

// Entries of the admin's company, plus global entries (no company, e.g. admin_permission.*)
// made by an admin of that company. Takes the company id twice.
const COMPANY_SCOPE = `(al.id_master_comp = ?
  OR (al.id_master_comp IS NULL AND al.actor_type = 'admin' AND EXISTS (
    SELECT 1 FROM admin_acct scope_actor
    WHERE scope_actor.id_admin_acct = CAST(al.actor_id AS UNSIGNED)
      AND scope_actor.id_master_comp = ?
    LIMIT 1)))`;

const LIST_COLUMNS = `al.id_audit_log, al.id_master_comp, al.request_id, al.correlation_id,
  al.event_code, al.category, al.module, al.action, al.actor_type, al.actor_id, al.actor_label,
  al.entity_type, al.entity_id, al.entity_label, al.source, al.outcome, al.http_method,
  al.route_path, al.http_status, al.ip_address, al.duration_ms, al.integrity_version, al.created`;

const queryText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const queryEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | null => {
  const text = queryText(value);
  return text && allowed.includes(text as T) ? (text as T) : null;
};

/** A date (YYYY-MM-DD, as UTC start or end of day) or datetime as a MySQL datetime, else null. */
const queryDate = (value: unknown, endOfDay = false): string | null => {
  const text = queryText(value);
  if (!text) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const parsed = new Date(
    dateOnly ? `${text}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}` : text,
  );
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 23).replace('T', ' ');
};

const nullableNumber = (value: unknown) => (value === null ? null : Number(value));

const companyId = (value: unknown) =>
  value === null ? null : keyhsid.idMasterCompany.encode(value as number);

/** Fields shared by the list and the detail. */
const entryDto = (item: any) => ({
  id_audit_log: keyhsid.idAuditLog.encode(item.id_audit_log),
  id_master_comp: companyId(item.id_master_comp),
  request_id: item.request_id,
  correlation_id: item.correlation_id,
  event_code: item.event_code,
  category: item.category,
  module: item.module,
  action: item.action,
  actor: { type: item.actor_type, id: item.actor_id, label: item.actor_label },
  entity: { type: item.entity_type, id: item.entity_id, label: item.entity_label },
  source: item.source,
  outcome: item.outcome,
});

router.get(
  '/api/v1/audit-log',
  verifyToken,
  requirePermission('audit_log.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const { page, limit, offset, searchValue } = parseListQuery(req.query, { defaultLimit: 20 });

    const where = [COMPANY_SCOPE, SEARCH];
    const params: unknown[] = [
      scope.idMasterComp,
      scope.idMasterComp,
      ...Array(8).fill(searchValue),
    ];
    const filter = (column: string, value: unknown) => {
      if (value === null) return;
      where.push(column);
      params.push(value);
    };
    filter('al.category = ?', queryEnum(req.query.category, CATEGORIES));
    filter('al.outcome = ?', queryEnum(req.query.outcome, OUTCOMES));
    filter('al.source = ?', queryEnum(req.query.source, SOURCES));
    for (const [key, column] of Object.entries(EXACT_FILTERS)) {
      filter(`${column} = ?`, queryText(req.query[key]));
    }
    filter('al.created >= ?', queryDate(req.query.date_from));
    filter('al.created <= ?', queryDate(req.query.date_to, true));
    const whereSql = where.join(' AND ');

    const orderBy = sortColumn(SORTABLE, req.query.ord, 'al.id_audit_log');
    const direction = sortDirection(req.query.srt, 'DESC');

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_log al WHERE ${whereSql}`,
      params,
    );
    const total = Number((totalRows as any[])[0]?.total ?? 0);

    const [rows] = await pool.query(
      `SELECT ${LIST_COLUMNS},
         CASE WHEN al.integrity_hash IS NOT NULL THEN 1 ELSE 0 END AS has_integrity
       FROM audit_log al
       WHERE ${whereSql}
       ORDER BY ${orderBy} ${direction}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const data = (rows as any[]).map((item) => ({
      ...entryDto(item),
      http: {
        method: item.http_method,
        route: item.route_path,
        status: nullableNumber(item.http_status),
      },
      ip_address: item.ip_address,
      duration_ms: nullableNumber(item.duration_ms),
      integrity_version: Number(item.integrity_version),
      has_integrity: Number(item.has_integrity) === 1,
      created: item.created,
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
  },
);

// The detail re-checks the entry's integrity hash.
router.get(
  '/api/v1/audit-log/:id',
  verifyToken,
  requirePermission('audit_log.view'),
  async (req: AuthRequest, res: Response) => {
    const idAuditLog = decodeId(req.params.id, keyhsid.idAuditLog);
    if (!idAuditLog) {
      return sendError(res, 400, 'AUDIT_LOG_INVALID_ID', 'Invalid audit log identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query(
      `SELECT ${LIST_COLUMNS}, al.user_agent, al.before_data, al.after_data, al.changed_fields,
         al.metadata, al.integrity_hash,
         LEFT(DATE_FORMAT(al.created, '%Y-%m-%d %H:%i:%s.%f'), 23) AS created_integrity
       FROM audit_log al
       WHERE al.id_audit_log = ? AND ${COMPANY_SCOPE}
       LIMIT 1`,
      [idAuditLog, scope.idMasterComp, scope.idMasterComp],
    );
    const item = (rows as any[])[0];
    if (!item) return sendError(res, 404, 'AUDIT_LOG_NOT_FOUND', 'Audit log not found');

    const beforeData = parseJsonValue(item.before_data, { onInvalid: 'raw' });
    const afterData = parseJsonValue(item.after_data, { onInvalid: 'raw' });
    const changedFields = parseJsonValue(item.changed_fields, { onInvalid: 'raw' });
    const metadata = parseJsonValue(item.metadata, { onInvalid: 'raw' });

    // The fields the hash was computed over, in the form audit-log.helper wrote them.
    const integrityPayload = {
      version: Number(item.integrity_version),
      id_master_comp: nullableNumber(item.id_master_comp),
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
      http_status: nullableNumber(item.http_status),
      before_data: beforeData,
      after_data: afterData,
      changed_fields: changedFields,
      metadata,
      created: item.created_integrity,
    };
    const integrityValid =
      Number(item.integrity_version) === 1 &&
      verifyAuditIntegrityHash(integrityPayload, item.integrity_hash ?? null);

    return res.status(200).json({
      success: true,
      data: {
        ...entryDto(item),
        http: {
          method: item.http_method,
          route: item.route_path,
          status: nullableNumber(item.http_status),
          ip_address: item.ip_address,
          user_agent: item.user_agent,
        },
        changes: { before: beforeData, after: afterData, changed_fields: changedFields },
        metadata,
        duration_ms: nullableNumber(item.duration_ms),
        integrity: {
          version: Number(item.integrity_version),
          hash: item.integrity_hash,
          valid: integrityValid,
        },
        created: item.created,
      },
    });
  },
);

export default router;
