import express = require('express');
import { Response } from 'express';

import db = require('../../db');
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import {
  ContentAiError,
  askContentAi,
  cleanFieldTypes,
  cleanRecord,
  translateTask,
} from '../../helper/content-ai.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';

// One AI button per field. Titles, names, labels, questions, slugs, and keys stay out of it on
// purpose (owner, 12 Oct 2026); English filled on save is ctrl/admin/content-english.ts.
const router = express.Router();
const { pool } = db;

type AssistMode = 'translate' | 'generate';

const protectedFieldPattern = /(^|_)(title|name|question|label|heading|headline|slug|key)(_|$)/i;

router.post(
  '/api/v1/content-assistant',
  verifyToken,
  requirePermission('content_assistant.use'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const mode = String(req.body?.mode ?? '') as AssistMode;
    const fields = cleanRecord(req.body?.fields);
    const requestedFieldTypes = fields
      ? cleanFieldTypes(req.body?.field_types, Object.keys(fields))
      : null;
    const sourceLocale = String(req.body?.source_locale ?? 'id-ID').slice(0, 12);
    const targetLocale = String(req.body?.target_locale ?? 'en-US').slice(0, 12);
    const contentType = String(req.body?.content_type ?? 'content').slice(0, 80);
    const context = String(req.body?.context ?? '').slice(0, 12000);

    if (!fields || !requestedFieldTypes || !['translate', 'generate'].includes(mode))
      return sendError(
        res,
        400,
        'CONTENT_ASSISTANT_PAYLOAD_INVALID',
        'Content assistant request is invalid',
      );

    const protectedFields = Object.keys(fields).filter((key) => protectedFieldPattern.test(key));
    if (protectedFields.length)
      return sendError(
        res,
        400,
        'CONTENT_ASSISTANT_FIELD_PROTECTED',
        'Titles, names, labels, questions, slugs, and keys must be written by the user',
      );

    const task =
      mode === 'translate'
        ? translateTask(sourceLocale, targetLocale)
        : `Write or improve every requested ${targetLocale} field for a ${contentType}. Use only the supplied context and current field values. Keep factual claims conservative. Follow each field format exactly.`;

    try {
      const result = await askContentAi({
        task,
        contentType,
        context,
        fields,
        fieldTypes: requestedFieldTypes,
      });
      return sendSuccess(res, 200, 'CONTENT_ASSISTANT_COMPLETED', 'Content assistant completed', {
        fields: result,
      });
    } catch (error) {
      if (error instanceof ContentAiError) {
        return sendError(res, error.status, error.code, error.message);
      }
      throw error;
    }
  },
);

export default router;
