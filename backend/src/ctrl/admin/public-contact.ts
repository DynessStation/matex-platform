// Contact settings of the public site (social accounts, channels, inquiry topics), under
// /api/v1/public-contact. Each list is saved as a whole; a list left out of the body stays as it
// is. Keys are made by the server when left out. The public page and form are ctrl/public/contact.ts.
// Contract: ops/e2e/write/public-contact-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../db');
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContactChannelType,
  isPublicContentLocale,
  normalizePublicContentKey,
} from '../../config/public-content.config';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

type Translation = { locale: string; label: string; description: string | null; status: 0 | 1 };
type Channels = NonNullable<ReturnType<typeof normalizeChannels>>;
type Topics = NonNullable<ReturnType<typeof normalizeTopics>>;
type Socials = NonNullable<ReturnType<typeof normalizeSocials>>;

const SOCIAL_PLATFORMS = new Set(['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin']);
const SOCIALS_PER_PLATFORM = 3;
const KEY_MAX = 100;

/** A key that is free in this list: the one sent, or one made from `source`. */
const keyFor = (sent: unknown, source: string, seen: Set<string>): string | null => {
  const given = normalizePublicContentKey(sent);
  if (given) return given.length > KEY_MAX || seen.has(given) ? null : given;
  const base = normalizePublicContentKey(source).slice(0, KEY_MAX - 5) || 'item';
  for (let attempt = 1; ; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    if (!seen.has(candidate)) return candidate;
  }
};

/** +62... from what people write: spaces and dashes go, a leading 0 means Indonesia. */
const normalizeWhatsapp = (value: string): string => {
  const digits = value.replace(/[\s().-]/g, '');
  if (digits.startsWith('+')) return digits;
  return digits.startsWith('0') ? `+62${digits.slice(1)}` : `+${digits}`;
};

// Channel types whose link is built from the value, so a configured URL is ignored.
const VALUE_LINKED_TYPES = ['whatsapp', 'email', 'phone'];

/** null for empty, undefined for anything that is not an http(s), mailto, or tel URL. */
const normalizeUrl = (value: unknown): string | null | undefined => {
  const clean = String(value ?? '').trim();
  if (!clean) return null;
  try {
    const parsed = new URL(clean);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

// Every supported language exactly once, each with a label.
const normalizeTranslations = (value: unknown): Translation[] | null => {
  if (!Array.isArray(value)) return null;
  const result: Translation[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const locale = String(item?.locale ?? '').trim();
    const label = String(item?.label ?? '').trim();
    const description = String(item?.description ?? '').trim() || null;
    if (!isPublicContentLocale(locale) || seen.has(locale) || !label || label.length > 255) {
      return null;
    }
    seen.add(locale);
    result.push({ locale, label, description, status: Number(item?.status) === 0 ? 0 : 1 });
  }
  return PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale)) ? result : null;
};

// Channels and topics are shown in the order of the list (positions 1..n); a sort_order in the
// body is ignored. The admin page moves cards up and down.
const sortOrder = (index: number) => index + 1;

const normalizeChannels = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 30) return null;
  const result = [];
  const seen = new Set<string>();
  for (const [index, item] of value.entries()) {
    const type = item?.type;
    const rawValue = String(item?.value ?? '').trim();
    const channelValue = type === 'whatsapp' ? normalizeWhatsapp(rawValue) : rawValue;
    const key = keyFor(item?.key, `${String(type)}-${rawValue}`, seen);
    const url = VALUE_LINKED_TYPES.includes(type) ? null : normalizeUrl(item?.url);
    const translations = normalizeTranslations(item?.translations);
    if (
      !key ||
      !isPublicContactChannelType(type) ||
      !channelValue ||
      channelValue.length > 500 ||
      url === undefined ||
      !translations
    ) {
      return null;
    }
    if (type === 'whatsapp' && !/^\+[1-9]\d{7,14}$/.test(channelValue)) return null;
    seen.add(key);
    result.push({
      key,
      type,
      value: channelValue,
      url,
      isPrimary: Number(item?.is_primary) === 1 ? 1 : 0,
      isPublic: Number(item?.is_public) === 0 ? 0 : 1,
      sortOrder: sortOrder(index),
      translations,
    });
  }
  return result;
};

// An active topic needs a recipient address, except one that had none before this save (seeded
// topics start without: addresses never go into seeds), so the rest of the list can still be saved.
const normalizeTopics = (value: unknown, withoutRecipient: Set<string>) => {
  if (!Array.isArray(value) || value.length > 30) return null;
  const result = [];
  const seen = new Set<string>();
  for (const [index, item] of value.entries()) {
    const translations = normalizeTranslations(item?.translations);
    const idLabel = translations?.find((text) => text.locale === 'id-ID')?.label ?? '';
    const key = keyFor(item?.key, idLabel, seen);
    const email = String(item?.recipient_email ?? '').trim() || null;
    const status = Number(item?.status) === 0 ? 0 : 1;
    if (
      !key ||
      (status === 1 && email === null && !withoutRecipient.has(key)) ||
      (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      !translations
    ) {
      return null;
    }
    seen.add(key);
    result.push({
      key,
      email,
      sortOrder: sortOrder(index),
      status,
      translations,
    });
  }
  return result;
};

const statNumber = (value: unknown): number | null | undefined => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
};

// An inactive account is never shown. At most three per platform.
const normalizeSocials = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const result = [];
  const seen = new Set<string>();
  const perPlatform = new Map<string, number>();
  for (const [index, item] of value.entries()) {
    const platform = String(item?.platform ?? '');
    const name = String(item?.name ?? '').trim();
    const key = keyFor(item?.key, `${platform}-${name}`, seen);
    const url = normalizeUrl(item?.url);
    const followers = statNumber(item?.followers);
    const contentCount = statNumber(item?.content_count);
    const count = (perPlatform.get(platform) ?? 0) + 1;
    if (
      !key ||
      !SOCIAL_PLATFORMS.has(platform) ||
      count > SOCIALS_PER_PLATFORM ||
      !name ||
      name.length > 150 ||
      !url ||
      !/^https?:/.test(url) ||
      url.length > 1000 ||
      followers === undefined ||
      contentCount === undefined
    ) {
      return null;
    }
    seen.add(key);
    perPlatform.set(platform, count);
    const isActive = Number(item?.is_active) === 0 ? 0 : 1;
    result.push({
      key,
      platform,
      name,
      url,
      isActive,
      isPublic: isActive && Number(item?.is_public) !== 0 ? 1 : 0,
      sortOrder: sortOrder(index),
      followers,
      contentCount,
    });
  }
  return result;
};

const groupTranslations = (rows: RowDataPacket[], idColumn: string) => {
  const map = new Map<
    number,
    { locale: unknown; label: unknown; description: unknown; status: number }[]
  >();
  for (const row of rows) {
    const id = Number(row[idColumn]);
    const values = map.get(id) ?? [];
    values.push({
      locale: row.locale,
      label: row.label,
      description: row.description,
      status: Number(row.status),
    });
    map.set(id, values);
  }
  return map;
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
      AND contact_inquiry_topic_deleted_at IS NULL
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
  const [socialRows] = await pool.query<RowDataPacket[]>(
    `SELECT public_social_account_key, public_social_account_platform,
      public_social_account_name, public_social_account_url, public_social_account_is_active,
      public_social_account_is_public, public_social_account_sort_order,
      public_social_account_followers, public_social_account_content_count,
      public_social_account_stats_updated_at
     FROM public_social_account WHERE id_master_comp = ?
      AND public_social_account_deleted_at IS NULL
     ORDER BY public_social_account_sort_order, id_public_social_account`,
    [idMasterComp],
  );
  const channelI18n = groupTranslations(channelTranslations, 'id_public_contact_channel');
  const topicI18n = groupTranslations(topicTranslations, 'id_contact_inquiry_topic');
  return {
    socials: socialRows.map((row) => ({
      key: row.public_social_account_key,
      platform: row.public_social_account_platform,
      name: row.public_social_account_name,
      url: row.public_social_account_url,
      is_active: Number(row.public_social_account_is_active),
      is_public: Number(row.public_social_account_is_public),
      sort_order: Number(row.public_social_account_sort_order),
      followers:
        row.public_social_account_followers === null
          ? null
          : Number(row.public_social_account_followers),
      content_count:
        row.public_social_account_content_count === null
          ? null
          : Number(row.public_social_account_content_count),
      stats_updated_at: row.public_social_account_stats_updated_at,
    })),
    channels: channelRows.map((row) => ({
      key: row.public_contact_channel_key,
      type: row.public_contact_channel_type,
      value: row.public_contact_channel_value,
      url: row.public_contact_channel_url,
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

/** `AND <column> NOT IN (...)` for the kept keys, or nothing when none are kept. */
const notIn = (column: string, keys: string[]) =>
  keys.length ? `AND ${column} NOT IN (${keys.map(() => '?').join(',')})` : '';

// Channels left out are soft-deleted (and hidden); the rest are upserted by key.
const saveChannels = async (
  connection: PoolConnection,
  idMasterComp: number,
  idAdminAcct: number,
  channels: Channels,
) => {
  const keys = channels.map((item) => item.key);
  await connection.query(
    `UPDATE public_contact_channel SET public_contact_channel_deleted_at = NOW(),
      public_contact_channel_is_public = 0, id_updated_by = ?, updated = NOW()
     WHERE id_master_comp = ? AND public_contact_channel_deleted_at IS NULL
      ${notIn('public_contact_channel_key', keys)}`,
    [idAdminAcct, idMasterComp, ...keys],
  );
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
      [
        idMasterComp,
        item.key,
        item.type,
        item.value,
        item.url,
        item.isPrimary,
        item.isPublic,
        item.sortOrder,
        idAdminAcct,
        idAdminAcct,
      ],
    );
    const [idRows] = await connection.query<RowDataPacket[]>(
      `SELECT id_public_contact_channel FROM public_contact_channel
       WHERE id_master_comp = ? AND public_contact_channel_key = ? LIMIT 1`,
      [idMasterComp, item.key],
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
        [
          idRows[0].id_public_contact_channel,
          idMasterComp,
          translation.locale,
          translation.label,
          translation.description,
          translation.status,
        ],
      );
    }
  }
};

// Accounts left out are deleted (only an inactive one may be); the rest are upserted. The numbers
// typed by hand remember when they last changed.
const saveSocials = async (
  connection: PoolConnection,
  idMasterComp: number,
  idAdminAcct: number,
  socials: Socials,
) => {
  const keys = socials.map((item) => item.key);
  const [active] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM public_social_account WHERE id_master_comp = ?
      AND public_social_account_deleted_at IS NULL AND public_social_account_is_active = 1
      ${notIn('public_social_account_key', keys)} LIMIT 1`,
    [idMasterComp, ...keys],
  );
  if (active.length) {
    throw new HttpError(
      409,
      'PUBLIC_SOCIAL_ACTIVE',
      'Make the account inactive before deleting it',
    );
  }
  await connection.query(
    `UPDATE public_social_account SET public_social_account_deleted_at = NOW(),
      public_social_account_is_public = 0, id_updated_by = ?
     WHERE id_master_comp = ? AND public_social_account_deleted_at IS NULL
      ${notIn('public_social_account_key', keys)}`,
    [idAdminAcct, idMasterComp, ...keys],
  );
  for (const item of socials) {
    await connection.query(
      `INSERT INTO public_social_account (id_master_comp, public_social_account_key,
        public_social_account_platform, public_social_account_name, public_social_account_url,
        public_social_account_is_active, public_social_account_is_public,
        public_social_account_sort_order, public_social_account_followers,
        public_social_account_content_count, public_social_account_stats_updated_at,
        id_created_by, id_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? IS NULL AND ? IS NULL, NULL, NOW()), ?, ?)
       ON DUPLICATE KEY UPDATE
        public_social_account_stats_updated_at = IF(
          public_social_account_followers <=> VALUES(public_social_account_followers)
            AND public_social_account_content_count <=> VALUES(public_social_account_content_count),
          public_social_account_stats_updated_at, NOW()),
        public_social_account_platform = VALUES(public_social_account_platform),
        public_social_account_name = VALUES(public_social_account_name),
        public_social_account_url = VALUES(public_social_account_url),
        public_social_account_is_active = VALUES(public_social_account_is_active),
        public_social_account_is_public = VALUES(public_social_account_is_public),
        public_social_account_sort_order = VALUES(public_social_account_sort_order),
        public_social_account_followers = VALUES(public_social_account_followers),
        public_social_account_content_count = VALUES(public_social_account_content_count),
        id_updated_by = VALUES(id_updated_by), public_social_account_deleted_at = NULL`,
      [
        idMasterComp,
        item.key,
        item.platform,
        item.name,
        item.url,
        item.isActive,
        item.isPublic,
        item.sortOrder,
        item.followers,
        item.contentCount,
        item.followers,
        item.contentCount,
        idAdminAcct,
        idAdminAcct,
      ],
    );
  }
};

// Topics left out are deleted (inquiries keep pointing at them); the rest are upserted.
const saveTopics = async (
  connection: PoolConnection,
  idMasterComp: number,
  idAdminAcct: number,
  topics: Topics,
) => {
  const keys = topics.map((item) => item.key);
  await connection.query(
    `UPDATE contact_inquiry_topic SET contact_inquiry_topic_status = 0,
      contact_inquiry_topic_deleted_at = NOW(), id_updated_by = ?, updated = NOW()
     WHERE id_master_comp = ? AND contact_inquiry_topic_deleted_at IS NULL
      ${notIn('contact_inquiry_topic_key', keys)}`,
    [idAdminAcct, idMasterComp, ...keys],
  );
  for (const item of topics) {
    await connection.query(
      `INSERT INTO contact_inquiry_topic (id_master_comp, contact_inquiry_topic_key,
        contact_inquiry_topic_recipient_email, contact_inquiry_topic_sort_order,
        contact_inquiry_topic_status, id_created_by, id_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
        contact_inquiry_topic_recipient_email = VALUES(contact_inquiry_topic_recipient_email),
        contact_inquiry_topic_sort_order = VALUES(contact_inquiry_topic_sort_order),
        contact_inquiry_topic_status = VALUES(contact_inquiry_topic_status),
        contact_inquiry_topic_deleted_at = NULL,
        id_updated_by = VALUES(id_updated_by), updated = NOW()`,
      [idMasterComp, item.key, item.email, item.sortOrder, item.status, idAdminAcct, idAdminAcct],
    );
    const [idRows] = await connection.query<RowDataPacket[]>(
      `SELECT id_contact_inquiry_topic FROM contact_inquiry_topic
       WHERE id_master_comp = ? AND contact_inquiry_topic_key = ? LIMIT 1`,
      [idMasterComp, item.key],
    );
    for (const translation of item.translations) {
      await connection.query(
        `INSERT INTO contact_inquiry_topic_i18n (id_contact_inquiry_topic,
          id_master_comp, contact_inquiry_topic_locale, contact_inquiry_topic_label,
          contact_inquiry_topic_i18n_status) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE contact_inquiry_topic_label = VALUES(contact_inquiry_topic_label),
          contact_inquiry_topic_i18n_status = VALUES(contact_inquiry_topic_i18n_status),
          updated = NOW()`,
        [
          idRows[0].id_contact_inquiry_topic,
          idMasterComp,
          translation.locale,
          translation.label,
          translation.status,
        ],
      );
    }
  }
};

router.get(
  '/api/v1/public-contact',
  verifyToken,
  requirePermission('public_contact.view'),
  onFailure('PUBLIC_CONTACT_LOAD_FAILED', 'Unable to load contact settings'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    return sendSuccess(
      res,
      200,
      'PUBLIC_CONTACT_FOUND',
      'Contact settings loaded',
      await loadSettings(scope.idMasterComp),
    );
  },
);

router.put(
  '/api/v1/public-contact',
  verifyToken,
  requirePermission('public_contact.update'),
  onFailure('PUBLIC_CONTACT_UPDATE_FAILED', 'Unable to update contact settings'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const [withoutRecipient] = await pool.query<RowDataPacket[]>(
      `SELECT contact_inquiry_topic_key FROM contact_inquiry_topic
       WHERE id_master_comp = ? AND contact_inquiry_topic_deleted_at IS NULL
        AND contact_inquiry_topic_recipient_email IS NULL`,
      [scope.idMasterComp],
    );
    const topicsWithoutRecipient = new Set(
      withoutRecipient.map((row) => String(row.contact_inquiry_topic_key)),
    );
    const body = req.body ?? {};
    const sentAny =
      body.channels !== undefined || body.topics !== undefined || body.socials !== undefined;
    const channels = body.channels === undefined ? undefined : normalizeChannels(body.channels);
    const topics =
      body.topics === undefined ? undefined : normalizeTopics(body.topics, topicsWithoutRecipient);
    const socials = body.socials === undefined ? undefined : normalizeSocials(body.socials);
    if (!sentAny || channels === null || topics === null || socials === null) {
      return sendError(
        res,
        400,
        'PUBLIC_CONTACT_PAYLOAD_INVALID',
        'Contact settings are incomplete or invalid',
      );
    }

    await withTransaction(pool, async (connection) => {
      const before = await loadSettings(scope.idMasterComp);
      if (socials) await saveSocials(connection, scope.idMasterComp, scope.idAdminAcct, socials);
      if (channels) await saveChannels(connection, scope.idMasterComp, scope.idAdminAcct, channels);
      if (topics) await saveTopics(connection, scope.idMasterComp, scope.idAdminAcct, topics);
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'public_contact.updated',
        category: 'data_change',
        module: 'public_contact',
        action: 'update',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'public_contact',
        entityId: scope.idMasterComp,
        entityLabel: 'Public contact settings',
        before,
        after: { socials, channels, topics },
        httpStatus: 200,
      });
    });

    return sendSuccess(
      res,
      200,
      'PUBLIC_CONTACT_UPDATED',
      'Contact settings updated successfully',
      await loadSettings(scope.idMasterComp),
    );
  },
);

export default router;
