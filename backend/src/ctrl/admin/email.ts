// The Email menu, under /api/v1/email: reading and acting on the mailboxes the provider's token
// allows (service/mail-provider.service.ts). Nothing is stored here; a sent message leaves an
// audit entry without its body. Contract: ops/e2e/write/email-api.spec.ts.
import express = require('express');
import { Response } from 'express';

import db = require('../../db');
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { isValidEmail } from '../../helper/input.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';
import {
  MailOutgoing,
  getAttachment,
  getMessage,
  isMailConfigured,
  listFolders,
  listMailboxes,
  listMessages,
  moveMessage,
  searchMessages,
  sendMessage,
  setSeen,
} from '../../service/mail-provider.service';

const router = express.Router();
const { pool } = db;

const PER_PAGE = 25;
const MAX_RECIPIENTS = 30;
const MAX_TEXT = 200_000;

const param = (value: unknown) => String(value ?? '');

const uidOf = (value: unknown): number => {
  const uid = Number(value);
  if (!Number.isSafeInteger(uid) || uid <= 0) {
    throw new HttpError(400, 'MAIL_MESSAGE_INVALID', 'Invalid message');
  }
  return uid;
};

const pageOf = (value: unknown) => {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
};

/** The addresses in a field: a list, or text separated by commas. Refused when one is wrong. */
const addresses = (value: unknown): string[] => {
  const items = Array.isArray(value) ? value : String(value ?? '').split(/[,;]/);
  const clean = items.map((item) => String(item).trim()).filter(Boolean);
  if (clean.some((item) => !isValidEmail(item))) {
    throw new HttpError(400, 'MAIL_ADDRESS_INVALID', 'An email address is not valid');
  }
  return clean;
};

const messageRef = (value: unknown) => {
  if (!value || typeof value !== 'object') return undefined;
  const ref = value as { uid?: unknown; folder?: unknown };
  const folder = String(ref.folder ?? '').trim();
  if (!folder) throw new HttpError(400, 'MAIL_MESSAGE_INVALID', 'Invalid message');
  return { uid: uidOf(ref.uid), folder };
};

const summary = (item: Awaited<ReturnType<typeof getMessage>>) => ({
  uid: item.uid,
  date: item.date,
  unseen: item.unseen,
  answered: (item.flags ?? []).includes('\\Answered'),
  size: item.size,
  subject: item.subject ?? '',
  from: item.from ?? [],
  to: item.to ?? [],
  cc: item.cc ?? [],
  attachments: (item.attachments ?? [])
    .filter((file) => !file.inline)
    .map((file) => ({
      id: file.id,
      filename: file.filename ?? 'lampiran',
      content_type: file.contentType,
      size: file.sizeBytes,
    })),
});

router.get(
  '/api/v1/email/mailboxes',
  verifyToken,
  requirePermission('email.view'),
  onFailure('MAIL_FAILED', 'Unable to load the mailboxes'),
  async (_req: AuthRequest, res: Response) => {
    if (!isMailConfigured()) {
      return sendSuccess(res, 200, 'MAIL_NOT_CONFIGURED', 'Email is not set up yet', {
        configured: false,
        mailboxes: [],
      });
    }
    const mailboxes = await listMailboxes();
    return sendSuccess(res, 200, 'MAIL_MAILBOXES', 'Mailboxes loaded', {
      configured: true,
      mailboxes: mailboxes.map((item) => ({ id: item.resourceId, address: item.address })),
    });
  },
);

router.get(
  '/api/v1/email/:mailbox/folders',
  verifyToken,
  requirePermission('email.view'),
  onFailure('MAIL_FAILED', 'Unable to load the folders'),
  async (req: AuthRequest, res: Response) => {
    const folders = await listFolders(param(req.params.mailbox));
    return sendSuccess(
      res,
      200,
      'MAIL_FOLDERS',
      'Folders loaded',
      folders.map((item) => ({
        path: item.path,
        name: item.name,
        special_use: item.specialUse ?? null,
        total: item.messageCount,
        unread: item.unreadCount,
      })),
    );
  },
);

router.get(
  '/api/v1/email/:mailbox/messages',
  verifyToken,
  requirePermission('email.view'),
  onFailure('MAIL_FAILED', 'Unable to load the messages'),
  async (req: AuthRequest, res: Response) => {
    const folder = param(req.query.folder) || 'INBOX';
    const page = pageOf(req.query.page);
    const search = param(req.query.search).trim().slice(0, 200);
    const result = search
      ? await searchMessages(param(req.params.mailbox), folder, { text: search }, page, PER_PAGE)
      : await listMessages(param(req.params.mailbox), folder, page, PER_PAGE);
    return res.status(200).json({
      success: true,
      code: 'MAIL_MESSAGES',
      message: 'Messages loaded',
      data: result.data.map((item) => summary({ ...item, text: '', html: '' })),
      meta: {
        page: result.pagination.page,
        limit: result.pagination.perPage,
        total: result.pagination.total,
        total_pages: result.pagination.totalPages,
      },
    });
  },
);

router.get(
  '/api/v1/email/:mailbox/messages/:uid',
  verifyToken,
  requirePermission('email.view'),
  onFailure('MAIL_FAILED', 'Unable to load the message'),
  async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const message = await getMessage(
      param(req.params.mailbox),
      param(req.query.folder) || 'INBOX',
      uidOf(req.params.uid),
    );
    return sendSuccess(res, 200, 'MAIL_MESSAGE', 'Message loaded', {
      ...summary(message),
      text: message.text,
      html: message.html,
    });
  },
);

// Reading a message does not mark it: the page asks when someone actually opens one.
router.patch(
  '/api/v1/email/:mailbox/messages/:uid/seen',
  verifyToken,
  requirePermission('email.view'),
  onFailure('MAIL_FAILED', 'Unable to update the message'),
  async (req: AuthRequest, res: Response) => {
    const seen = req.body?.seen !== false;
    await setSeen(
      param(req.params.mailbox),
      param(req.body?.folder) || 'INBOX',
      uidOf(req.params.uid),
      seen,
    );
    return sendSuccess(res, 200, 'MAIL_MESSAGE_UPDATED', 'Message updated', { seen });
  },
);

// Always saved as a download, whatever its type: a mail attachment must not run in this origin.
router.get(
  '/api/v1/email/:mailbox/messages/:uid/attachments/:attachment',
  verifyToken,
  requirePermission('email.view'),
  onFailure('MAIL_FAILED', 'Unable to load the attachment'),
  async (req: AuthRequest, res: Response) => {
    const file = await getAttachment(
      param(req.params.mailbox),
      param(req.query.folder) || 'INBOX',
      uidOf(req.params.uid),
      param(req.params.attachment),
    );
    const name =
      param(req.query.name)
        .replace(/[^\w.\- ]+/g, '_')
        .slice(0, 120) || 'lampiran';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(await file.arrayBuffer()));
  },
);

router.post(
  '/api/v1/email/:mailbox/messages/:uid/trash',
  verifyToken,
  requirePermission('email.manage'),
  onFailure('MAIL_FAILED', 'Unable to move the message'),
  async (req: AuthRequest, res: Response) => {
    const mailbox = param(req.params.mailbox);
    const folder = param(req.body?.folder) || 'INBOX';
    const trash = (await listFolders(mailbox)).find((item) =>
      /trash/i.test(`${item.specialUse ?? ''} ${item.path}`),
    );
    if (!trash) throw new HttpError(409, 'MAIL_NO_TRASH', 'This mailbox has no trash folder');
    if (trash.path === folder) {
      throw new HttpError(409, 'MAIL_ALREADY_TRASH', 'The message is already in the trash');
    }
    await moveMessage(mailbox, folder, uidOf(req.params.uid), trash.path);
    return sendSuccess(res, 200, 'MAIL_MESSAGE_TRASHED', 'Message moved to the trash', {
      folder: trash.path,
    });
  },
);

router.post(
  '/api/v1/email/:mailbox/send',
  verifyToken,
  requirePermission('email.send'),
  onFailure('MAIL_SEND_FAILED', 'Unable to send the message'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const to = addresses(req.body?.to);
    const cc = addresses(req.body?.cc);
    const bcc = addresses(req.body?.bcc);
    const subject = String(req.body?.subject ?? '').trim();
    const text = String(req.body?.text ?? '');
    const inReplyTo = messageRef(req.body?.in_reply_to);
    const forwardOf = messageRef(req.body?.forward_of);
    if (
      !to.length ||
      to.length + cc.length + bcc.length > MAX_RECIPIENTS ||
      !subject ||
      subject.length > 500 ||
      !text.trim() ||
      text.length > MAX_TEXT ||
      (inReplyTo && forwardOf)
    ) {
      return sendError(
        res,
        400,
        'MAIL_SEND_INVALID',
        'Recipient, subject, and message are required',
      );
    }
    const message: MailOutgoing = {
      to,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      subject,
      text,
      ...(inReplyTo ? { inReplyTo } : {}),
      ...(forwardOf ? { forwardOf } : {}),
    };
    await sendMessage(param(req.params.mailbox), message);
    await writeAuditLog({
      req,
      writeMode: 'strict',
      idMasterComp: scope.idMasterComp,
      eventCode: 'email.sent',
      category: 'data_change',
      module: 'email',
      action: inReplyTo ? 'reply' : forwardOf ? 'forward' : 'send',
      actorType: 'admin',
      actorId: scope.idAdminAcct,
      actorLabel: req.user?.alias ?? null,
      entityType: 'email',
      entityLabel: subject.slice(0, 150),
      after: { to, cc, bcc_count: bcc.length, subject },
      httpStatus: 200,
    });
    return sendSuccess(res, 200, 'MAIL_SENT', 'Message sent', { sent: true });
  },
);

export default router;
