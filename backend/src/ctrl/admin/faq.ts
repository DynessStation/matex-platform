// FAQ (both languages per entry), under /api/v1/faq. The public list is ctrl/public/faq.ts.
// Positions are kept by the server (helper/sort-order.helper.ts): a new FAQ goes last, a deleted
// one closes its gap, and /order sets the whole order. /order is registered before /:id.
// Contract: ops/e2e/write/faq-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from '../../config/public-content.config';
import { AdminScope, getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { sortColumn, countOf } from '../../helper/list-query.helper';
import {
  assertSameItems,
  lockGroup,
  nextPosition,
  readOrderIds,
  renumber,
  SortGroup,
  writeOrder,
} from '../../helper/sort-order.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';
import type { RequestBody } from '../../helper/input.helper';

const router = express.Router();
const { pool } = db;

const SORTABLE: Record<string, string> = {
  question: 'requested.faq_question',
  key: 'f.faq_key',
  sort_order: 'f.faq_sort_order',
  created: 'f.created',
  status: 'f.faq_status',
};

const DUPLICATE_KEY = { code: 'FAQ_KEY_EXISTS', message: 'FAQ key already exists' };

type TranslationInput = {
  locale: string;
  question: string;
  answer: string;
  status: 0 | 1;
};

// Every supported language exactly once, each with a question and an answer.
const normalizeTranslations = (value: unknown): TranslationInput[] | null => {
  if (!Array.isArray(value)) return null;

  const result: TranslationInput[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const locale = String(item?.locale ?? '').trim();
    const question = String(item?.question ?? '').trim();
    const answer = String(item?.answer ?? '').trim();
    const status = Number(item?.status) === 0 ? 0 : 1;
    if (
      !isPublicContentLocale(locale) ||
      seen.has(locale) ||
      !question ||
      question.length > 500 ||
      !answer ||
      answer.length > 50000
    ) {
      return null;
    }
    seen.add(locale);
    result.push({ locale, question, answer, status });
  }

  return PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale)) ? result : null;
};

/** Live FAQ of the company, numbered 1..n. */
const faqGroup = (idMasterComp: number): SortGroup => ({
  table: 'faq',
  id: 'id_faq',
  column: 'faq_sort_order',
  where: 'id_master_comp = ? AND faq_deleted_at IS NULL',
  params: [idMasterComp],
});

// A sort_order in the body is ignored: positions come from the order list.
const getPayload = (body: RequestBody) => {
  const key = normalizePublicContentKey(body?.key);
  const status = Number(body?.status) === 0 ? 0 : 1;
  const translations = normalizeTranslations(body?.translations);
  if (!key || key.length > 100 || !translations) return null;
  return { key, status, translations };
};

const payloadInvalid = (res: Response) =>
  sendError(res, 400, 'FAQ_PAYLOAD_INVALID', 'Complete both FAQ languages');

const faqNotFound = (res: Response) => sendError(res, 404, 'FAQ_NOT_FOUND', 'FAQ not found');

const lockFaq = async (connection: PoolConnection, idFaq: number, idMasterComp: number) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT faq_key, faq_sort_order, faq_status FROM faq
     WHERE id_faq = ? AND id_master_comp = ? AND faq_deleted_at IS NULL FOR UPDATE`,
    [idFaq, idMasterComp],
  );
  if (!rows.length) throw new HttpError(404, 'FAQ_NOT_FOUND', 'FAQ not found');
  return rows[0];
};

const saveTranslations = async (
  connection: PoolConnection,
  idFaq: number,
  idMasterComp: number,
  translations: TranslationInput[],
) => {
  for (const item of translations) {
    await connection.query(
      `INSERT INTO faq_i18n (id_faq, id_master_comp, faq_locale,
        faq_question, faq_answer, faq_i18n_status) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE faq_question = VALUES(faq_question),
        faq_answer = VALUES(faq_answer), faq_i18n_status = VALUES(faq_i18n_status),
        updated = NOW()`,
      [idFaq, idMasterComp, item.locale, item.question, item.answer, item.status],
    );
  }
};

const auditBase = (
  req: AuthRequest,
  connection: PoolConnection,
  scope: AdminScope,
  idFaq: number,
) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  idMasterComp: scope.idMasterComp,
  category: 'data_change' as const,
  module: 'faq',
  actorType: 'admin' as const,
  actorId: scope.idAdminAcct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'faq',
  entityId: idFaq,
});

router.get(
  '/api/v1/faq',
  verifyToken,
  requirePermission('faq.view'),
  onFailure('FAQ_LIST_FAILED', 'Unable to load FAQ'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 15)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search ?? '').trim();
    const locale = isPublicContentLocale(req.query.locale) ? req.query.locale : 'id-ID';
    const like = `%${search}%`;
    const sortField = sortColumn(SORTABLE, req.query.field, '');
    const direction = String(req.query.sort ?? '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderBy = sortField
      ? `${sortField} ${direction}, f.id_faq ASC`
      : 'f.faq_sort_order ASC, f.id_faq ASC';

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT f.id_faq) AS total
       FROM faq f
       LEFT JOIN faq_i18n t ON t.id_faq = f.id_faq AND t.id_master_comp = f.id_master_comp
       WHERE f.id_master_comp = ? AND f.faq_deleted_at IS NULL
         AND (? = '' OR f.faq_key LIKE ? OR t.faq_question LIKE ?)`,
      [scope.idMasterComp, search, like, like],
    );

    // The question and answer come from the requested language.
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT f.id_faq, f.faq_key, f.faq_sort_order, f.faq_status, f.created, f.updated,
         requested.faq_question, requested.faq_answer, requested.faq_i18n_status,
         (SELECT COUNT(*) FROM faq_i18n complete
          WHERE complete.id_faq = f.id_faq AND complete.faq_i18n_status = 1)
           AS active_translation_count
       FROM faq f
       LEFT JOIN faq_i18n requested ON requested.id_faq = f.id_faq
         AND requested.id_master_comp = f.id_master_comp AND requested.faq_locale = ?
       WHERE f.id_master_comp = ? AND f.faq_deleted_at IS NULL
         AND (? = '' OR f.faq_key LIKE ? OR requested.faq_question LIKE ?)
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [locale, scope.idMasterComp, search, like, like, limit, offset],
    );

    return sendSuccess(res, 200, 'FAQ_LISTED', 'FAQ loaded', {
      data: rows.map((row) => ({
        id: keyhsid.idFaq.encode(Number(row.id_faq)),
        key: row.faq_key,
        question: row.faq_question ?? '',
        answer: row.faq_answer ?? '',
        sort_order: Number(row.faq_sort_order),
        status: Number(row.faq_status),
        locale_status: Number(row.faq_i18n_status ?? 0),
        translation_complete: Number(row.active_translation_count) === 2,
        created: row.created,
        updated: row.updated,
      })),
      pagination: {
        current_page: page,
        per_page: limit,
        total: Number(countRows[0]?.total ?? 0),
        total_all: await countOf(
          pool,
          `SELECT COUNT(*) AS total FROM faq WHERE id_master_comp = ? AND faq_deleted_at IS NULL`,
          [scope.idMasterComp],
        ),
      },
    });
  },
);

// Every live FAQ in its order, for the "Atur urutan" list.
router.get(
  '/api/v1/faq/order',
  verifyToken,
  requirePermission('faq.view'),
  onFailure('FAQ_ORDER_LOAD_FAILED', 'Unable to load FAQ order'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT f.id_faq, f.faq_key, f.faq_status, t.faq_question
       FROM faq f
       LEFT JOIN faq_i18n t ON t.id_faq = f.id_faq AND t.id_master_comp = f.id_master_comp
         AND t.faq_locale = 'id-ID'
       WHERE f.id_master_comp = ? AND f.faq_deleted_at IS NULL
       ORDER BY f.faq_sort_order, f.id_faq`,
      [scope.idMasterComp],
    );
    return sendSuccess(res, 200, 'FAQ_ORDER_FOUND', 'FAQ order loaded', {
      data: rows.map((row, index) => ({
        id: keyhsid.idFaq.encode(Number(row.id_faq)),
        key: row.faq_key,
        label: row.faq_question ?? row.faq_key,
        status: Number(row.faq_status),
        position: index + 1,
      })),
    });
  },
);

// `ids` lists every live FAQ once, first = position 1.
router.put(
  '/api/v1/faq/order',
  verifyToken,
  requirePermission('faq.update'),
  onFailure('FAQ_ORDER_FAILED', 'Unable to save FAQ order'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const ids = readOrderIds(req.body?.ids, keyhsid.idFaq, 'FAQ_ORDER');

    await withTransaction(pool, async (connection) => {
      const group = faqGroup(scope.idMasterComp);
      const current = await lockGroup(connection, group);
      assertSameItems(current, ids, 'FAQ_ORDER');
      await writeOrder(connection, group, ids);
      await writeAuditLog({
        ...auditBase(req, connection, scope, 0),
        entityId: null,
        eventCode: 'faq.reordered',
        action: 'reorder',
        before: { ids: current.map((row) => row.id) },
        after: { ids },
        metadata: { item_count: ids.length },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'FAQ_ORDER_SAVED', 'FAQ order saved', { item_count: ids.length });
  },
);

router.get(
  '/api/v1/faq/:id',
  verifyToken,
  requirePermission('faq.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeId(req.params.id, keyhsid.idFaq);
    if (!idFaq) return faqNotFound(res);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_faq, faq_key, faq_sort_order, faq_status, created, updated
       FROM faq WHERE id_faq = ? AND id_master_comp = ? AND faq_deleted_at IS NULL LIMIT 1`,
      [idFaq, scope.idMasterComp],
    );
    if (!rows.length) return faqNotFound(res);

    const [[place]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
         SUM(faq_sort_order < ? OR (faq_sort_order = ? AND id_faq <= ?)) AS position
       FROM faq WHERE id_master_comp = ? AND faq_deleted_at IS NULL`,
      [rows[0].faq_sort_order, rows[0].faq_sort_order, idFaq, scope.idMasterComp],
    );
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT faq_locale AS locale, faq_question AS question,
        faq_answer AS answer, faq_i18n_status AS status
       FROM faq_i18n WHERE id_faq = ? AND id_master_comp = ? ORDER BY faq_locale`,
      [idFaq, scope.idMasterComp],
    );

    return sendSuccess(res, 200, 'FAQ_FOUND', 'FAQ loaded', {
      id: keyhsid.idFaq.encode(idFaq),
      key: rows[0].faq_key,
      sort_order: Number(rows[0].faq_sort_order),
      position: Number(place.position),
      position_total: Number(place.total),
      status: Number(rows[0].faq_status),
      translations: translations.map((item) => ({ ...item, status: Number(item.status) })),
      created: rows[0].created,
      updated: rows[0].updated,
    });
  },
);

router.post(
  '/api/v1/faq',
  verifyToken,
  requirePermission('faq.create'),
  onFailure('FAQ_CREATE_FAILED', 'Unable to create FAQ', { duplicate: DUPLICATE_KEY }),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const payload = getPayload(req.body);
    if (!payload) return payloadInvalid(res);

    const idFaq = await withTransaction(pool, async (connection) => {
      const sortOrder = await nextPosition(connection, faqGroup(scope.idMasterComp));
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO faq (id_master_comp, faq_key, faq_sort_order, faq_status,
          id_created_by, id_updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          payload.key,
          sortOrder,
          payload.status,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      await saveTranslations(connection, insert.insertId, scope.idMasterComp, payload.translations);
      await writeAuditLog({
        ...auditBase(req, connection, scope, insert.insertId),
        eventCode: 'faq.created',
        action: 'create',
        entityLabel: payload.key,
        after: { ...payload, sortOrder },
        httpStatus: 201,
      });
      return insert.insertId;
    });

    return sendSuccess(res, 201, 'FAQ_CREATED', 'FAQ created successfully', {
      id: keyhsid.idFaq.encode(idFaq),
    });
  },
);

router.put(
  '/api/v1/faq/:id',
  verifyToken,
  requirePermission('faq.update'),
  onFailure('FAQ_UPDATE_FAILED', 'Unable to update FAQ', { duplicate: DUPLICATE_KEY }),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeId(req.params.id, keyhsid.idFaq);
    if (!idFaq) return faqNotFound(res);
    const payload = getPayload(req.body);
    if (!payload) return payloadInvalid(res);

    await withTransaction(pool, async (connection) => {
      const before = await lockFaq(connection, idFaq, scope.idMasterComp);
      await connection.query(
        `UPDATE faq SET faq_key = ?, faq_status = ?,
          id_updated_by = ?, updated = NOW() WHERE id_faq = ? AND id_master_comp = ?`,
        [payload.key, payload.status, scope.idAdminAcct, idFaq, scope.idMasterComp],
      );
      await saveTranslations(connection, idFaq, scope.idMasterComp, payload.translations);
      await writeAuditLog({
        ...auditBase(req, connection, scope, idFaq),
        eventCode: 'faq.updated',
        action: 'update',
        entityLabel: payload.key,
        before,
        after: { ...payload, sortOrder: Number(before.faq_sort_order) },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'FAQ_UPDATED', 'FAQ updated successfully', {
      id: keyhsid.idFaq.encode(idFaq),
    });
  },
);

router.patch(
  '/api/v1/faq/:id/status',
  verifyToken,
  requirePermission('faq.update'),
  onFailure('FAQ_STATUS_UPDATE_FAILED', 'Unable to update FAQ status'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeId(req.params.id, keyhsid.idFaq);
    const status = Number(req.body?.status);
    if (!idFaq) return faqNotFound(res);
    if (![0, 1].includes(status)) {
      return sendError(res, 400, 'FAQ_STATUS_INVALID', 'Invalid FAQ status');
    }

    await withTransaction(pool, async (connection) => {
      const before = await lockFaq(connection, idFaq, scope.idMasterComp);
      await connection.query(
        `UPDATE faq SET faq_status = ?, id_updated_by = ?, updated = NOW()
         WHERE id_faq = ? AND id_master_comp = ?`,
        [status, scope.idAdminAcct, idFaq, scope.idMasterComp],
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope, idFaq),
        eventCode: 'faq.status_updated',
        action: 'update_status',
        entityLabel: before.faq_key,
        before: { status: Number(before.faq_status) },
        after: { status },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'FAQ_STATUS_UPDATED', 'FAQ status updated', null);
  },
);

// Soft delete: the row stays (hidden from every list) and keeps its key reserved.
router.delete(
  '/api/v1/faq/:id',
  verifyToken,
  requirePermission('faq.delete'),
  onFailure('FAQ_DELETE_FAILED', 'Unable to delete FAQ'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeId(req.params.id, keyhsid.idFaq);
    if (!idFaq) return faqNotFound(res);

    await withTransaction(pool, async (connection) => {
      const before = await lockFaq(connection, idFaq, scope.idMasterComp);
      await connection.query(
        `UPDATE faq SET faq_status = 0, faq_deleted_at = NOW(), id_updated_by = ?, updated = NOW()
         WHERE id_faq = ? AND id_master_comp = ?`,
        [scope.idAdminAcct, idFaq, scope.idMasterComp],
      );
      await renumber(connection, faqGroup(scope.idMasterComp));
      await writeAuditLog({
        ...auditBase(req, connection, scope, idFaq),
        eventCode: 'faq.deleted',
        action: 'delete',
        entityLabel: before.faq_key,
        before: { faq_key: before.faq_key, faq_status: before.faq_status },
        after: { deleted: true },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'FAQ_DELETED', 'FAQ deleted successfully', null);
  },
);

export default router;
