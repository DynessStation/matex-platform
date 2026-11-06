// Article tags, under /api/v1/article-tags: the list with how many articles use each, and the
// names per language (Kelola tag). New tags are made by saving an article (article-tag.helper.ts).
// Contract: ops/e2e/write/article-tag-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../db');
import keyhsid from '../../hsid';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { TAG_NAME_MAX } from '../../helper/article-tag.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { contentSlug } from '../../helper/input.helper';
import { recordSlugChanges } from '../../helper/slug-redirect.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

const notFound = (res: Response) =>
  sendError(res, 404, 'ARTICLE_TAG_NOT_FOUND', 'Article tag not found');

const nameOf = (value: unknown) => {
  const name = String(value ?? '').trim();
  if (!name || name.length > TAG_NAME_MAX || !contentSlug(name)) {
    throw new HttpError(400, 'ARTICLE_TAG_NAME_INVALID', 'Tag names are required');
  }
  return name;
};

router.get(
  '/api/v1/article-tags',
  verifyToken,
  requirePermission('article.view'),
  onFailure('ARTICLE_TAG_LIST_FAILED', 'Unable to load tags'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id_article_tag, t.article_tag_key,
         MAX(CASE WHEN i.article_tag_locale = 'id-ID' THEN i.article_tag_name END) AS name_id,
         MAX(CASE WHEN i.article_tag_locale = 'en-US' THEN i.article_tag_name END) AS name_en,
         (SELECT COUNT(*) FROM article_tag_map m
          JOIN article a ON a.id_article = m.id_article AND a.article_deleted_at IS NULL
          WHERE m.id_article_tag = t.id_article_tag) AS article_count
       FROM article_tag t
       JOIN article_tag_i18n i ON i.id_article_tag = t.id_article_tag
       WHERE t.id_master_comp = ? AND t.article_tag_deleted_at IS NULL
       GROUP BY t.id_article_tag
       ORDER BY article_count DESC, name_id`,
      [scope.idMasterComp],
    );
    return sendSuccess(
      res,
      200,
      'ARTICLE_TAGS_LISTED',
      'Tags loaded',
      rows.map((row) => ({
        id: keyhsid.idArticleTag.encode(Number(row.id_article_tag)),
        key: row.article_tag_key,
        name_id: row.name_id ?? '',
        name_en: row.name_en ?? '',
        article_count: Number(row.article_count),
      })),
    );
  },
);

// A changed name changes the tag's address; the old one keeps working (slug-redirect.helper.ts).
router.put(
  '/api/v1/article-tags/:id',
  verifyToken,
  requirePermission('article.update'),
  onFailure('ARTICLE_TAG_SAVE_FAILED', 'Unable to save the tag', {
    duplicate: { code: 'ARTICLE_TAG_EXISTS', message: 'Another tag has this name' },
  }),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idArticleTag);
    if (!id) return notFound(res);
    const names = [
      { locale: 'id-ID', name: nameOf(req.body?.name_id) },
      { locale: 'en-US', name: nameOf(req.body?.name_en) },
    ];
    const translations = names.map((item) => ({ ...item, slug: contentSlug(item.name) }));

    await withTransaction(pool, async (connection) => {
      const [found] = await connection.query<RowDataPacket[]>(
        `SELECT article_tag_key FROM article_tag
         WHERE id_article_tag = ? AND id_master_comp = ? AND article_tag_deleted_at IS NULL
         FOR UPDATE`,
        [id, scope.idMasterComp],
      );
      if (!found.length) throw new HttpError(404, 'ARTICLE_TAG_NOT_FOUND', 'Article tag not found');
      for (const item of translations) {
        const [taken] = await connection.query<RowDataPacket[]>(
          `SELECT 1 FROM article_tag_i18n
           WHERE id_master_comp = ? AND article_tag_locale = ? AND article_tag_slug = ?
             AND id_article_tag <> ? LIMIT 1`,
          [scope.idMasterComp, item.locale, item.slug, id],
        );
        if (taken.length) {
          throw new HttpError(409, 'ARTICLE_TAG_EXISTS', 'Another tag has this name');
        }
      }
      await recordSlugChanges(connection, 'article_tag', id, scope.idMasterComp, translations);
      for (const item of translations) {
        await connection.query(
          `UPDATE article_tag_i18n SET article_tag_name = ?, article_tag_slug = ?
           WHERE id_article_tag = ? AND article_tag_locale = ?`,
          [item.name, item.slug, id, item.locale],
        );
      }
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'article_tag.updated',
        category: 'data_change',
        module: 'article',
        action: 'update',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'article_tag',
        entityId: id,
        entityLabel: found[0].article_tag_key,
        after: { names },
        httpStatus: 200,
      });
    });
    return sendSuccess(res, 200, 'ARTICLE_TAG_UPDATED', 'Tag updated', {
      id: req.params.id,
      name_id: names[0].name,
      name_en: names[1].name,
    });
  },
);

// Only a tag no article uses can go. Writing its name again brings it back.
router.delete(
  '/api/v1/article-tags/:id',
  verifyToken,
  requirePermission('article.delete'),
  onFailure('ARTICLE_TAG_DELETE_FAILED', 'Unable to delete the tag'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idArticleTag);
    if (!id) return notFound(res);
    await withTransaction(pool, async (connection) => {
      const [found] = await connection.query<RowDataPacket[]>(
        `SELECT article_tag_key,
           (SELECT COUNT(*) FROM article_tag_map m
            JOIN article a ON a.id_article = m.id_article AND a.article_deleted_at IS NULL
            WHERE m.id_article_tag = t.id_article_tag) AS article_count
         FROM article_tag t
         WHERE id_article_tag = ? AND id_master_comp = ? AND article_tag_deleted_at IS NULL
         FOR UPDATE`,
        [id, scope.idMasterComp],
      );
      if (!found.length) throw new HttpError(404, 'ARTICLE_TAG_NOT_FOUND', 'Article tag not found');
      if (Number(found[0].article_count) > 0) {
        throw new HttpError(409, 'ARTICLE_TAG_IN_USE', 'Articles still use this tag');
      }
      await connection.query(
        `UPDATE article_tag SET article_tag_deleted_at = NOW(), article_tag_status = 0
         WHERE id_article_tag = ?`,
        [id],
      );
      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'article_tag.deleted',
        category: 'data_change',
        module: 'article',
        action: 'delete',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'article_tag',
        entityId: id,
        entityLabel: found[0].article_tag_key,
        httpStatus: 200,
      });
    });
    return sendSuccess(res, 200, 'ARTICLE_TAG_DELETED', 'Tag deleted', { id: req.params.id });
  },
);

export default router;
