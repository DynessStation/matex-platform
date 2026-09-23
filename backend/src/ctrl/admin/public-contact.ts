import express = require("express");
import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";

import db = require("../../db");
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContactChannelType,
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

const normalizeUrl = (value: unknown): string | null | undefined => {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  try {
    const parsed = new URL(clean);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

const normalizeTranslations = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const result: Array<{ locale: string; label: string; description: string | null; status: 0 | 1 }> = [];
  const seen = new Set<string>();
  for (const item of value) {
    const locale = String(item?.locale ?? "").trim();
    const label = String(item?.label ?? "").trim();
    const description = String(item?.description ?? "").trim() || null;
    if (!isPublicContentLocale(locale) || seen.has(locale) || !label || label.length > 255)
      return null;
    seen.add(locale);
    result.push({ locale, label, description, status: Number(item?.status) === 0 ? 0 : 1 });
  }
  return PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale)) ? result : null;
};

const normalizeChannels = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 30) return null;
  const result: any[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const key = normalizePublicContentKey(item?.key);
    const type = item?.type;
    const channelValue = String(item?.value ?? "").trim();
    const url = ["whatsapp", "email", "phone"].includes(type)
      ? null
      : normalizeUrl(item?.url);
    const translations = normalizeTranslations(item?.translations);
    if (!key || key.length > 100 || seen.has(key) || !isPublicContactChannelType(type) ||
      !channelValue || channelValue.length > 500 || url === undefined || !translations)
      return null;
    if (type === "whatsapp" && !/^\+[1-9]\d{7,14}$/.test(channelValue)) return null;
    seen.add(key);
    result.push({
      key, type, value: channelValue, url,
      isPrimary: Number(item?.is_primary) === 1 ? 1 : 0,
      isPublic: Number(item?.is_public) === 0 ? 0 : 1,
      sortOrder: Number.isSafeInteger(Number(item?.sort_order)) ? Math.max(0, Number(item.sort_order)) : index,
      translations,
    });
  }
  return result;
};

const normalizeTopics = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 30) return null;
  const result: any[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const key = normalizePublicContentKey(item?.key);
    const email = String(item?.recipient_email ?? "").trim() || null;
    const translations = normalizeTranslations(item?.translations);
    if (!key || key.length > 100 || seen.has(key) ||
      (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !translations)
      return null;
    seen.add(key);
    result.push({
      key, email,
      sortOrder: Number.isSafeInteger(Number(item?.sort_order)) ? Math.max(0, Number(item.sort_order)) : index,
      status: Number(item?.status) === 0 ? 0 : 1,
      translations,
    });
  }
  return result;
};

const loadSettings = async (idMasterComp: number) => {
  const [channelRows] = await pool.query<RowDataPacket[]>(
    `SELECT id_public_contact_channel, public_contact_channel_key,
      public_contact_channel_type, public_contact_channel_value,
      public_contact_channel_url, public_contact_channel_is_primary,
      public_contact_channel_is_public, public_contact_channel_sort_order
     FROM public_contact_channel WHERE id_master_comp = ?
      AND public_contact_channel_deleted_at IS NULL
     ORDER BY public_contact_channel_sort_order, id_public_contact_channel`,
    [idMasterComp],
  );
  const [channelTranslations] = await pool.query<RowDataPacket[]>(
    `SELECT t.id_public_contact_channel, t.public_contact_channel_locale AS locale,
      t.public_contact_channel_label AS label,
      t.public_contact_channel_description AS description,
      t.public_contact_channel_i18n_status AS status
     FROM public_contact_channel_i18n t
     INNER JOIN public_contact_channel c ON c.id_public_contact_channel = t.id_public_contact_channel
      AND c.id_master_comp = t.id_master_comp
     WHERE t.id_master_comp = ? AND c.public_contact_channel_deleted_at IS NULL
     ORDER BY t.public_contact_channel_locale`,
    [idMasterComp],
  );
  const [topicRows] = await pool.query<RowDataPacket[]>(
    `SELECT id_contact_inquiry_topic, contact_inquiry_topic_key,
      contact_inquiry_topic_recipient_email, contact_inquiry_topic_sort_order,
      contact_inquiry_topic_status
     FROM contact_inquiry_topic WHERE id_master_comp = ?
     ORDER BY contact_inquiry_topic_sort_order, id_contact_inquiry_topic`,
    [idMasterComp],
  );
  const [topicTranslations] = await pool.query<RowDataPacket[]>(
    `SELECT t.id_contact_inquiry_topic, t.contact_inquiry_topic_locale AS locale,
      t.contact_inquiry_topic_label AS label, NULL AS description,
      t.contact_inquiry_topic_i18n_status AS status
     FROM contact_inquiry_topic_i18n t
     INNER JOIN contact_inquiry_topic q ON q.id_contact_inquiry_topic = t.id_contact_inquiry_topic
      AND q.id_master_comp = t.id_master_comp
     WHERE t.id_master_comp = ? ORDER BY t.contact_inquiry_topic_locale`,
    [idMasterComp],
  );
  const group = (rows: RowDataPacket[], key: string) => {
    const map = new Map<number, any[]>();
    for (const row of rows) {
      const id = Number(row[key]);
      const values = map.get(id) ?? [];
      values.push({ locale: row.locale, label: row.label, description: row.description, status: Number(row.status) });
      map.set(id, values);
    }
    return map;
  };
  const channelI18n = group(channelTranslations, "id_public_contact_channel");
  const topicI18n = group(topicTranslations, "id_contact_inquiry_topic");
  return {
    channels: channelRows.map((row) => ({
      key: row.public_contact_channel_key, type: row.public_contact_channel_type,
      value: row.public_contact_channel_value, url: row.public_contact_channel_url,
      is_primary: Number(row.public_contact_channel_is_primary),
      is_public: Number(row.public_contact_channel_is_public),
      sort_order: Number(row.public_contact_channel_sort_order),
      translations: channelI18n.get(Number(row.id_public_contact_channel)) ?? [],
    })),
    topics: topicRows.map((row) => ({
      key: row.contact_inquiry_topic_key,
      recipient_email: row.contact_inquiry_topic_recipient_email,
      sort_order: Number(row.contact_inquiry_topic_sort_order),
      status: Number(row.contact_inquiry_topic_status),
      translations: topicI18n.get(Number(row.id_contact_inquiry_topic)) ?? [],
    })),
  };
};

app.get(
  "/api/v1/public-contact",
  verifyToken,
  requirePermission("public_contact.view"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    try {
      return sendSuccess(res, 200, "PUBLIC_CONTACT_FOUND", "Contact settings loaded", await loadSettings(scope.idMasterComp));
    } catch (error) {
      console.error("[Public Contact] Failed to load settings", error);
      return sendError(res, 500, "PUBLIC_CONTACT_LOAD_FAILED", "Unable to load contact settings");
    }
  },
);

app.put(
  "/api/v1/public-contact",
  verifyToken,
  requirePermission("public_contact.update"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const channels = normalizeChannels(req.body?.channels);
    const topics = normalizeTopics(req.body?.topics);
    if (!channels || !topics)
      return sendError(res, 400, "PUBLIC_CONTACT_PAYLOAD_INVALID", "Contact settings are incomplete or invalid");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const before = await loadSettings(scope.idMasterComp);
      const channelKeys = channels.map((item) => item.key);
      if (channelKeys.length) {
        await connection.query(
          `UPDATE public_contact_channel SET public_contact_channel_deleted_at = NOW(),
            public_contact_channel_is_public = 0, id_updated_by = ?, updated = NOW()
           WHERE id_master_comp = ? AND public_contact_channel_deleted_at IS NULL
            AND public_contact_channel_key NOT IN (${channelKeys.map(() => "?").join(",")})`,
          [scope.idAdminAcct, scope.idMasterComp, ...channelKeys],
        );
      } else {
        await connection.query(
          `UPDATE public_contact_channel SET public_contact_channel_deleted_at = NOW(),
            public_contact_channel_is_public = 0, id_updated_by = ?, updated = NOW()
           WHERE id_master_comp = ? AND public_contact_channel_deleted_at IS NULL`,
          [scope.idAdminAcct, scope.idMasterComp],
        );
      }
      for (const item of channels) {
        await connection.query(
          `INSERT INTO public_contact_channel (id_master_comp, public_contact_channel_key,
            public_contact_channel_type, public_contact_channel_value, public_contact_channel_url,
            public_contact_channel_is_primary, public_contact_channel_is_public,
            public_contact_channel_sort_order, id_created_by, id_updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE public_contact_channel_type = VALUES(public_contact_channel_type),
            public_contact_channel_value = VALUES(public_contact_channel_value),
            public_contact_channel_url = VALUES(public_contact_channel_url),
            public_contact_channel_is_primary = VALUES(public_contact_channel_is_primary),
            public_contact_channel_is_public = VALUES(public_contact_channel_is_public),
            public_contact_channel_sort_order = VALUES(public_contact_channel_sort_order),
            id_updated_by = VALUES(id_updated_by), public_contact_channel_deleted_at = NULL,
            updated = NOW()`,
          [scope.idMasterComp, item.key, item.type, item.value, item.url, item.isPrimary,
            item.isPublic, item.sortOrder, scope.idAdminAcct, scope.idAdminAcct],
        );
        const [idRows] = await connection.query<RowDataPacket[]>(
          `SELECT id_public_contact_channel FROM public_contact_channel
           WHERE id_master_comp = ? AND public_contact_channel_key = ? LIMIT 1`,
          [scope.idMasterComp, item.key],
        );
        for (const translation of item.translations) {
          await connection.query(
            `INSERT INTO public_contact_channel_i18n (id_public_contact_channel,
              id_master_comp, public_contact_channel_locale, public_contact_channel_label,
              public_contact_channel_description, public_contact_channel_i18n_status)
             VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
              public_contact_channel_label = VALUES(public_contact_channel_label),
              public_contact_channel_description = VALUES(public_contact_channel_description),
              public_contact_channel_i18n_status = VALUES(public_contact_channel_i18n_status),
              updated = NOW()`,
            [idRows[0].id_public_contact_channel, scope.idMasterComp, translation.locale,
              translation.label, translation.description, translation.status],
          );
        }
      }
      const topicKeys = topics.map((item) => item.key);
      if (topicKeys.length) {
        await connection.query(
          `UPDATE contact_inquiry_topic SET contact_inquiry_topic_status = 0,
            id_updated_by = ?, updated = NOW() WHERE id_master_comp = ?
            AND contact_inquiry_topic_key NOT IN (${topicKeys.map(() => "?").join(",")})`,
          [scope.idAdminAcct, scope.idMasterComp, ...topicKeys],
        );
      } else {
        await connection.query(
          `UPDATE contact_inquiry_topic SET contact_inquiry_topic_status = 0,
            id_updated_by = ?, updated = NOW() WHERE id_master_comp = ?`,
          [scope.idAdminAcct, scope.idMasterComp],
        );
      }
      for (const item of topics) {
        await connection.query(
          `INSERT INTO contact_inquiry_topic (id_master_comp, contact_inquiry_topic_key,
            contact_inquiry_topic_recipient_email, contact_inquiry_topic_sort_order,
            contact_inquiry_topic_status, id_created_by, id_updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
            contact_inquiry_topic_recipient_email = VALUES(contact_inquiry_topic_recipient_email),
            contact_inquiry_topic_sort_order = VALUES(contact_inquiry_topic_sort_order),
            contact_inquiry_topic_status = VALUES(contact_inquiry_topic_status),
            id_updated_by = VALUES(id_updated_by), updated = NOW()`,
          [scope.idMasterComp, item.key, item.email, item.sortOrder, item.status,
            scope.idAdminAcct, scope.idAdminAcct],
        );
        const [idRows] = await connection.query<RowDataPacket[]>(
          `SELECT id_contact_inquiry_topic FROM contact_inquiry_topic
           WHERE id_master_comp = ? AND contact_inquiry_topic_key = ? LIMIT 1`,
          [scope.idMasterComp, item.key],
        );
        for (const translation of item.translations) {
          await connection.query(
            `INSERT INTO contact_inquiry_topic_i18n (id_contact_inquiry_topic,
              id_master_comp, contact_inquiry_topic_locale, contact_inquiry_topic_label,
              contact_inquiry_topic_i18n_status) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE contact_inquiry_topic_label = VALUES(contact_inquiry_topic_label),
              contact_inquiry_topic_i18n_status = VALUES(contact_inquiry_topic_i18n_status), updated = NOW()`,
            [idRows[0].id_contact_inquiry_topic, scope.idMasterComp, translation.locale,
              translation.label, translation.status],
          );
        }
      }
      await writeAuditLog({
        req, connection, writeMode: "strict", idMasterComp: scope.idMasterComp,
        eventCode: "public_contact.updated", category: "data_change",
        module: "public_contact", action: "update", actorType: "admin",
        actorId: scope.idAdminAcct, actorLabel: req.user?.alias ?? null,
        entityType: "public_contact", entityId: scope.idMasterComp,
        entityLabel: "Public contact settings", before,
        after: { channels, topics }, httpStatus: 200,
      });
      await connection.commit();
      return sendSuccess(res, 200, "PUBLIC_CONTACT_UPDATED", "Contact settings updated successfully", await loadSettings(scope.idMasterComp));
    } catch (error) {
      await connection.rollback();
      console.error("[Public Contact] Failed to update settings", error);
      return sendError(res, 500, "PUBLIC_CONTACT_UPDATE_FAILED", "Unable to update contact settings");
    } finally {
      connection.release();
    }
  },
);

export default app;
