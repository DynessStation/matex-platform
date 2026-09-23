import { createHash } from "node:crypto";
import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";

import { isPublicContentLocale } from "../../config/public-content.config";
import { pool } from "../../db";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const safePublicUrl = (value: unknown): string | null => {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  try {
    const parsed = new URL(clean);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
};

const channelUrl = (type: string, value: string, configured: unknown) => {
  const explicit = safePublicUrl(configured);
  if (explicit) return explicit;
  if (type === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  if (type === "email") return `mailto:${value}`;
  if (type === "phone") return `tel:${value}`;
  return null;
};

router.get("/api/public/contact/:locale", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);
  const locale = String(req.params.locale ?? "");
  if (!Number.isSafeInteger(company) || company <= 0)
    return sendError(res, 503, "CONTACT_UNAVAILABLE", "Contact is not configured");
  if (!isPublicContentLocale(locale))
    return sendError(res, 404, "CONTACT_NOT_FOUND", "Contact not found");

  try {
    const [channels] = await pool.query<RowDataPacket[]>(
      `SELECT c.public_contact_channel_key AS channel_key,
        c.public_contact_channel_type AS type,
        c.public_contact_channel_value AS value,
        c.public_contact_channel_url AS configured_url,
        c.public_contact_channel_is_primary AS is_primary,
        t.public_contact_channel_label AS label,
        t.public_contact_channel_description AS description
       FROM public_contact_channel c
       INNER JOIN public_contact_channel_i18n t
        ON t.id_public_contact_channel = c.id_public_contact_channel
        AND t.id_master_comp = c.id_master_comp
        AND t.public_contact_channel_locale = ?
        AND t.public_contact_channel_i18n_status = 1
       WHERE c.id_master_comp = ? AND c.public_contact_channel_is_public = 1
        AND c.public_contact_channel_deleted_at IS NULL
       ORDER BY c.public_contact_channel_sort_order, c.id_public_contact_channel`,
      [locale, company],
    );
    const [topics] = await pool.query<RowDataPacket[]>(
      `SELECT q.contact_inquiry_topic_key AS topic_key, t.contact_inquiry_topic_label AS label
       FROM contact_inquiry_topic q
       INNER JOIN contact_inquiry_topic_i18n t
        ON t.id_contact_inquiry_topic = q.id_contact_inquiry_topic
        AND t.id_master_comp = q.id_master_comp
        AND t.contact_inquiry_topic_locale = ?
        AND t.contact_inquiry_topic_i18n_status = 1
       WHERE q.id_master_comp = ? AND q.contact_inquiry_topic_status = 1
       ORDER BY q.contact_inquiry_topic_sort_order, q.id_contact_inquiry_topic`,
      [locale, company],
    );
    const [offices] = await pool.query<RowDataPacket[]>(
      `SELECT office_code AS code, office_name AS name, office_description AS description,
        address, city, province, postal_code, country_code, email, phone, lat, lng,
        website_url, public_slug AS slug, google_place_id, google_maps_url,
        google_business_url
       FROM office WHERE id_master_comp = ? AND is_public = 1 AND status = 1
       ORDER BY public_sort_order, id_office`,
      [company],
    );

    return sendSuccess(res, 200, "CONTACT_FOUND", "Contact loaded", {
      locale,
      channels: channels.map((item) => ({
        key: item.channel_key, type: item.type, value: item.value,
        url: channelUrl(item.type, item.value, item.configured_url),
        is_primary: Number(item.is_primary) === 1,
        label: item.label, description: item.description,
      })),
      topics: topics.map((topic) => ({ key: topic.topic_key, label: topic.label })),
      offices: offices.map((office) => ({
        ...office,
        lat: office.lat === null ? null : Number(office.lat),
        lng: office.lng === null ? null : Number(office.lng),
      })),
    });
  } catch (error) {
    console.error("[Public Contact] Failed to load", error);
    return sendError(res, 500, "CONTACT_UNAVAILABLE", "Unable to load contact");
  }
});

router.post("/api/public/contact-inquiry", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);
  if (!Number.isSafeInteger(company) || company <= 0)
    return sendError(res, 503, "CONTACT_UNAVAILABLE", "Contact is not configured");

  if (String(req.body?.website ?? "").trim())
    return sendSuccess(res, 202, "CONTACT_INQUIRY_ACCEPTED", "Message received", null);

  const locale = String(req.body?.locale ?? "");
  const topicKey = String(req.body?.topic_key ?? "").trim();
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim() || null;
  const phone = String(req.body?.phone ?? "").trim() || null;
  const message = String(req.body?.message ?? "").trim();
  const consent = req.body?.consent === true;

  if (!isPublicContentLocale(locale) || !topicKey || !name || name.length > 255 ||
    (!email && !phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (phone && phone.length > 50) || !message || message.length > 5000 || !consent)
    return sendError(res, 400, "CONTACT_INQUIRY_INVALID", "Complete the required contact fields");

  const ipHash = createHash("sha256").update(String(req.ip ?? "unknown")).digest();
  const rateKey = ipHash.toString("hex");
  const now = Date.now();
  const recent = (attempts.get(rateKey) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS)
    return sendError(res, 429, "CONTACT_INQUIRY_RATE_LIMITED", "Please wait before sending another message");
  recent.push(now);
  attempts.set(rateKey, recent);

  try {
    const [topicRows] = await pool.query<RowDataPacket[]>(
      `SELECT id_contact_inquiry_topic FROM contact_inquiry_topic
       WHERE id_master_comp = ? AND contact_inquiry_topic_key = ?
        AND contact_inquiry_topic_status = 1 LIMIT 1`,
      [company, topicKey],
    );
    if (!topicRows.length)
      return sendError(res, 400, "CONTACT_TOPIC_INVALID", "Select a valid contact topic");

    const sourcePath = String(req.body?.source_path ?? "").trim().slice(0, 500) || null;
    const referrer = String(req.get("referer") ?? "").trim().slice(0, 1000) || null;
    const userAgent = String(req.get("user-agent") ?? "").trim().slice(0, 1000) || null;
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO contact_inquiry (id_master_comp, id_contact_inquiry_topic,
        contact_inquiry_name, contact_inquiry_email, contact_inquiry_phone,
        contact_inquiry_message, contact_inquiry_locale, contact_inquiry_source_path,
        contact_inquiry_referrer, contact_inquiry_user_agent,
        contact_inquiry_ip_hash, contact_inquiry_consent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [company, topicRows[0].id_contact_inquiry_topic, name, email, phone,
        message, locale, sourcePath, referrer, userAgent, ipHash],
    );
    return sendSuccess(res, 201, "CONTACT_INQUIRY_CREATED", "Message sent successfully", {
      reference: `MSG-${result.insertId}`,
    });
  } catch (error) {
    console.error("[Public Contact] Failed to save inquiry", error);
    return sendError(res, 500, "CONTACT_INQUIRY_FAILED", "Unable to send message");
  }
});

export default router;
