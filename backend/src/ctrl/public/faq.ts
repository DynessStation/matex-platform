import { Router } from "express";
import { RowDataPacket } from "mysql2";

import { isPublicContentLocale } from "../../config/public-content.config";
import { pool } from "../../db";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();

router.get("/api/public/faq/:locale", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);
  const locale = String(req.params.locale ?? "");

  if (!Number.isSafeInteger(company) || company <= 0)
    return sendError(res, 503, "FAQ_UNAVAILABLE", "FAQ is not configured");
  if (!isPublicContentLocale(locale))
    return sendError(res, 404, "FAQ_NOT_FOUND", "FAQ not found");

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT f.faq_key AS faq_key, f.faq_sort_order AS sort_order,
          t.faq_question AS question, t.faq_answer AS answer,
          c.faq_category_key AS category_key,
          ct.faq_category_name AS category_name
        FROM faq f
        INNER JOIN faq_i18n t ON t.id_faq = f.id_faq
          AND t.id_master_comp = f.id_master_comp
          AND t.faq_locale = ? AND t.faq_i18n_status = 1
        LEFT JOIN faq_category c ON c.id_faq_category = f.id_faq_category
          AND c.id_master_comp = f.id_master_comp
          AND c.faq_category_status = 1 AND c.faq_category_deleted_at IS NULL
        LEFT JOIN faq_category_i18n ct ON ct.id_faq_category = c.id_faq_category
          AND ct.id_master_comp = c.id_master_comp
          AND ct.faq_category_locale = ? AND ct.faq_category_i18n_status = 1
        WHERE f.id_master_comp = ? AND f.faq_status = 1
          AND f.faq_deleted_at IS NULL
        ORDER BY COALESCE(c.faq_category_sort_order, 2147483647),
          f.faq_sort_order, f.id_faq
      `,
      [locale, locale, company],
    );

    return sendSuccess(res, 200, "FAQ_FOUND", "FAQ loaded", {
      locale,
      items: rows.map((row) => ({
        key: row.faq_key,
        question: row.question,
        answer: row.answer,
        category: row.category_key
          ? { key: row.category_key, name: row.category_name ?? row.category_key }
          : null,
      })),
    });
  } catch (error) {
    console.error("[Public FAQ] Failed to load", error);
    return sendError(res, 500, "FAQ_UNAVAILABLE", "Unable to load FAQ");
  }
});

export default router;
