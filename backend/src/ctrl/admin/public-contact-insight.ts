// The insight band of the contact settings, under /api/v1/public-contact/insight: clicks per
// account and channel (the website tags those links, public-analytics.service.ts), and how the
// messages of the contact form are doing. Contract: ops/e2e/write/public-contact-page.spec.ts.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../db');
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';
import {
  isMailConfigured,
  listFolders,
  listMailboxes,
  searchMessages,
} from '../../service/mail-provider.service';

const router = express.Router();
const { pool } = db;

const daysOf = (value: unknown) => {
  const days = Number(value);
  return days === 1 || days === 30 ? days : 7;
};

const clicksBy = async (idMasterComp: number, days: number, prefix: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT SUBSTRING(target_key, ?) AS item_key, COUNT(*) AS total
     FROM public_analytics_event
     WHERE id_master_comp = ? AND event_name = 'outbound_click' AND target_key LIKE ?
       AND received_at >= NOW() - INTERVAL ? DAY
     GROUP BY item_key`,
    [prefix.length + 1, idMasterComp, `${prefix}%`, days],
  );
  return new Map(rows.map((row) => [String(row.item_key), Number(row.total)]));
};

router.get(
  '/api/v1/public-contact/insight/socials',
  verifyToken,
  requirePermission('public_contact.view'),
  onFailure('PUBLIC_CONTACT_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const clicks = await clicksBy(scope.idMasterComp, daysOf(req.query.days), 'social:');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT public_social_account_key AS item_key, public_social_account_platform AS platform,
         public_social_account_name AS name, public_social_account_url AS url,
         public_social_account_is_active AS is_active,
         public_social_account_is_public AS is_public,
         public_social_account_followers AS followers,
         public_social_account_content_count AS content_count
       FROM public_social_account
       WHERE id_master_comp = ? AND public_social_account_deleted_at IS NULL
       ORDER BY public_social_account_sort_order, id_public_social_account`,
      [scope.idMasterComp],
    );
    return sendSuccess(
      res,
      200,
      'PUBLIC_CONTACT_INSIGHT_SOCIALS',
      'Social accounts summary',
      rows
        .map((row) => ({
          key: row.item_key,
          platform: row.platform,
          name: row.name,
          url: row.url,
          is_active: Number(row.is_active),
          is_public: Number(row.is_public),
          followers: row.followers === null ? null : Number(row.followers),
          content_count: row.content_count === null ? null : Number(row.content_count),
          clicks: clicks.get(row.item_key) ?? 0,
        }))
        .sort((a, b) => b.clicks - a.clicks),
    );
  },
);

router.get(
  '/api/v1/public-contact/insight/channels',
  verifyToken,
  requirePermission('public_contact.view'),
  onFailure('PUBLIC_CONTACT_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const clicks = await clicksBy(scope.idMasterComp, daysOf(req.query.days), 'channel:');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.public_contact_channel_key AS item_key, c.public_contact_channel_type AS type,
         t.public_contact_channel_label AS label,
         t.public_contact_channel_description AS description
       FROM public_contact_channel c
       LEFT JOIN public_contact_channel_i18n t
         ON t.id_public_contact_channel = c.id_public_contact_channel
         AND t.public_contact_channel_locale = 'id-ID'
       WHERE c.id_master_comp = ? AND c.public_contact_channel_deleted_at IS NULL
         AND c.public_contact_channel_is_public = 1
       ORDER BY c.public_contact_channel_sort_order`,
      [scope.idMasterComp],
    );
    return sendSuccess(
      res,
      200,
      'PUBLIC_CONTACT_INSIGHT_CHANNELS',
      'Channels summary',
      rows
        .map((row) => ({
          key: row.item_key,
          type: row.type,
          label: row.label ?? row.item_key,
          description: row.description ?? '',
          clicks: clicks.get(row.item_key) ?? 0,
        }))
        .sort((a, b) => b.clicks - a.clicks),
    );
  },
);

router.get(
  '/api/v1/public-contact/insight/audit',
  verifyToken,
  requirePermission('public_contact.view'),
  onFailure('PUBLIC_CONTACT_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const [messages] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
         SUM(contact_inquiry_notification_status = 'sent') AS sent,
         SUM(contact_inquiry_notification_status = 'failed') AS failed,
         SUM(created >= CURDATE()) AS today
       FROM contact_inquiry WHERE id_master_comp = ?`,
      [scope.idMasterComp],
    );
    const [topics] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS active,
         SUM(contact_inquiry_topic_recipient_email IS NULL
           OR contact_inquiry_topic_recipient_email = '') AS no_recipient
       FROM contact_inquiry_topic
       WHERE id_master_comp = ? AND contact_inquiry_topic_status = 1
         AND contact_inquiry_topic_deleted_at IS NULL`,
      [scope.idMasterComp],
    );
    const number = (value: unknown) => Number(value ?? 0);
    const total = number(messages[0].total);
    const sent = number(messages[0].sent);
    const failed = number(messages[0].failed);
    return sendSuccess(res, 200, 'PUBLIC_CONTACT_INSIGHT_AUDIT', 'Contact audit', {
      total,
      sent,
      failed,
      other: total - sent - failed,
      today: number(messages[0].today),
      active_topics: number(topics[0].active),
      topics_without_recipient: number(topics[0].no_recipient),
      // Without mail settings the messages are kept but nobody gets told.
      mail_configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL),
    });
  },
);

// The mailbox behind "Audit Funnel": read, answered, unread. Only numbers, so public_contact.view
// is enough. A mail service that is down must not break the contact page.
router.get(
  '/api/v1/public-contact/insight/mail',
  verifyToken,
  requirePermission('public_contact.view'),
  async (_req: AuthRequest, res: Response) => {
    const none = { configured: false };
    if (!isMailConfigured()) {
      return sendSuccess(res, 200, 'PUBLIC_CONTACT_INSIGHT_MAIL', 'Mailbox numbers', none);
    }
    try {
      const mailboxes = await listMailboxes();
      const wanted = (process.env.MAIL_INSIGHT_ADDRESS || '').trim().toLowerCase();
      const mailbox =
        mailboxes.find((item) => item.address.toLowerCase() === wanted) ?? mailboxes[0];
      if (!mailbox) {
        return sendSuccess(res, 200, 'PUBLIC_CONTACT_INSIGHT_MAIL', 'Mailbox numbers', none);
      }
      const folders = await listFolders(mailbox.resourceId);
      const inbox = folders.find((item) => item.path === 'INBOX');
      const answered = await searchMessages(
        mailbox.resourceId,
        'INBOX',
        { flags: ['\\Answered'] },
        1,
        1,
      );
      const total = inbox?.messageCount ?? 0;
      const unread = inbox?.unreadCount ?? 0;
      const replied = answered.pagination.total;
      return sendSuccess(res, 200, 'PUBLIC_CONTACT_INSIGHT_MAIL', 'Mailbox numbers', {
        configured: true,
        address: mailbox.address,
        total,
        unread,
        answered: replied,
        read: Math.max(0, total - unread - replied),
      });
    } catch {
      return sendSuccess(res, 200, 'PUBLIC_CONTACT_INSIGHT_MAIL', 'Mailbox numbers', none);
    }
  },
);

export default router;
