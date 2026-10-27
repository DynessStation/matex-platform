// "Profil saya" (U-16): the signed-in admin's own name, backup contacts, photo, and password.
// No permission beyond an active session. Email and phone 1 (the login identities), alias,
// office, position, and access profile stay with Akun Admin (admin_account.update).
import express = require('express');
import { Response } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import multer from 'multer';
import { ResultSetHeader } from 'mysql2';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import os from 'os';
import path from 'path';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import {
  StoredAttachment,
  deleteStoredAttachment,
  storeAttachment,
} from '../../../helper/attachment.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError } from '../../../helper/http-error.helper';
import { isValidEmail } from '../../../helper/input.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';

import {
  assertAccountUnique,
  isValidAccountName,
  isValidAccountPassword,
  isValidAccountPhone,
} from './input';
import {
  AccountRow,
  readPermissionKeys,
  SESSION_ACCOUNT_SELECT,
  sessionAccountDto,
} from './records';
import { issueAccessToken } from './token';

const { pool } = db;

const router = express.Router();

const invalid = (code: string, message: string) => new HttpError(400, code, message);

// One image at a time, through a temporary file (SEC-004); storeAttachment checks type and size.
const upload = multer({
  dest: path.join(os.tmpdir(), 'matex-upload'),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

const uploadPhoto = (req: AuthRequest, res: Response, next: express.NextFunction): void => {
  upload.single('file')(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 400, 'ADMIN_PROFILE_PHOTO_TOO_LARGE', 'The photo exceeds 8 MB');
    } else {
      sendError(res, 400, 'ADMIN_PROFILE_PHOTO_UPLOAD_FAILED', 'Unable to process the photo');
    }
  });
};

const OWN_COLUMNS = `id_admin_acct, id_master_comp, name, alias, email_1, email_2, phone_1,
  phone_2, id_profile_photo, password, token_version`;

/** Locks the signed-in account. */
const lockOwnAccount = async (connection: PoolConnection, idAdminAcct: number) => {
  const [rows] = await connection.query(
    `SELECT ${OWN_COLUMNS} FROM admin_acct
     WHERE id_admin_acct = ? AND admin_acct_status = 1 LIMIT 1 FOR UPDATE`,
    [idAdminAcct],
  );
  const account = (rows as RowDataPacket[])[0];
  if (!account) throw new HttpError(401, 'AUTH_SESSION_INVALID', 'Invalid session');
  return account;
};

const profileView = (account: RowDataPacket) => ({
  name: account.name,
  email_2: account.email_2 ?? null,
  phone_2: account.phone_2 ?? null,
  id_profile_photo: account.id_profile_photo ? Number(account.id_profile_photo) : null,
});

/** The session account as /me returns it, after a change. */
const sessionAccount = async (idAdminAcct: number) => {
  const [rows] = await pool.query(`${SESSION_ACCOUNT_SELECT} WHERE aa.id_admin_acct = ? LIMIT 1`, [
    idAdminAcct,
  ]);
  const user = (rows as AccountRow[])[0];
  return sessionAccountDto(user, await readPermissionKeys(user.id_access));
};

const profileAudit = (
  req: AuthRequest,
  connection: PoolConnection,
  account: RowDataPacket,
  extra: Record<string, unknown>,
) =>
  writeAuditLog({
    req,
    connection,
    writeMode: 'strict',
    idMasterComp: Number(account.id_master_comp),
    category: 'data_change',
    module: 'admin_account',
    action: 'update',
    actorType: 'admin',
    actorId: Number(account.id_admin_acct),
    actorLabel: account.alias ?? null,
    entityType: 'admin_account',
    entityId: Number(account.id_admin_acct),
    entityLabel: account.name ?? null,
    httpStatus: 200,
    ...extra,
  } as Parameters<typeof writeAuditLog>[0]);

//==================================================
//==== NAME AND BACKUP CONTACTS
//==================================================

router.put('/api/v1/admin-acct/me', verifyToken, async (req: AuthRequest, res: Response) => {
  const scope = await getAdminScope(req);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

  const name = String(req.body?.name ?? '').trim();
  const email2 = req.body?.email_2 ? String(req.body.email_2).trim().toLowerCase() : null;
  const phone2 = req.body?.phone_2 ? String(req.body.phone_2).trim() : null;

  if (!name) throw invalid('ADMIN_PROFILE_NAME_REQUIRED', 'Name is required');
  if (!isValidAccountName(name)) throw invalid('ADMIN_ACCOUNT_NAME_INVALID', 'Invalid name format');
  if (email2 && !isValidEmail(email2)) {
    throw invalid('ADMIN_ACCOUNT_EMAIL_INVALID', 'Invalid email address');
  }
  if (phone2 && !isValidAccountPhone(phone2)) {
    throw invalid('ADMIN_ACCOUNT_PHONE_INVALID', 'Invalid phone number');
  }

  await withTransaction(pool, async (connection) => {
    const account = await lockOwnAccount(connection, scope.idAdminAcct);
    await assertAccountUnique(
      connection,
      {
        alias: account.alias,
        email1: account.email_1,
        email2,
        phone1: account.phone_1,
        phone2,
      },
      scope.idAdminAcct,
    );

    await connection.query(
      'UPDATE admin_acct SET name = ?, email_2 = ?, phone_2 = ?, updated = NOW() WHERE id_admin_acct = ?',
      [name, email2, phone2, scope.idAdminAcct],
    );

    await profileAudit(req, connection, account, {
      eventCode: 'admin_account.profile_updated',
      entityLabel: name,
      before: profileView(account),
      after: profileView({ ...account, name, email_2: email2, phone_2: phone2 }),
    });
  });

  return sendSuccess(
    res,
    200,
    'ADMIN_PROFILE_UPDATED',
    'Profile updated successfully',
    await sessionAccount(scope.idAdminAcct),
  );
});

//==================================================
//==== PHOTO
//==================================================

router.post(
  '/api/v1/admin-acct/me/photo',
  verifyToken,
  uploadPhoto,
  async (req: AuthRequest, res: Response) => {
    const input = req.file;
    let stored: StoredAttachment | null = null;

    try {
      const scope = await getAdminScope(req);
      if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
      if (!input) {
        return sendError(res, 400, 'ADMIN_PROFILE_PHOTO_REQUIRED', 'A photo file is required');
      }

      const file = await storeAttachment(input, 'admin_profile');
      stored = file;

      await withTransaction(pool, async (connection) => {
        const account = await lockOwnAccount(connection, scope.idAdminAcct);
        const [insert] = await connection.query<ResultSetHeader>(
          `INSERT INTO attachment (collection_name, name, original_name, file_name, mime_type,
             extension, disk, storage_path, file_size, width, height, id_master_comp, id_office,
             created_by_id, created, updated, attachment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
          [
            file.collection_name,
            file.name,
            file.original_name,
            file.file_name,
            file.mime_type,
            file.extension,
            file.disk,
            file.storage_path,
            file.file_size,
            file.width,
            file.height,
            scope.idMasterComp,
            scope.idOffice,
            scope.idAdminAcct,
          ],
        );
        const idAttachment = Number(insert.insertId);

        await connection.query(
          'UPDATE admin_acct SET id_profile_photo = ?, updated = NOW() WHERE id_admin_acct = ?',
          [idAttachment, scope.idAdminAcct],
        );

        await profileAudit(req, connection, account, {
          eventCode: 'admin_account.profile_updated',
          before: profileView(account),
          after: profileView({ ...account, id_profile_photo: idAttachment }),
          metadata: { change: 'photo', collection: file.collection_name },
        });
      });

      return sendSuccess(
        res,
        200,
        'ADMIN_PROFILE_PHOTO_UPDATED',
        'Profile photo updated successfully',
        await sessionAccount(scope.idAdminAcct),
      );
    } catch (error) {
      if (stored) await deleteStoredAttachment(stored.storage_path).catch(() => undefined);
      throw error;
    } finally {
      if (input) await fs.unlink(input.path).catch(() => undefined);
    }
  },
);

router.delete(
  '/api/v1/admin-acct/me/photo',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    await withTransaction(pool, async (connection) => {
      const account = await lockOwnAccount(connection, scope.idAdminAcct);
      if (!account.id_profile_photo) return;

      await connection.query(
        'UPDATE admin_acct SET id_profile_photo = NULL, updated = NOW() WHERE id_admin_acct = ?',
        [scope.idAdminAcct],
      );

      await profileAudit(req, connection, account, {
        eventCode: 'admin_account.profile_updated',
        before: profileView(account),
        after: profileView({ ...account, id_profile_photo: null }),
        metadata: { change: 'photo_removed' },
      });
    });

    return sendSuccess(
      res,
      200,
      'ADMIN_PROFILE_PHOTO_REMOVED',
      'Profile photo removed successfully',
      await sessionAccount(scope.idAdminAcct),
    );
  },
);

//==================================================
//==== PASSWORD
//==================================================

// Other devices are signed out (token_version + 1); this session keeps its end time.
router.put(
  '/api/v1/admin-acct/me/password',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const current = String(req.body?.current_password ?? '');
    const password = String(req.body?.password ?? '');
    const confirmation = String(req.body?.password_confirmation ?? '');

    if (!current || !password || !confirmation) {
      throw invalid('ADMIN_PASSWORD_FIELDS_REQUIRED', 'All password fields are required');
    }
    if (!isValidAccountPassword(password)) {
      throw invalid('ADMIN_ACCOUNT_PASSWORD_INVALID', 'Invalid password format');
    }
    if (password !== confirmation) {
      throw invalid('ADMIN_PASSWORD_CONFIRMATION_MISMATCH', 'Password confirmation does not match');
    }
    if (password === current) {
      throw invalid(
        'ADMIN_PASSWORD_UNCHANGED',
        'The new password must differ from the current one',
      );
    }

    const account = await withTransaction(pool, async (connection) => {
      const own = await lockOwnAccount(connection, scope.idAdminAcct);

      if (!(await bcrypt.compare(current, own.password))) {
        return { mismatch: true as const, own };
      }

      await connection.query(
        `UPDATE admin_acct SET password = ?, token_version = token_version + 1, updated = NOW()
         WHERE id_admin_acct = ?`,
        [await bcrypt.hash(password, 12), scope.idAdminAcct],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'auth.password.changed',
        category: 'security',
        module: 'auth',
        action: 'password_change',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: own.alias ?? null,
        entityType: 'admin_account',
        entityId: scope.idAdminAcct,
        entityLabel: own.alias ?? null,
        outcome: 'success',
        metadata: { other_sessions_signed_out: true },
        httpStatus: 200,
      });

      return { mismatch: false as const, own };
    });

    if (account.mismatch) {
      await writeAuditLog({
        req,
        writeMode: 'best_effort',
        idMasterComp: scope.idMasterComp,
        eventCode: 'auth.password.change_failed',
        category: 'security',
        module: 'auth',
        action: 'password_change',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: account.own.alias ?? null,
        entityType: 'admin_account',
        entityId: scope.idAdminAcct,
        entityLabel: account.own.alias ?? null,
        outcome: 'failure',
        metadata: { reason: 'current_password_mismatch' },
        httpStatus: 400,
      });
      return sendError(
        res,
        400,
        'ADMIN_PASSWORD_CURRENT_INVALID',
        'The current password is not correct',
      );
    }

    issueAccessToken(
      res,
      {
        id_admin_acct: scope.idAdminAcct,
        alias: account.own.alias,
        id_access: scope.idAccess,
        token_version: Number(account.own.token_version ?? 0) + 1,
      },
      req.user?.exp,
    );

    return sendSuccess(res, 200, 'ADMIN_PASSWORD_CHANGED', 'Password changed successfully', {
      id_admin_acct: keyhsid.idAdmin.encode(scope.idAdminAcct),
    });
  },
);

export default router;
