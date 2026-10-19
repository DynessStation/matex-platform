// Fixed website page save: publication, both translations, and the page media, replaced as a
// whole in one transaction.
import express = require('express');
import { Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import db = require('../../../db');
import { validateWebsiteHomeMedia } from '../../../config/website-home.config';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { HttpError, isHttpError } from '../../../helper/http-error.helper';
import { withTransaction } from '../../../helper/transaction.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { SavePayload, readPageKey, readSavePayload } from './input';

const { pool } = db;

const router = express.Router();

const PAGE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Checks that every selected image is a live media-library image that fits its slot. */
const assertMediaUsable = async (
  connection: PoolConnection,
  pageKey: string,
  media: SavePayload['media'],
  idMasterComp: number,
) => {
  if (!media.length) return;
  const ids = media.map((item) => item.idAttachment);
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id_attachment, mime_type, width, height
     FROM attachment
     WHERE id_attachment IN (${ids.map(() => '?').join(', ')}) AND id_master_comp = ?
       AND collection_name = 'media_library' AND attachment_status = 1 AND deleted_at IS NULL`,
    [...ids, idMasterComp],
  );
  const attachmentById = new Map(rows.map((row) => [Number(row.id_attachment), row]));
  if (attachmentById.size !== ids.length) {
    throw new HttpError(
      400,
      'WEBSITE_PAGE_MEDIA_UNAVAILABLE',
      'One or more selected images are unavailable',
    );
  }

  for (const item of media) {
    const attachment = attachmentById.get(item.idAttachment)!;
    if (!PAGE_IMAGE_TYPES.includes(String(attachment.mime_type))) {
      throw new HttpError(
        400,
        'WEBSITE_PAGE_MEDIA_TYPE_INVALID',
        'Page images must use JPEG, PNG, or WebP',
      );
    }
    if (pageKey === 'home' && item.slot !== 'og') {
      const issue = validateWebsiteHomeMedia(item.slot, {
        mimeType: String(attachment.mime_type),
        width: attachment.width === null ? null : Number(attachment.width),
        height: attachment.height === null ? null : Number(attachment.height),
      });
      if (issue) throw new HttpError(400, issue.code, issue.message, { slot: item.slot });
    }
  }
};

const saveTranslations = async (
  connection: PoolConnection,
  idWebsitePage: number,
  idMasterComp: number,
  translations: SavePayload['translations'],
) => {
  for (const translation of translations) {
    await connection.query(
      `INSERT INTO website_page_i18n (id_website_page, id_master_comp, website_page_locale,
         website_page_path, website_page_title, website_page_summary, website_page_body_html,
         website_page_content_json, website_page_seo_title, website_page_seo_description,
         website_page_seo_keywords, website_page_seo_robots, website_page_canonical_url,
         website_page_social_title, website_page_social_description, website_page_schema_json,
         website_page_translation_is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         website_page_path = VALUES(website_page_path),
         website_page_title = VALUES(website_page_title),
         website_page_summary = VALUES(website_page_summary),
         website_page_body_html = VALUES(website_page_body_html),
         website_page_content_json = VALUES(website_page_content_json),
         website_page_seo_title = VALUES(website_page_seo_title),
         website_page_seo_description = VALUES(website_page_seo_description),
         website_page_seo_keywords = VALUES(website_page_seo_keywords),
         website_page_seo_robots = VALUES(website_page_seo_robots),
         website_page_canonical_url = VALUES(website_page_canonical_url),
         website_page_social_title = VALUES(website_page_social_title),
         website_page_social_description = VALUES(website_page_social_description),
         website_page_schema_json = VALUES(website_page_schema_json),
         website_page_translation_is_published = VALUES(website_page_translation_is_published),
         updated = NOW()`,
      [
        idWebsitePage,
        idMasterComp,
        translation.locale,
        translation.path,
        translation.title,
        translation.summary,
        translation.bodyHtml,
        translation.content === null ? null : JSON.stringify(translation.content),
        translation.seoTitle,
        translation.seoDescription,
        translation.seoKeywords,
        translation.seoRobots,
        translation.canonicalUrl,
        translation.socialTitle,
        translation.socialDescription,
        translation.schema === null ? null : JSON.stringify(translation.schema),
        translation.isPublished,
      ],
    );
  }
};

const replaceMedia = async (
  connection: PoolConnection,
  idWebsitePage: number,
  media: SavePayload['media'],
) => {
  await connection.query('DELETE FROM website_page_media WHERE id_website_page = ?', [
    idWebsitePage,
  ]);
  for (const item of media) {
    const [insert] = await connection.query<ResultSetHeader>(
      `INSERT INTO website_page_media (id_website_page, id_attachment, website_page_media_slot,
         website_page_media_sort_order, website_page_media_is_visible,
         website_page_media_click_action, website_page_media_click_target)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        idWebsitePage,
        item.idAttachment,
        item.slot,
        item.sortOrder,
        item.isVisible,
        item.clickAction,
        item.clickTarget,
      ],
    );
    for (const text of item.translations) {
      await connection.query(
        `INSERT INTO website_page_media_i18n (id_website_page_media, website_page_media_locale,
           website_page_media_caption, website_page_media_alt_text)
         VALUES (?, ?, ?, ?)`,
        [insert.insertId, text.locale, text.caption, text.altText],
      );
    }
  }
};

router.put(
  '/api/v1/website-page/:key',
  verifyToken,
  requirePermission('website_page.update'),
  onFailure('WEBSITE_PAGE_SAVE_FAILED', 'Unable to save fixed website page', {
    duplicate: {
      code: 'WEBSITE_PAGE_CONFLICT',
      message: 'A localized website address is already in use',
    },
  }),
  async (req: AuthRequest, res: Response) => {
    const pageKey = readPageKey(req.params.key);
    if (!pageKey) {
      return sendError(res, 404, 'WEBSITE_PAGE_NOT_FOUND', 'Fixed website page not found');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    let payload: SavePayload;
    try {
      payload = readSavePayload(pageKey, req.body);
    } catch (error) {
      // Any other failure while reading the body is still a bad request.
      if (isHttpError(error)) throw error;
      throw new HttpError(400, 'WEBSITE_PAGE_PAYLOAD_INVALID', 'Website page data is invalid');
    }

    await withTransaction(pool, async (connection) => {
      const [pageRows] = await connection.query<RowDataPacket[]>(
        `SELECT id_website_page, website_page_is_published
         FROM website_page
         WHERE id_master_comp = ? AND website_page_key = ?
         LIMIT 1
         FOR UPDATE`,
        [scope.idMasterComp, pageKey],
      );
      const page = pageRows[0];
      if (!page) {
        throw new HttpError(404, 'WEBSITE_PAGE_NOT_FOUND', 'Fixed website page not found');
      }
      const idWebsitePage = Number(page.id_website_page);

      await assertMediaUsable(connection, pageKey, payload.media, scope.idMasterComp);

      // An unpublished page keeps no publication window.
      await connection.query(
        `UPDATE website_page
         SET website_page_is_published = ?, website_page_publish_at = ?,
           website_page_unpublish_at = ?, id_updated_by = ?, updated = NOW()
         WHERE id_website_page = ? AND id_master_comp = ?`,
        [
          payload.isPublished,
          payload.isPublished ? payload.publishAt : null,
          payload.isPublished ? payload.unpublishAt : null,
          scope.idAdminAcct,
          idWebsitePage,
          scope.idMasterComp,
        ],
      );
      await saveTranslations(connection, idWebsitePage, scope.idMasterComp, payload.translations);
      await replaceMedia(connection, idWebsitePage, payload.media);

      await writeAuditLog({
        req,
        connection,
        writeMode: 'strict',
        idMasterComp: scope.idMasterComp,
        eventCode: 'website_page.updated',
        category: 'data_change',
        module: 'website_page',
        action: 'update',
        actorType: 'admin',
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: 'website_page',
        entityId: idWebsitePage,
        entityLabel: pageKey,
        before: { is_published: Number(page.website_page_is_published) === 1 },
        after: {
          is_published: payload.isPublished === 1,
          translations: payload.translations.map((item) => ({
            locale: item.locale,
            is_published: item.isPublished === 1,
          })),
          media_slots: payload.media.map((item) => item.slot),
        },
        httpStatus: 200,
      });
    });

    return sendSuccess(res, 200, 'WEBSITE_PAGE_UPDATED', 'Fixed website page saved', {
      key: pageKey,
    });
  },
);

export default router;
