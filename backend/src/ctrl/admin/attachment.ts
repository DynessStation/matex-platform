// Attachments (uploaded files, the media library), under /api/v1/attachment.
// Contract: ops/e2e/write/attachment-api.spec.ts.
import express = require('express');
import { NextFunction, Response } from 'express';
import fs from 'fs/promises';
import multer from 'multer';
import { ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import os from 'os';
import path from 'path';

import db = require('../../db');
import keyhsid from '../../hsid';
import {
  AttachmentCollection,
  getAttachmentCollectionConfig,
} from '../../config/attachment.config';
import { AdminScope, getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import {
  StoredAttachment,
  buildAttachmentUrl,
  deleteStoredAttachment,
  storeAttachment,
} from '../../helper/attachment.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { parseListQuery, sortColumn, countOf } from '../../helper/list-query.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';

const { pool } = db;

const router = express.Router();

const SORTS: Record<string, string> = {
  newest: 'a.id_attachment DESC',
  oldest: 'a.id_attachment ASC',
  smallest: 'a.file_size ASC, a.id_attachment DESC',
  largest: 'a.file_size DESC, a.id_attachment DESC',
};

// Every table that points at attachment, with the name reported for it. An attachment any of
// them still uses cannot be deleted.
const REFERENCES: [table: string, column: string, source: string][] = [
  ['admin_acct', 'id_profile_photo', 'admin_account.profile_photo'],
  ['office_attachment', 'id_attachment', 'office.attachment'],
  ['website_page_media', 'id_attachment', 'website_page.media'],
  ['article_attachment', 'id_attachment', 'article.attachment'],
  ['product_catalog_attachment', 'id_attachment', 'product.attachment'],
  ['product_category_attachment', 'id_attachment', 'product_category.attachment'],
];

const ATTACHMENT_COLUMNS = `id_attachment, collection_name, name, original_name, file_name,
  mime_type, extension, disk, storage_path, file_size, width, height, id_master_comp, id_office,
  created_by_id, attachment_status`;

const MAX_FILES = 10;
const MAX_BULK = 100;

// Uploads go to temporary files, not memory (SEC-004); the upload route removes them. The size
// ceiling only has to allow the largest collection (50 MB product videos): each collection's
// own limits are checked by storeAttachment.
const upload = multer({
  dest: path.join(os.tmpdir(), 'matex-upload'),
  limits: { fileSize: 50 * 1024 * 1024, files: MAX_FILES },
});

const uploadAttachmentFiles = (req: AuthRequest, res: Response, next: NextFunction): void => {
  upload.array('files', MAX_FILES)(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      sendError(
        res,
        400,
        'ATTACHMENT_SERVER_FILE_SIZE_LIMIT',
        'Uploaded file exceeds the server file size limit',
      );
    } else if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_COUNT') {
      sendError(res, 400, 'ATTACHMENT_UPLOAD_LIMIT_EXCEEDED', 'Too many files were uploaded');
    } else {
      const message = error instanceof multer.MulterError ? error.message : '';
      sendError(
        res,
        400,
        'ATTACHMENT_UPLOAD_PROCESS_FAILED',
        message || 'Unable to process uploaded files',
      );
    }
  });
};

type QueryExecutor = { query: (sql: string, values: unknown[]) => Promise<any> };

/** Which of `ids` are still referenced, and where. */
export const getAttachmentReferences = async (ids: number[], executor: QueryExecutor = pool) => {
  const references: { idAttachment: number; source: string; total: number }[] = [];
  const placeholders = ids.map(() => '?').join(',');
  for (const [table, column, source] of REFERENCES) {
    const [rows] = await executor.query(
      `SELECT ${column} AS id_attachment, COUNT(*) AS total FROM ${table}
       WHERE ${column} IN (${placeholders}) GROUP BY ${column}`,
      ids,
    );
    for (const row of rows as any[]) {
      references.push({
        idAttachment: Number(row.id_attachment),
        source,
        total: Number(row.total),
      });
    }
  }
  return references;
};

/** Locks the live attachments among `ids` the admin may manage (own office unless full access). */
const lockAttachments = async (connection: PoolConnection, ids: number[], scope: AdminScope) => {
  const officeOnly = scope.isAllAccess !== 1;
  const [rows] = await connection.query(
    `SELECT ${ATTACHMENT_COLUMNS} FROM attachment
     WHERE id_attachment IN (${ids.map(() => '?').join(',')}) AND id_master_comp = ?
       AND attachment_status = 1 AND deleted_at IS NULL ${officeOnly ? 'AND id_office = ?' : ''}
     FOR UPDATE`,
    officeOnly ? [...ids, scope.idMasterComp, scope.idOffice] : [...ids, scope.idMasterComp],
  );
  return rows as any[];
};

const attachmentAudit = (row: any) => ({
  collection_name: row.collection_name,
  name: row.name,
  original_name: row.original_name,
  file_name: row.file_name,
  mime_type: row.mime_type,
  extension: row.extension,
  disk: row.disk,
  storage_path: row.storage_path,
  file_size: Number(row.file_size),
  width: row.width === null ? null : Number(row.width),
  height: row.height === null ? null : Number(row.height),
  id_master_comp: Number(row.id_master_comp),
  id_office: Number(row.id_office),
  created_by_id: Number(row.created_by_id),
  attachment_status: Number(row.attachment_status),
});

const auditBase = (req: AuthRequest, connection: PoolConnection, scope: AdminScope) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  idMasterComp: scope.idMasterComp,
  category: 'file' as const,
  module: 'attachment',
  actorType: 'admin' as const,
  actorId: scope.idAdminAcct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'attachment',
});

/** Soft-deletes locked attachments with an audit entry each, inside the transaction. */
const softDelete = async (
  req: AuthRequest,
  connection: PoolConnection,
  scope: AdminScope,
  attachments: any[],
  metadata: Record<string, unknown>,
) => {
  const ids = attachments.map((item) => Number(item.id_attachment));
  await connection.query(
    `UPDATE attachment SET attachment_status = 99, deleted_at = NOW(), updated = NOW()
     WHERE id_attachment IN (${ids.map(() => '?').join(',')})
       AND attachment_status = 1 AND deleted_at IS NULL`,
    ids,
  );
  for (const attachment of attachments) {
    const before = attachmentAudit(attachment);
    await writeAuditLog({
      ...auditBase(req, connection, scope),
      eventCode: 'attachment.deleted',
      action: 'delete',
      entityId: Number(attachment.id_attachment),
      entityLabel: attachment.original_name,
      before,
      after: { ...before, attachment_status: 99 },
      metadata: {
        delete_type: 'soft_delete',
        ...metadata,
        physical_cleanup_requested: attachment.disk === 'local',
      },
      httpStatus: 200,
    });
  }
};

// Called after commit: the rows are already deleted, so a failed file removal is only logged
// (the file can be cleaned up later).
const removeFiles = async (attachments: any[]) => {
  const results = await Promise.allSettled(
    attachments
      .filter((item) => item.disk === 'local')
      .map((item) => deleteStoredAttachment(item.storage_path)),
  );
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Delete attachment physical file error:', result.reason);
    }
  }
};

router.get(
  '/api/v1/attachment',
  verifyToken,
  requirePermission('attachment.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const { page, limit, offset, search, searchValue } = parseListQuery(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    const where = ['a.attachment_status = 1', 'a.deleted_at IS NULL', 'a.id_master_comp = ?'];
    const params: unknown[] = [scope.idMasterComp];
    if (scope.isAllAccess !== 1) {
      where.push('a.id_office = ?');
      params.push(scope.idOffice);
    }
    if (search) {
      where.push('(a.name LIKE ? OR a.original_name LIKE ? OR a.file_name LIKE ?)');
      params.push(searchValue, searchValue, searchValue);
    }
    const collection = typeof req.query.collection === 'string' ? req.query.collection.trim() : '';
    if (collection) {
      where.push('a.collection_name = ?');
      params.push(collection);
    }
    const mimeType = typeof req.query.mime_type === 'string' ? req.query.mime_type.trim() : '';
    if (mimeType) {
      where.push('a.mime_type LIKE ?');
      params.push(`${mimeType}%`);
    }
    const whereSql = where.join(' AND ');
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : '';
    const orderBy = sortColumn(SORTS, sort, SORTS.newest);

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM attachment a WHERE ${whereSql}`,
      params,
    );
    const total = Number((totalRows as any[])[0]?.total ?? 0);
    // Rows before search and filters, for "x of y" in the admin table.
    const totalAll = await countOf(
      pool,
      `SELECT COUNT(*) AS total FROM attachment a
       WHERE a.attachment_status = 1 AND a.deleted_at IS NULL AND a.id_master_comp = ?
         AND (? = 1 OR a.id_office = ?)`,
      [scope.idMasterComp, scope.isAllAccess === 1 ? 1 : 0, scope.idOffice],
    );

    const [rows] = await pool.query(
      `SELECT a.id_attachment, a.collection_name, a.name, a.original_name, a.file_name,
         a.mime_type, a.extension, a.disk, a.storage_path, a.file_size, a.width, a.height,
         a.created, a.updated
       FROM attachment a
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    // Where each file on this page is used (D-5), from the same tables the delete check reads.
    const ids = (rows as any[]).map((item) => Number(item.id_attachment));
    const usageById = new Map<number, { source: string; total: number }[]>();
    for (const reference of ids.length ? await getAttachmentReferences(ids) : []) {
      const usage = usageById.get(reference.idAttachment) ?? [];
      usage.push({ source: reference.source, total: reference.total });
      usageById.set(reference.idAttachment, usage);
    }

    const data = (rows as any[]).map((item) => ({
      id_attachment: keyhsid.idAttachment.encode(item.id_attachment),
      collection_name: item.collection_name,
      name: item.name,
      original_name: item.original_name,
      file_name: item.file_name,
      mime_type: item.mime_type,
      extension: item.extension,
      disk: item.disk,
      storage_path: item.storage_path,
      file_size: Number(item.file_size),
      width: item.width,
      height: item.height,
      asset_url: buildAttachmentUrl(item.storage_path),
      usage_total: (usageById.get(Number(item.id_attachment)) ?? []).reduce(
        (sum, usage) => sum + usage.total,
        0,
      ),
      usage: usageById.get(Number(item.id_attachment)) ?? [],
      created: item.created,
      updated: item.updated,
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_all: totalAll,
        length: data.length,
        total_pages: Math.ceil(total / limit),
        has_more: offset + data.length < total,
      },
    });
  },
);

// Stores the files first, then inserts the rows in one transaction; when anything fails, the
// stored files are removed again. The temporary upload files are always removed.
router.post(
  '/api/v1/attachment',
  verifyToken,
  requirePermission('attachment.create'),
  uploadAttachmentFiles,
  async (req: AuthRequest, res: Response) => {
    const uploads = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
    const stored: StoredAttachment[] = [];

    try {
      const scope = await getAdminScope(req);
      if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

      const collection = String(req.body?.collection ?? '').trim();
      const config = getAttachmentCollectionConfig(collection);
      if (!config) {
        return sendError(
          res,
          400,
          'ATTACHMENT_COLLECTION_INVALID',
          'Invalid attachment collection',
        );
      }
      if (!uploads.length) {
        return sendError(res, 400, 'ATTACHMENT_FILE_REQUIRED', 'At least one file is required');
      }
      if (uploads.length > config.maxFiles) {
        return sendError(
          res,
          400,
          'ATTACHMENT_COLLECTION_FILE_LIMIT_EXCEEDED',
          `A maximum of ${config.maxFiles} file(s) is allowed for this collection`,
          { max_files: config.maxFiles },
        );
      }

      const ids = await withTransaction(pool, async (connection) => {
        const created: number[] = [];
        for (const input of uploads) {
          const file = await storeAttachment(input, collection as AttachmentCollection);
          stored.push(file);
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
          created.push(Number(insert.insertId));
        }

        for (const [index, id] of created.entries()) {
          const file = stored[index];
          await writeAuditLog({
            ...auditBase(req, connection, scope),
            eventCode: 'attachment.uploaded',
            action: 'upload',
            entityId: id,
            entityLabel: file.original_name,
            after: {
              id_attachment: id,
              collection_name: file.collection_name,
              name: file.name,
              original_name: file.original_name,
              file_name: file.file_name,
              mime_type: file.mime_type,
              extension: file.extension,
              disk: file.disk,
              storage_path: file.storage_path,
              file_size: file.file_size,
              width: file.width,
              height: file.height,
              id_master_comp: scope.idMasterComp,
              id_office: scope.idOffice,
              created_by_id: scope.idAdminAcct,
              attachment_status: 1,
            },
            metadata: { collection: file.collection_name, upload_batch_size: created.length },
            httpStatus: 201,
          });
        }
        return created;
      });

      const data = stored.map((file, index) => ({
        id_attachment: keyhsid.idAttachment.encode(ids[index]),
        collection_name: file.collection_name,
        name: file.name,
        original_name: file.original_name,
        file_name: file.file_name,
        mime_type: file.mime_type,
        extension: file.extension,
        disk: file.disk,
        storage_path: file.storage_path,
        file_size: file.file_size,
        width: file.width,
        height: file.height,
        asset_url: file.asset_url,
      }));
      const several = data.length > 1;
      return sendSuccess(
        res,
        201,
        several ? 'ATTACHMENTS_UPLOADED' : 'ATTACHMENT_UPLOADED',
        several ? 'Attachments uploaded successfully' : 'Attachment uploaded successfully',
        data,
      );
    } catch (error) {
      await Promise.allSettled(stored.map((file) => deleteStoredAttachment(file.storage_path)));
      throw error;
    } finally {
      await Promise.allSettled(uploads.map((input) => fs.unlink(input.path)));
    }
  },
);

router.delete(
  '/api/v1/attachment/:id',
  verifyToken,
  requirePermission('attachment.delete'),
  async (req: AuthRequest, res: Response) => {
    const idAttachment = decodeId(req.params.id, keyhsid.idAttachment);
    if (!idAttachment) {
      return sendError(res, 400, 'ATTACHMENT_INVALID_ID', 'Invalid attachment identifier');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const attachments = await withTransaction(pool, async (connection) => {
      const rows = await lockAttachments(connection, [idAttachment], scope);
      if (!rows.length) throw new HttpError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment not found');
      if ((await getAttachmentReferences([idAttachment], connection)).length) {
        throw new HttpError(409, 'ATTACHMENT_IN_USE', 'Attachment is currently in use');
      }
      await softDelete(req, connection, scope, rows, {});
      return rows;
    });
    await removeFiles(attachments);

    return sendSuccess(res, 200, 'ATTACHMENT_DELETED', 'Attachment deleted successfully', {
      id_attachment: keyhsid.idAttachment.encode(idAttachment),
    });
  },
);

// All or nothing: every attachment must exist in the admin's scope and be unused.
router.post(
  '/api/v1/attachment/bulk-delete',
  verifyToken,
  requirePermission('attachment.delete'),
  async (req: AuthRequest, res: Response) => {
    const encodedIds: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!encodedIds.length) {
      return sendError(res, 400, 'ATTACHMENT_BULK_REQUIRED', 'At least one attachment is required');
    }
    if (encodedIds.length > MAX_BULK) {
      return sendError(
        res,
        400,
        'ATTACHMENT_BULK_LIMIT_EXCEEDED',
        `A maximum of ${MAX_BULK} attachments can be deleted at once`,
        { max_items: MAX_BULK },
      );
    }
    const decodedIds = encodedIds.map((value) => decodeId(value, keyhsid.idAttachment));
    if (decodedIds.some((id) => !id)) {
      return sendError(
        res,
        400,
        'ATTACHMENT_BULK_INVALID_ID',
        'One or more attachment identifiers are invalid',
      );
    }
    const ids = Array.from(new Set(decodedIds as number[]));

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const attachments = await withTransaction(pool, async (connection) => {
      const rows = await lockAttachments(connection, ids, scope);
      if (rows.length !== ids.length) {
        throw new HttpError(
          404,
          'ATTACHMENT_BULK_NOT_FOUND',
          'One or more attachments were not found',
        );
      }
      const references = await getAttachmentReferences(ids, connection);
      if (references.length) {
        const blocked = new Set(references.map((item) => item.idAttachment));
        throw new HttpError(
          409,
          'ATTACHMENT_BULK_IN_USE',
          'One or more attachments are currently in use',
          { blocked_ids: [...blocked].map((id) => keyhsid.idAttachment.encode(id)) },
        );
      }
      await softDelete(req, connection, scope, rows, {
        bulk_delete: true,
        bulk_size: rows.length,
      });
      return rows;
    });
    await removeFiles(attachments);

    return sendSuccess(res, 200, 'ATTACHMENTS_DELETED', 'Attachments deleted successfully', {
      deleted: ids.length,
    });
  },
);

export default router;
