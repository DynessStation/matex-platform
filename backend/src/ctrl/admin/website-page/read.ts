// Fixed website page detail.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { getAdminScope } from '../../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { buildAttachmentUrl } from '../../../helper/attachment.helper';
import { parseJsonValue } from '../../../helper/json.helper';
import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { getEffectiveStatus, readPageKey } from './input';

const { pool } = db;

const router = express.Router();

router.get(
  '/api/v1/website-page/:key',
  verifyToken,
  requirePermission('website_page.view'),
  async (req: AuthRequest, res: Response) => {
    const pageKey = readPageKey(req.params.key);
    if (!pageKey) {
      return sendError(res, 404, 'WEBSITE_PAGE_NOT_FOUND', 'Fixed website page not found');
    }

    const scope = await getAdminScope(req);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);

    const [pageRows] = await pool.query<RowDataPacket[]>(
      `SELECT page.id_website_page, page.website_page_key, page.website_page_default_locale,
         page.website_page_is_published, page.website_page_publish_at,
         page.website_page_unpublish_at, page.created, page.updated,
         creator.alias AS created_by_alias, updater.alias AS updated_by_alias
       FROM website_page page
       LEFT JOIN admin_acct creator ON creator.id_admin_acct = page.id_created_by
       LEFT JOIN admin_acct updater ON updater.id_admin_acct = page.id_updated_by
       WHERE page.id_master_comp = ? AND page.website_page_key = ?
       LIMIT 1`,
      [scope.idMasterComp, pageKey],
    );
    const page = pageRows[0];
    if (!page) {
      return sendError(res, 404, 'WEBSITE_PAGE_NOT_FOUND', 'Fixed website page not found');
    }

    const [translationRows] = await pool.query<RowDataPacket[]>(
      `SELECT website_page_locale, website_page_path, website_page_title, website_page_summary,
         website_page_body_html, website_page_content_json, website_page_seo_title,
         website_page_seo_description, website_page_seo_keywords, website_page_seo_robots,
         website_page_canonical_url, website_page_social_title, website_page_social_description,
         website_page_schema_json, website_page_translation_is_published, created, updated
       FROM website_page_i18n
       WHERE id_website_page = ? AND id_master_comp = ?
       ORDER BY website_page_locale`,
      [page.id_website_page, scope.idMasterComp],
    );

    // One row per media text: grouped back into one entry per page media.
    const [mediaRows] = await pool.query<RowDataPacket[]>(
      `SELECT relation.id_website_page_media, relation.id_attachment,
         relation.website_page_media_slot, relation.website_page_media_sort_order,
         relation.website_page_media_is_visible, relation.website_page_media_click_action,
         relation.website_page_media_click_target, relation.created, relation.updated,
         attachment.collection_name, attachment.name, attachment.original_name,
         attachment.file_name, attachment.mime_type, attachment.extension, attachment.file_size,
         attachment.width, attachment.height, attachment.storage_path,
         media_text.website_page_media_locale, media_text.website_page_media_caption,
         media_text.website_page_media_alt_text
       FROM website_page_media relation
       INNER JOIN attachment ON attachment.id_attachment = relation.id_attachment
       LEFT JOIN website_page_media_i18n media_text
         ON media_text.id_website_page_media = relation.id_website_page_media
       WHERE relation.id_website_page = ? AND attachment.id_master_comp = ?
         AND attachment.attachment_status = 1 AND attachment.deleted_at IS NULL
       ORDER BY relation.website_page_media_sort_order, relation.id_website_page_media,
         media_text.website_page_media_locale`,
      [page.id_website_page, scope.idMasterComp],
    );

    const mediaByRelation = new Map<number, any>();
    for (const row of mediaRows) {
      const relationId = Number(row.id_website_page_media);
      let media = mediaByRelation.get(relationId);
      if (!media) {
        media = {
          id_attachment: keyhsid.idAttachment.encode(Number(row.id_attachment)),
          slot: String(row.website_page_media_slot),
          sort_order: Number(row.website_page_media_sort_order),
          is_visible: Number(row.website_page_media_is_visible) === 1,
          click_action: String(row.website_page_media_click_action),
          click_target: row.website_page_media_click_target ?? null,
          collection_name: row.collection_name,
          name: row.name,
          original_name: row.original_name,
          file_name: row.file_name,
          mime_type: row.mime_type,
          extension: row.extension,
          file_size: Number(row.file_size),
          width: row.width === null ? null : Number(row.width),
          height: row.height === null ? null : Number(row.height),
          asset_url: buildAttachmentUrl(row.storage_path),
          translations: [],
          created: row.created,
          updated: row.updated,
        };
        mediaByRelation.set(relationId, media);
      }
      if (row.website_page_media_locale) {
        media.translations.push({
          locale: String(row.website_page_media_locale),
          caption: row.website_page_media_caption ?? null,
          alt_text: row.website_page_media_alt_text ?? null,
        });
      }
    }

    const isPublished = Number(page.website_page_is_published);
    return sendSuccess(res, 200, 'WEBSITE_PAGE_DETAIL_FETCHED', 'Fixed website page loaded', {
      key: String(page.website_page_key),
      default_locale: String(page.website_page_default_locale),
      is_published: isPublished === 1,
      effective_status: getEffectiveStatus(
        isPublished,
        page.website_page_publish_at,
        page.website_page_unpublish_at,
      ),
      publish_at: page.website_page_publish_at ?? null,
      unpublish_at: page.website_page_unpublish_at ?? null,
      translations: translationRows.map((translation) => ({
        locale: String(translation.website_page_locale),
        path: String(translation.website_page_path),
        title: String(translation.website_page_title),
        summary: translation.website_page_summary ?? null,
        body_html: translation.website_page_body_html ?? null,
        content: parseJsonValue(translation.website_page_content_json),
        seo: {
          title: translation.website_page_seo_title ?? null,
          description: translation.website_page_seo_description ?? null,
          keywords: translation.website_page_seo_keywords ?? null,
          robots: translation.website_page_seo_robots ?? null,
          canonical_url: translation.website_page_canonical_url ?? null,
          social_title: translation.website_page_social_title ?? null,
          social_description: translation.website_page_social_description ?? null,
          schema: parseJsonValue(translation.website_page_schema_json),
        },
        is_published: Number(translation.website_page_translation_is_published) === 1,
        created: translation.created,
        updated: translation.updated,
      })),
      media: [...mediaByRelation.values()],
      created_by: page.created_by_alias ?? null,
      updated_by: page.updated_by_alias ?? null,
      created: page.created,
      updated: page.updated,
    });
  },
);

export default router;
