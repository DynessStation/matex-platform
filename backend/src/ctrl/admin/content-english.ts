// English that follows Indonesian (V1.2 Part 3, stage 4), under /api/v1/content-english.
// The admin forms send the Indonesian text of every English field that was never edited by
// hand; the answer fills those fields before the record is saved through its own endpoint.
// Afterwards the form stores where each English field came from (auto, manual, copy).
// Unlike the one-button assistant, titles and names are translated too (owner, 13 Nov 2026).
// Contract: ops/e2e/write/content-english-api.spec.ts.
import express = require('express');
import { NextFunction, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';

import db = require('../../db');
import { AdminScope, getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import {
  ContentAiError,
  askContentAi,
  cleanFieldTypes,
  cleanRecord,
  translateTask,
} from '../../helper/content-ai.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

/** The content types with English fields, and the permissions that read and write them. */
const CONTENT_TYPES: Record<string, { view: string; write: string[] }> = {
  product: { view: 'product.view', write: ['product.create', 'product.update'] },
  product_category: {
    view: 'product_category.view',
    write: ['product_category.create', 'product_category.update'],
  },
  article: { view: 'article.view', write: ['article.create', 'article.update'] },
  faq: { view: 'faq.view', write: ['faq.create', 'faq.update'] },
  website_page: { view: 'website_page.view', write: ['website_page.update'] },
};

const SOURCES = new Set(['auto', 'manual', 'copy']);
const MAX_FIELDS = 60;
const MAX_SOURCES = 500;

const typeOf = (value: unknown) =>
  typeof value === 'string' && Object.hasOwn(CONTENT_TYPES, value) ? value : null;

const forType =
  (kind: 'view' | 'write') =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    const type = typeOf(req.params.type ?? req.body?.content_type);
    if (!type) {
      sendError(res, 400, 'CONTENT_ENGLISH_TYPE_INVALID', 'Unknown content type');
      return;
    }
    const rule = CONTENT_TYPES[type];
    void requirePermission(kind === 'view' ? rule.view : rule.write)(req, res, next);
  };

const scopeOf = async (req: AuthRequest, res: Response): Promise<AdminScope | null> => {
  const scope = await getAdminScope(req, pool);
  if (scope.success) return scope;
  sendError(res, scope.status, scope.code, scope.message);
  return null;
};

const refOf = (value: unknown) =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : null;

/** Indonesian in, English out, for at most 60 fields; the keys come back as they were sent. */
router.post(
  '/api/v1/content-english/translate',
  verifyToken,
  forType('write'),
  onFailure('CONTENT_ENGLISH_FAILED', 'Unable to translate'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const fields = cleanRecord(req.body?.fields, MAX_FIELDS);
    const types = fields ? cleanFieldTypes(req.body?.field_types, Object.keys(fields)) : null;
    if (!fields || !types) {
      return sendError(
        res,
        400,
        'CONTENT_ENGLISH_PAYLOAD_INVALID',
        'Translation request is invalid',
      );
    }
    try {
      const result = await askContentAi({
        task: translateTask('id-ID', 'en-US'),
        contentType: String(req.body.content_type),
        context: String(req.body?.context ?? '').slice(0, 4000),
        fields,
        fieldTypes: types,
      });
      return sendSuccess(res, 200, 'CONTENT_ENGLISH_TRANSLATED', 'Translated', { fields: result });
    } catch (error) {
      if (error instanceof ContentAiError)
        return sendError(res, error.status, error.code, error.message);
      throw error;
    }
  },
);

/** Where each English field of one record came from: { field: auto | manual | copy }. */
router.get(
  '/api/v1/content-english/:type/:ref',
  verifyToken,
  forType('view'),
  onFailure('CONTENT_ENGLISH_FAILED', 'Unable to load the English sources'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const ref = refOf(req.params.ref);
    if (!ref) return sendError(res, 400, 'CONTENT_ENGLISH_REF_INVALID', 'Invalid record reference');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT field_key, source FROM content_en_source
       WHERE id_master_comp = ? AND content_type = ? AND content_ref = ?`,
      [scope.idMasterComp, req.params.type, ref],
    );
    const sources: Record<string, string> = {};
    for (const row of rows) sources[String(row.field_key)] = String(row.source);
    return sendSuccess(res, 200, 'CONTENT_ENGLISH_FOUND', 'English sources loaded', { sources });
  },
);

/** Replaces the sources of one record. Sent by the form right after the record is saved. */
router.put(
  '/api/v1/content-english/:type/:ref',
  verifyToken,
  forType('write'),
  onFailure('CONTENT_ENGLISH_FAILED', 'Unable to save the English sources'),
  async (req: AuthRequest, res: Response) => {
    const scope = await scopeOf(req, res);
    if (!scope) return;
    const ref = refOf(req.params.ref);
    if (!ref) return sendError(res, 400, 'CONTENT_ENGLISH_REF_INVALID', 'Invalid record reference');
    const raw = req.body?.sources;
    const entries =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.entries(raw) : null;
    if (
      !entries ||
      entries.length > MAX_SOURCES ||
      entries.some(
        ([key, value]) =>
          !/^[A-Za-z0-9_.-]{1,191}$/.test(key) || typeof value !== 'string' || !SOURCES.has(value),
      )
    ) {
      return sendError(res, 400, 'CONTENT_ENGLISH_SOURCES_INVALID', 'Check the English sources');
    }
    await withTransaction(pool, async (connection) => {
      await connection.query(
        `DELETE FROM content_en_source WHERE id_master_comp = ? AND content_type = ? AND content_ref = ?`,
        [scope.idMasterComp, req.params.type, ref],
      );
      if (entries.length) {
        await connection.query(
          `INSERT INTO content_en_source (id_master_comp, content_type, content_ref, field_key, source, id_updated_by)
           VALUES ?`,
          [
            entries.map(([key, value]) => [
              scope.idMasterComp,
              req.params.type,
              ref,
              key,
              value,
              scope.idAdminAcct,
            ]),
          ],
        );
      }
    });
    return sendSuccess(res, 200, 'CONTENT_ENGLISH_SAVED', 'English sources saved', {
      fields: entries.length,
    });
  },
);

export default router;
