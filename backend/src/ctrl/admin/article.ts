// Articles (both languages per article, thumbnail and share image), under /api/v1/articles.
// The public list and detail are ctrl/public/article.ts.
// Contract: ops/e2e/write/article-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../db');
import keyhsid from '../../hsid';
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from '../../config/public-content.config';
import { AdminScope, getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../helper/attachment.helper';
import { writeAuditLog } from '../../helper/audit-log.helper';
import { HttpError } from '../../helper/http-error.helper';
import { decodeId } from '../../helper/id.helper';
import { contentSlug } from '../../helper/input.helper';
import { sortColumn, countOf } from '../../helper/list-query.helper';
import { withTransaction } from '../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

const STATUSES = new Set(['draft', 'published', 'scheduled', 'archived']);

const SORTABLE: Record<string, string> = {
  title: 'i.article_title',
  created_at: 'a.created',
};

const CONFLICT = {
  code: 'ARTICLE_CONFLICT',
  message: 'Article key or localized slug already exists',
};

const dateOrNull = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ');
};

// Trimmed and cut to `max` characters (longer input is shortened, not refused).
const text = (value: unknown, max: number) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

const readTranslations = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const translations = [];
  const seen = new Set<string>();
  for (const item of value) {
    const locale = String(item?.locale ?? '');
    const slug = contentSlug(item?.slug);
    const title = text(item?.title, 500);
    const body = String(item?.body ?? '').trim();
    if (
      !isPublicContentLocale(locale) ||
      seen.has(locale) ||
      !slug ||
      !title ||
      !body ||
      /<script\b/i.test(body)
    ) {
      return null;
    }
    seen.add(locale);
    const schema = item?.schema_json ? String(item.schema_json).trim() : null;
    if (schema) {
      try {
        JSON.parse(schema);
      } catch {
        return null;
      }
    }
    translations.push({
      locale,
      slug,
      title,
      excerpt: text(item?.excerpt, 2000) || null,
      body,
      metaTitle: text(item?.meta_title, 255) || null,
      metaDescription: text(item?.meta_description, 500) || null,
      canonicalUrl: text(item?.canonical_url, 1000) || null,
      ogTitle: text(item?.og_title, 255) || null,
      ogDescription: text(item?.og_description, 500) || null,
      schemaJson: schema,
      status: Number(item?.status) === 0 ? 0 : 1,
    });
  }
  return PUBLIC_CONTENT_LOCALES.every((locale) => seen.has(locale)) ? translations : null;
};

/**
 * Status as admins read it: a published article whose publish time is still ahead is
 * "scheduled"; an older "scheduled" row whose time has passed is live, so "published".
 * `ahead` comes from SQL (publish time > UTC_TIMESTAMP()); times are stored in UTC.
 */
const effectiveStatus = (status: string, ahead: unknown, hasPublishTime: boolean): string => {
  const isAhead = Number(ahead) === 1;
  if (status === 'published' && isAhead) return 'scheduled';
  if (status === 'scheduled' && hasPublishTime && !isAhead) return 'published';
  return status;
};

/** The save body, or null when anything is missing or invalid. */
const payloadOf = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const status = String(body?.status ?? 'draft');
  const publishedAt = dateOrNull(body?.published_at);
  const unpublishedAt = dateOrNull(body?.unpublished_at);
  const thumbnailId = body?.thumbnail_id ? decodeId(body.thumbnail_id, keyhsid.idAttachment) : null;
  const ogImageId = body?.og_image_id ? decodeId(body.og_image_id, keyhsid.idAttachment) : null;
  if (
    !key ||
    key.length > 120 ||
    !STATUSES.has(status) ||
    (body?.thumbnail_id && !thumbnailId) ||
    (body?.og_image_id && !ogImageId)
  ) {
    return null;
  }
  if (status === 'scheduled' && !publishedAt) return null;
  if (publishedAt && unpublishedAt && publishedAt >= unpublishedAt) return null;
  const translations = readTranslations(body?.translations);
  if (!translations) return null;
  return {
    key,
    // A schedule is a published article with a future publish time: the public site shows it
    // from that time on, with no job to switch it (see effectiveStatus).
    status: status === 'scheduled' ? 'published' : status,
    publishedAt,
    unpublishedAt,
    thumbnailId,
    ogImageId,
    isFeatured: body?.is_featured ? 1 : 0,
    isSticky: body?.is_sticky ? 1 : 0,
    translations,
  };
};

type ArticlePayload = NonNullable<ReturnType<typeof payloadOf>>;

const mediaDto = (media: any) =>
  media
    ? {
        id_attachment: keyhsid.idAttachment.encode(Number(media.id_attachment)),
        asset_url: buildAttachmentUrl(media.storage_path),
        original_url: buildAttachmentUrl(media.storage_path),
        name: media.name ?? '',
        width: media.width == null ? null : Number(media.width),
        height: media.height == null ? null : Number(media.height),
        mime_type: media.mime_type ?? '',
      }
    : null;

const articleNotFound = (res: Response) =>
  sendError(res, 404, 'ARTICLE_NOT_FOUND', 'Article not found');

const auditBase = (
  req: AuthRequest,
  connection: PoolConnection,
  scope: AdminScope,
  idArticle: number,
) => ({
  req,
  connection,
  writeMode: 'strict' as const,
  idMasterComp: scope.idMasterComp,
  category: 'data_change' as const,
  module: 'article',
  actorType: 'admin' as const,
  actorId: scope.idAdminAcct,
  actorLabel: req.user?.alias ?? null,
  entityType: 'article',
  entityId: idArticle,
});

/** The live article (locked), or null. */
const lockArticle = async (connection: PoolConnection, idArticle: number, idMasterComp: number) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT article_key, article_status FROM article
     WHERE id_article = ? AND id_master_comp = ? AND article_deleted_at IS NULL FOR UPDATE`,
    [idArticle, idMasterComp],
  );
  return rows[0] ?? null;
};

const saveTranslations = async (
  connection: PoolConnection,
  idArticle: number,
  idMasterComp: number,
  translations: ArticlePayload['translations'],
) => {
  // The slug index is unique, so the upsert below would otherwise overwrite another article's
  // translation instead of failing (BE-013).
  for (const item of translations) {
    const [taken] = await connection.query<RowDataPacket[]>(
      `SELECT id_article FROM article_i18n
       WHERE id_master_comp = ? AND article_locale = ? AND article_slug = ? AND id_article <> ?
       LIMIT 1`,
      [idMasterComp, item.locale, item.slug, idArticle],
    );
    if (taken.length) throw new HttpError(409, CONFLICT.code, CONFLICT.message);
  }
  for (const item of translations) {
    await connection.query(
      `INSERT INTO article_i18n (id_article, id_master_comp, article_locale, article_slug,
         article_title, article_excerpt, article_body, article_meta_title,
         article_meta_description, article_canonical_url, article_og_title,
         article_og_description, article_schema_json, article_i18n_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE article_slug = VALUES(article_slug),
         article_title = VALUES(article_title), article_excerpt = VALUES(article_excerpt),
         article_body = VALUES(article_body), article_meta_title = VALUES(article_meta_title),
         article_meta_description = VALUES(article_meta_description),
         article_canonical_url = VALUES(article_canonical_url),
         article_og_title = VALUES(article_og_title),
         article_og_description = VALUES(article_og_description),
         article_schema_json = VALUES(article_schema_json),
         article_i18n_status = VALUES(article_i18n_status)`,
      [
        idArticle,
        idMasterComp,
        item.locale,
        item.slug,
        item.title,
        item.excerpt,
        item.body,
        item.metaTitle,
        item.metaDescription,
        item.canonicalUrl,
        item.ogTitle,
        item.ogDescription,
        item.schemaJson,
        item.status,
      ],
    );
  }
};

// Thumbnail and share image are replaced; any live attachment of the company can be used.
const saveMedia = async (
  connection: PoolConnection,
  idArticle: number,
  idMasterComp: number,
  payload: ArticlePayload,
) => {
  await connection.query(
    `DELETE FROM article_attachment
     WHERE id_article = ? AND article_attachment_role IN ('thumbnail', 'og')`,
    [idArticle],
  );
  for (const [role, idAttachment] of [
    ['thumbnail', payload.thumbnailId],
    ['og', payload.ogImageId],
  ] as const) {
    if (!idAttachment) continue;
    const [valid] = await connection.query<RowDataPacket[]>(
      `SELECT id_attachment FROM attachment
       WHERE id_attachment = ? AND id_master_comp = ? AND attachment_status = 1
         AND deleted_at IS NULL`,
      [idAttachment, idMasterComp],
    );
    if (!valid.length) {
      throw new HttpError(400, 'ARTICLE_MEDIA_INVALID', 'Selected media is unavailable');
    }
    await connection.query(
      `INSERT INTO article_attachment (id_article, id_master_comp, id_attachment,
         article_attachment_role)
       VALUES (?, ?, ?, ?)`,
      [idArticle, idMasterComp, idAttachment, role],
    );
  }
};

/** Creates (`id` null) or updates an article with its translations and media. */
const save = async (req: AuthRequest, res: Response, id: number | null) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const payload = payloadOf(req.body);
  if (!payload) {
    return sendError(
      res,
      400,
      'ARTICLE_PAYLOAD_INVALID',
      'Complete valid Indonesian and English article content',
    );
  }

  const idArticle = await withTransaction(pool, async (connection) => {
    let articleId: number;
    if (id) {
      if (!(await lockArticle(connection, id, scope.idMasterComp))) {
        throw new HttpError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
      }
      await connection.query(
        `UPDATE article SET article_key = ?, article_status = ?, article_is_featured = ?,
           article_is_sticky = ?, article_published_at = ?, article_unpublished_at = ?,
           id_updated_by = ?
         WHERE id_article = ?`,
        [
          payload.key,
          payload.status,
          payload.isFeatured,
          payload.isSticky,
          payload.publishedAt,
          payload.unpublishedAt,
          scope.idAdminAcct,
          id,
        ],
      );
      articleId = id;
    } else {
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO article (id_master_comp, article_key, article_status, article_is_featured,
           article_is_sticky, article_published_at, article_unpublished_at, id_author,
           id_created_by, id_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scope.idMasterComp,
          payload.key,
          payload.status,
          payload.isFeatured,
          payload.isSticky,
          payload.publishedAt,
          payload.unpublishedAt,
          scope.idAdminAcct,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );
      articleId = insert.insertId;
    }
    await saveTranslations(connection, articleId, scope.idMasterComp, payload.translations);
    await saveMedia(connection, articleId, scope.idMasterComp, payload);
    await writeAuditLog({
      ...auditBase(req, connection, scope, articleId),
      eventCode: id ? 'article.updated' : 'article.created',
      action: id ? 'update' : 'create',
      entityLabel: payload.key,
      after: payload,
      httpStatus: id ? 200 : 201,
    });
    return articleId;
  });

  return sendSuccess(
    res,
    id ? 200 : 201,
    id ? 'ARTICLE_UPDATED' : 'ARTICLE_CREATED',
    id ? 'Article updated' : 'Article created',
    { id: keyhsid.idArticle.encode(idArticle) },
  );
};

router.get(
  '/api/v1/articles',
  verifyToken,
  requirePermission('article.view'),
  onFailure('ARTICLE_LIST_FAILED', 'Unable to load articles'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? req.query.paginate) || 15));
    const locale = isPublicContentLocale(req.query.locale) ? req.query.locale : 'id-ID';
    const search = text(req.query.search, 200);
    const like = `%${search}%`;
    const sortField = sortColumn(SORTABLE, req.query.field, '');
    const direction = String(req.query.sort ?? '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const orderBy = sortField
      ? `${sortField} ${direction}, a.id_article DESC`
      : 'a.article_is_sticky DESC, COALESCE(a.article_published_at, a.created) DESC';

    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT a.id_article) total
       FROM article a
       LEFT JOIN article_i18n i ON i.id_article = a.id_article
       WHERE a.id_master_comp = ? AND a.article_deleted_at IS NULL
         AND (? = '' OR a.article_key LIKE ? OR i.article_title LIKE ?)`,
      [scope.idMasterComp, search, like, like],
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id_article, a.article_key, a.article_status, a.article_is_featured,
         a.article_is_sticky, a.article_published_at, a.created, a.updated,
         (a.article_published_at > UTC_TIMESTAMP()) AS publish_ahead,
         i.article_slug, i.article_title, i.article_excerpt, i.article_i18n_status,
         th.id_attachment, th.storage_path, th.name, th.width, th.height, th.mime_type
       FROM article a
       LEFT JOIN article_i18n i ON i.id_article = a.id_article AND i.article_locale = ?
       LEFT JOIN article_attachment aa ON aa.id_article = a.id_article
         AND aa.article_attachment_role = 'thumbnail' AND aa.article_attachment_sort_order = 0
       LEFT JOIN attachment th ON th.id_attachment = aa.id_attachment
       WHERE a.id_master_comp = ? AND a.article_deleted_at IS NULL
         AND (? = '' OR a.article_key LIKE ? OR i.article_title LIKE ?)
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [locale, scope.idMasterComp, search, like, like, limit, (page - 1) * limit],
    );

    return sendSuccess(res, 200, 'ARTICLES_LISTED', 'Articles loaded', {
      data: rows.map((row) => ({
        id: keyhsid.idArticle.encode(Number(row.id_article)),
        key: row.article_key,
        title: row.article_title ?? '',
        slug: row.article_slug ?? '',
        description: row.article_excerpt ?? '',
        status: effectiveStatus(
          row.article_status,
          row.publish_ahead,
          row.article_published_at != null,
        ),
        locale_status: Number(row.article_i18n_status ?? 0),
        is_featured: Boolean(row.article_is_featured),
        is_sticky: Boolean(row.article_is_sticky),
        published_at: row.article_published_at,
        created_at: row.created,
        updated_at: row.updated,
        blog_thumbnail: row.id_attachment ? mediaDto(row) : null,
      })),
      total: Number(counts[0]?.total ?? 0),
      total_all: await countOf(
        pool,
        `SELECT COUNT(*) AS total FROM article
         WHERE id_master_comp = ? AND article_deleted_at IS NULL`,
        [scope.idMasterComp],
      ),
      current_page: page,
      per_page: limit,
    });
  },
);

router.get(
  '/api/v1/articles/:id',
  verifyToken,
  requirePermission('article.view'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idArticle);
    if (!id) return articleNotFound(res);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT article_key, article_status, article_is_featured, article_is_sticky,
         article_published_at, article_unpublished_at,
         (article_published_at > UTC_TIMESTAMP()) AS publish_ahead
       FROM article WHERE id_article = ? AND id_master_comp = ? AND article_deleted_at IS NULL`,
      [id, scope.idMasterComp],
    );
    if (!rows.length) return articleNotFound(res);
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM article_i18n WHERE id_article = ? ORDER BY article_locale`,
      [id],
    );
    const [media] = await pool.query<RowDataPacket[]>(
      `SELECT aa.article_attachment_role, a.id_attachment, a.storage_path, a.name, a.width,
         a.height, a.mime_type
       FROM article_attachment aa
       JOIN attachment a ON a.id_attachment = aa.id_attachment
       WHERE aa.id_article = ? AND aa.article_attachment_sort_order = 0`,
      [id],
    );
    const byRole = new Map(media.map((item) => [item.article_attachment_role, item]));
    const row = rows[0];

    return sendSuccess(res, 200, 'ARTICLE_FOUND', 'Article loaded', {
      id: req.params.id,
      key: row.article_key,
      status: effectiveStatus(
        row.article_status,
        row.publish_ahead,
        row.article_published_at != null,
      ),
      is_featured: Boolean(row.article_is_featured),
      is_sticky: Boolean(row.article_is_sticky),
      published_at: row.article_published_at,
      unpublished_at: row.article_unpublished_at,
      thumbnail: mediaDto(byRole.get('thumbnail')),
      og_image: mediaDto(byRole.get('og')),
      translations: translations.map((item) => ({
        locale: item.article_locale,
        slug: item.article_slug,
        title: item.article_title,
        excerpt: item.article_excerpt ?? '',
        body: item.article_body,
        meta_title: item.article_meta_title ?? '',
        meta_description: item.article_meta_description ?? '',
        canonical_url: item.article_canonical_url ?? '',
        og_title: item.article_og_title ?? '',
        og_description: item.article_og_description ?? '',
        schema_json: item.article_schema_json ?? '',
        status: Number(item.article_i18n_status),
      })),
    });
  },
);

router.post(
  '/api/v1/articles',
  verifyToken,
  requirePermission('article.create'),
  onFailure('ARTICLE_SAVE_FAILED', 'Unable to save article', { duplicate: CONFLICT }),
  (req: AuthRequest, res: Response) => save(req, res, null),
);

router.put(
  '/api/v1/articles/:id',
  verifyToken,
  requirePermission('article.update'),
  onFailure('ARTICLE_SAVE_FAILED', 'Unable to save article', { duplicate: CONFLICT }),
  (req: AuthRequest, res: Response) => {
    const id = decodeId(req.params.id, keyhsid.idArticle);
    return id ? save(req, res, id) : articleNotFound(res);
  },
);

// Publishing an article without a publication date sets it to now.
router.patch(
  '/api/v1/articles/:id/status',
  verifyToken,
  requirePermission('article.update'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idArticle);
    const status = String(req.body?.status ?? '');
    if (!id || !STATUSES.has(status)) {
      return sendError(res, 400, 'ARTICLE_STATUS_INVALID', 'Invalid article status');
    }

    const found = await withTransaction(pool, async (connection) => {
      const article = await lockArticle(connection, id, scope.idMasterComp);
      if (!article) return false;
      await connection.query(
        `UPDATE article SET article_status = ?,
           article_published_at = CASE WHEN ? = 'published' AND article_published_at IS NULL
             THEN UTC_TIMESTAMP() ELSE article_published_at END,
           id_updated_by = ?
         WHERE id_article = ? AND id_master_comp = ? AND article_deleted_at IS NULL`,
        [status, status, scope.idAdminAcct, id, scope.idMasterComp],
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope, id),
        eventCode: 'article.status_updated',
        action: 'update_status',
        entityLabel: article.article_key,
        before: { status: article.article_status },
        after: { status },
        httpStatus: 200,
      });
      return true;
    });
    if (!found) return articleNotFound(res);
    return sendSuccess(res, 200, 'ARTICLE_STATUS_UPDATED', 'Article status updated', null);
  },
);

// Soft delete: the article keeps its key and slugs reserved.
router.delete(
  '/api/v1/articles/:id',
  verifyToken,
  requirePermission('article.delete'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const id = decodeId(req.params.id, keyhsid.idArticle);
    if (!id) return articleNotFound(res);

    const found = await withTransaction(pool, async (connection) => {
      const article = await lockArticle(connection, id, scope.idMasterComp);
      if (!article) return false;
      await connection.query(
        `UPDATE article SET article_deleted_at = NOW(), id_updated_by = ?
         WHERE id_article = ? AND id_master_comp = ?`,
        [scope.idAdminAcct, id, scope.idMasterComp],
      );
      await writeAuditLog({
        ...auditBase(req, connection, scope, id),
        eventCode: 'article.deleted',
        action: 'delete',
        entityLabel: article.article_key,
        before: { status: article.article_status },
        after: { deleted: true },
        httpStatus: 200,
      });
      return true;
    });
    if (!found) return articleNotFound(res);
    return sendSuccess(res, 200, 'ARTICLE_DELETED', 'Article moved to trash', null);
  },
);

export default router;
