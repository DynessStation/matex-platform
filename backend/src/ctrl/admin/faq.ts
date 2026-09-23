import express = require("express");
import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";

import db = require("../../db");
import keyhsid from "../../hsid";
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from "../../config/public-content.config";
import { getAdminScope } from "../../helper/admin-scope.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { writeAuditLog } from "../../helper/audit-log.helper";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";

const app = express();
const { pool } = db;

type TranslationInput = {
  locale: string;
  question: string;
  answer: string;
  status: 0 | 1;
};

const decodeFaqId = (value: unknown): number | null => {
  const decoded = keyhsid.idFaq.decode(String(value ?? ""));
  const id = Number(decoded[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const normalizeTranslations = (
  value: unknown,
): TranslationInput[] | null => {
  if (!Array.isArray(value)) return null;

  const result: TranslationInput[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const locale = String(item?.locale ?? "").trim();
    const question = String(item?.question ?? "").trim();
    const answer = String(item?.answer ?? "").trim();
    const status = Number(item?.status) === 0 ? 0 : 1;

    if (
      !isPublicContentLocale(locale) ||
      seen.has(locale) ||
      !question ||
      question.length > 500 ||
      !answer
    ) {
      return null;
    }

    seen.add(locale);
    result.push({ locale, question, answer, status });
  }

  return PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale))
    ? result
    : null;
};

const getPayload = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const sortOrder = Number(body?.sort_order ?? 0);
  const status = Number(body?.status) === 0 ? 0 : 1;
  const translations = normalizeTranslations(body?.translations);

  if (
    !key ||
    key.length > 100 ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    !translations
  ) {
    return null;
  }

  return { key, sortOrder, status, translations };
};

app.get(
  "/api/v1/faq",
  verifyToken,
  requirePermission("faq.view"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);

    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 15)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search ?? "").trim();
    const locale = isPublicContentLocale(req.query.locale)
      ? req.query.locale
      : "id-ID";
    const like = `%${search}%`;

    try {
      const [countRows] = await pool.query<RowDataPacket[]>(
        `
          SELECT COUNT(DISTINCT f.id_faq) AS total
          FROM faq f
          LEFT JOIN faq_i18n t ON t.id_faq = f.id_faq
            AND t.id_master_comp = f.id_master_comp
          WHERE f.id_master_comp = ? AND f.faq_deleted_at IS NULL
            AND (? = '' OR f.faq_key LIKE ? OR t.faq_question LIKE ?)
        `,
        [scope.idMasterComp, search, like, like],
      );

      const [rows] = await pool.query<RowDataPacket[]>(
        `
          SELECT f.id_faq, f.faq_key, f.faq_sort_order, f.faq_status,
            f.created, f.updated,
            requested.faq_question,
            requested.faq_answer,
            requested.faq_i18n_status,
            (SELECT COUNT(*) FROM faq_i18n complete
              WHERE complete.id_faq = f.id_faq
                AND complete.faq_i18n_status = 1) AS active_translation_count
          FROM faq f
          LEFT JOIN faq_i18n requested ON requested.id_faq = f.id_faq
            AND requested.id_master_comp = f.id_master_comp
            AND requested.faq_locale = ?
          WHERE f.id_master_comp = ? AND f.faq_deleted_at IS NULL
            AND (? = '' OR f.faq_key LIKE ? OR requested.faq_question LIKE ?)
          ORDER BY f.faq_sort_order, f.id_faq
          LIMIT ? OFFSET ?
        `,
        [locale, scope.idMasterComp, search, like, like, limit, offset],
      );

      return sendSuccess(res, 200, "FAQ_LISTED", "FAQ loaded", {
        data: rows.map((row) => ({
          id: keyhsid.idFaq.encode(Number(row.id_faq)),
          key: row.faq_key,
          question: row.faq_question ?? "",
          answer: row.faq_answer ?? "",
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
        },
      });
    } catch (error) {
      console.error("[FAQ] Failed to list", error);
      return sendError(res, 500, "FAQ_LIST_FAILED", "Unable to load FAQ");
    }
  },
);

app.get(
  "/api/v1/faq/:id",
  verifyToken,
  requirePermission("faq.view"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeFaqId(req.params.id);
    if (!idFaq) return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_faq, faq_key, faq_sort_order, faq_status, created, updated
       FROM faq WHERE id_faq = ? AND id_master_comp = ? AND faq_deleted_at IS NULL LIMIT 1`,
      [idFaq, scope.idMasterComp],
    );
    if (!rows.length) return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");

    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT faq_locale AS locale, faq_question AS question,
        faq_answer AS answer, faq_i18n_status AS status
       FROM faq_i18n WHERE id_faq = ? AND id_master_comp = ? ORDER BY faq_locale`,
      [idFaq, scope.idMasterComp],
    );

    return sendSuccess(res, 200, "FAQ_FOUND", "FAQ loaded", {
      id: keyhsid.idFaq.encode(idFaq),
      key: rows[0].faq_key,
      sort_order: Number(rows[0].faq_sort_order),
      status: Number(rows[0].faq_status),
      translations: translations.map((item) => ({
        ...item,
        status: Number(item.status),
      })),
      created: rows[0].created,
      updated: rows[0].updated,
    });
  },
);

app.post(
  "/api/v1/faq",
  verifyToken,
  requirePermission("faq.create"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);
    const payload = getPayload(req.body);
    if (!payload)
      return sendError(res, 400, "FAQ_PAYLOAD_INVALID", "Complete both FAQ languages");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO faq (id_master_comp, faq_key, faq_sort_order, faq_status,
          id_created_by, id_updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [scope.idMasterComp, payload.key, payload.sortOrder, payload.status,
          scope.idAdminAcct, scope.idAdminAcct],
      );
      for (const item of payload.translations) {
        await connection.query(
          `INSERT INTO faq_i18n (id_faq, id_master_comp, faq_locale,
            faq_question, faq_answer, faq_i18n_status) VALUES (?, ?, ?, ?, ?, ?)`,
          [insert.insertId, scope.idMasterComp, item.locale, item.question, item.answer, item.status],
        );
      }
      await writeAuditLog({
        req, connection, writeMode: "strict", idMasterComp: scope.idMasterComp,
        eventCode: "faq.created", category: "data_change", module: "faq",
        action: "create", actorType: "admin", actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null, entityType: "faq", entityId: insert.insertId,
        entityLabel: payload.key, after: payload, httpStatus: 201,
      });
      await connection.commit();
      return sendSuccess(res, 201, "FAQ_CREATED", "FAQ created successfully", {
        id: keyhsid.idFaq.encode(insert.insertId),
      });
    } catch (error: any) {
      await connection.rollback();
      if (error?.code === "ER_DUP_ENTRY")
        return sendError(res, 409, "FAQ_KEY_EXISTS", "FAQ key already exists");
      console.error("[FAQ] Failed to create", error);
      return sendError(res, 500, "FAQ_CREATE_FAILED", "Unable to create FAQ");
    } finally {
      connection.release();
    }
  },
);

app.put(
  "/api/v1/faq/:id",
  verifyToken,
  requirePermission("faq.update"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeFaqId(req.params.id);
    const payload = getPayload(req.body);
    if (!idFaq) return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");
    if (!payload)
      return sendError(res, 400, "FAQ_PAYLOAD_INVALID", "Complete both FAQ languages");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [beforeRows] = await connection.query<RowDataPacket[]>(
        `SELECT faq_key, faq_sort_order, faq_status FROM faq
         WHERE id_faq = ? AND id_master_comp = ? AND faq_deleted_at IS NULL FOR UPDATE`,
        [idFaq, scope.idMasterComp],
      );
      if (!beforeRows.length) {
        await connection.rollback();
        return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");
      }
      await connection.query(
        `UPDATE faq SET faq_key = ?, faq_sort_order = ?, faq_status = ?,
          id_updated_by = ?, updated = NOW() WHERE id_faq = ? AND id_master_comp = ?`,
        [payload.key, payload.sortOrder, payload.status, scope.idAdminAcct, idFaq, scope.idMasterComp],
      );
      for (const item of payload.translations) {
        await connection.query(
          `INSERT INTO faq_i18n (id_faq, id_master_comp, faq_locale,
            faq_question, faq_answer, faq_i18n_status) VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE faq_question = VALUES(faq_question),
            faq_answer = VALUES(faq_answer), faq_i18n_status = VALUES(faq_i18n_status),
            updated = NOW()`,
          [idFaq, scope.idMasterComp, item.locale, item.question, item.answer, item.status],
        );
      }
      await writeAuditLog({
        req, connection, writeMode: "strict", idMasterComp: scope.idMasterComp,
        eventCode: "faq.updated", category: "data_change", module: "faq",
        action: "update", actorType: "admin", actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null, entityType: "faq", entityId: idFaq,
        entityLabel: payload.key, before: beforeRows[0], after: payload, httpStatus: 200,
      });
      await connection.commit();
      return sendSuccess(res, 200, "FAQ_UPDATED", "FAQ updated successfully", {
        id: keyhsid.idFaq.encode(idFaq),
      });
    } catch (error: any) {
      await connection.rollback();
      if (error?.code === "ER_DUP_ENTRY")
        return sendError(res, 409, "FAQ_KEY_EXISTS", "FAQ key already exists");
      console.error("[FAQ] Failed to update", error);
      return sendError(res, 500, "FAQ_UPDATE_FAILED", "Unable to update FAQ");
    } finally {
      connection.release();
    }
  },
);

app.patch(
  "/api/v1/faq/:id/status",
  verifyToken,
  requirePermission("faq.update"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeFaqId(req.params.id);
    const status = Number(req.body?.status);
    if (!idFaq) return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");
    if (![0, 1].includes(status))
      return sendError(res, 400, "FAQ_STATUS_INVALID", "Invalid FAQ status");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [beforeRows] = await connection.query<RowDataPacket[]>(
        `SELECT faq_key, faq_status FROM faq WHERE id_faq = ? AND id_master_comp = ?
         AND faq_deleted_at IS NULL FOR UPDATE`, [idFaq, scope.idMasterComp],
      );
      if (!beforeRows.length) {
        await connection.rollback();
        return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");
      }
      await connection.query(
        `UPDATE faq SET faq_status = ?, id_updated_by = ?, updated = NOW()
         WHERE id_faq = ? AND id_master_comp = ?`,
        [status, scope.idAdminAcct, idFaq, scope.idMasterComp],
      );
      await writeAuditLog({
        req, connection, writeMode: "strict", idMasterComp: scope.idMasterComp,
        eventCode: "faq.status_updated", category: "data_change", module: "faq",
        action: "update_status", actorType: "admin", actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null, entityType: "faq", entityId: idFaq,
        entityLabel: beforeRows[0].faq_key, before: { status: Number(beforeRows[0].faq_status) },
        after: { status }, httpStatus: 200,
      });
      await connection.commit();
      return sendSuccess(res, 200, "FAQ_STATUS_UPDATED", "FAQ status updated", null);
    } catch (error) {
      await connection.rollback();
      console.error("[FAQ] Failed to update status", error);
      return sendError(res, 500, "FAQ_STATUS_UPDATE_FAILED", "Unable to update FAQ status");
    } finally { connection.release(); }
  },
);

app.delete(
  "/api/v1/faq/:id",
  verifyToken,
  requirePermission("faq.delete"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);
    const idFaq = decodeFaqId(req.params.id);
    if (!idFaq) return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [beforeRows] = await connection.query<RowDataPacket[]>(
        `SELECT faq_key, faq_status FROM faq WHERE id_faq = ? AND id_master_comp = ?
         AND faq_deleted_at IS NULL FOR UPDATE`, [idFaq, scope.idMasterComp],
      );
      if (!beforeRows.length) {
        await connection.rollback();
        return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");
      }
      await connection.query(
        `UPDATE faq SET faq_status = 0, faq_deleted_at = NOW(), id_updated_by = ?, updated = NOW()
         WHERE id_faq = ? AND id_master_comp = ?`,
        [scope.idAdminAcct, idFaq, scope.idMasterComp],
      );
      await writeAuditLog({
        req, connection, writeMode: "strict", idMasterComp: scope.idMasterComp,
        eventCode: "faq.deleted", category: "data_change", module: "faq",
        action: "delete", actorType: "admin", actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null, entityType: "faq", entityId: idFaq,
        entityLabel: beforeRows[0].faq_key, before: beforeRows[0],
        after: { deleted: true }, httpStatus: 200,
      });
      await connection.commit();
      return sendSuccess(res, 200, "FAQ_DELETED", "FAQ deleted successfully", null);
    } catch (error) {
      await connection.rollback();
      console.error("[FAQ] Failed to delete", error);
      return sendError(res, 500, "FAQ_DELETE_FAILED", "Unable to delete FAQ");
    } finally { connection.release(); }
  },
);

export default app;
