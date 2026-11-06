import keyhsid from '../../hsid';
import { Router } from 'express';
import { RowDataPacket } from 'mysql2';
import {
  PUBLIC_READ_CACHE,
  PUBLIC_WHERE,
  TAG_PAGE_MIN_ARTICLES,
  isPublicContentLocale,
} from '../../config/public-content.config';
import { pool } from '../../db';
import { buildAttachmentUrl } from '../../helper/attachment.helper';
import { sendError, sendList, sendSuccess } from '../../helper/api-response.helper';
import { pageMeta, parseListQuery } from '../../helper/list-query.helper';
import { movedSlug, notFoundData } from '../../helper/slug-redirect.helper';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = Router();
const scope = (locale: unknown) => {
  const company = Number(process.env.PUBLIC_COMPANY_ID);
  return Number.isSafeInteger(company) && company > 0 && isPublicContentLocale(locale)
    ? { company, locale }
    : null;
};
const image = (row: RowDataPacket, prefix: string) =>
  row[`${prefix}_path`]
    ? {
        asset_url: buildAttachmentUrl(row[`${prefix}_path`]),
        original_url: buildAttachmentUrl(row[`${prefix}_path`]),
        name: row[`${prefix}_name`] ?? '',
        width: row[`${prefix}_width`] ?? null,
        height: row[`${prefix}_height`] ?? null,
      }
    : null;
const baseSelect = `SELECT a.id_article,a.article_author_name,a.article_is_featured,a.article_is_sticky,a.article_published_at,a.created,a.updated,i.article_slug,i.article_title,i.article_excerpt,i.article_body,i.article_meta_title,i.article_meta_description,i.article_canonical_url,i.article_og_title,i.article_og_description,i.article_schema_json,th.storage_path thumbnail_path,th.name thumbnail_name,th.width thumbnail_width,th.height thumbnail_height,og.storage_path og_path,og.name og_name,og.width og_width,og.height og_height,(SELECT ti.article_slug FROM article_i18n ti WHERE ti.id_article=a.id_article AND ti.id_master_comp=a.id_master_comp AND ti.article_locale='id-ID' AND ti.article_i18n_status=1 LIMIT 1) localized_slug_id,(SELECT te.article_slug FROM article_i18n te WHERE te.id_article=a.id_article AND te.id_master_comp=a.id_master_comp AND te.article_locale='en-US' AND te.article_i18n_status=1 LIMIT 1) localized_slug_en FROM article a JOIN article_i18n i ON i.id_article=a.id_article AND i.id_master_comp=a.id_master_comp LEFT JOIN article_attachment ath ON ath.id_article=a.id_article AND ath.article_attachment_role='thumbnail' AND ath.article_attachment_sort_order=0 AND ath.article_attachment_is_public=1 LEFT JOIN attachment th ON th.id_attachment=ath.id_attachment AND th.attachment_status=1 AND th.deleted_at IS NULL LEFT JOIN article_attachment aog ON aog.id_article=a.id_article AND aog.article_attachment_role='og' AND aog.article_attachment_sort_order=0 AND aog.article_attachment_is_public=1 LEFT JOIN attachment og ON og.id_attachment=aog.id_attachment AND og.attachment_status=1 AND og.deleted_at IS NULL`;
const publicWhere = PUBLIC_WHERE.article;
type PublicTag = { name: string; slug: string };

// Tags of the listed articles in one language.
const tagsOf = async (rows: RowDataPacket[], company: number, locale: string) => {
  const byArticle = new Map<number, PublicTag[]>();
  if (!rows.length) return byArticle;
  const [tags] = await pool.query<RowDataPacket[]>(
    `SELECT m.id_article, i.article_tag_name, i.article_tag_slug
     FROM article_tag_map m
     JOIN article_tag t ON t.id_article_tag = m.id_article_tag
     JOIN article_tag_i18n i ON i.id_article_tag = t.id_article_tag
     WHERE m.id_article IN (?) AND ${PUBLIC_WHERE.article_tag}
     ORDER BY i.article_tag_name`,
    [rows.map((row) => row.id_article), company, locale],
  );
  for (const tag of tags) {
    const list = byArticle.get(Number(tag.id_article)) ?? [];
    list.push({ name: tag.article_tag_name, slug: tag.article_tag_slug });
    byArticle.set(Number(tag.id_article), list);
  }
  return byArticle;
};

const dto = (row: RowDataPacket, tags: PublicTag[], detail = false) => ({
  id: keyhsid.idArticle.encode(Number(row.id_article)),
  title: row.article_title,
  slug: row.article_slug,
  localized_slugs: {
    'id-ID': row.localized_slug_id ?? row.article_slug,
    'en-US': row.localized_slug_en ?? row.article_slug,
  },
  description: row.article_excerpt ?? '',
  content: detail ? row.article_body : '',
  status: true,
  meta_title: row.article_meta_title ?? row.article_title,
  meta_description: row.article_meta_description ?? row.article_excerpt ?? '',
  canonical_url: row.article_canonical_url ?? '',
  og_title: row.article_og_title ?? row.article_meta_title ?? row.article_title,
  og_description:
    row.article_og_description ?? row.article_meta_description ?? row.article_excerpt ?? '',
  schema_json: row.article_schema_json ? JSON.parse(row.article_schema_json) : null,
  blog_thumbnail: image(row, 'thumbnail'),
  blog_meta_image: image(row, 'og') ?? image(row, 'thumbnail'),
  categories: [],
  tags,
  is_featured: Boolean(row.article_is_featured),
  is_sticky: Boolean(row.article_is_sticky),
  created_by: { name: row.article_author_name || 'MATEX', profile_image: null },
  has_author: Boolean(row.article_author_name),
  created_at: row.article_published_at ?? row.created,
  updated_at: row.updated,
});
router.get(
  '/api/public/articles/:locale',
  onFailure('ARTICLES_UNAVAILABLE', 'Unable to load articles'),
  async (req, res) => {
    res.setHeader('Cache-Control', PUBLIC_READ_CACHE);
    const s = scope(req.params.locale);
    if (!s) return sendError(res, 404, 'ARTICLES_NOT_FOUND', 'Articles not found');
    const {
      page,
      limit,
      offset,
      search,
      searchValue: like,
    } = parseListQuery(req.query, {
      defaultLimit: 12,
      maxLimit: 50,
    });
    // One tag's articles (the tag page).
    const tag = String(req.query.tag ?? '').trim();
    const tagWhere = tag
      ? `AND EXISTS (SELECT 1 FROM article_tag_map m JOIN article_tag_i18n ti
           ON ti.id_article_tag = m.id_article_tag AND ti.article_tag_locale = i.article_locale
           WHERE m.id_article = a.id_article AND ti.article_tag_slug = ?)`
      : '';
    const tagValues = tag ? [tag] : [];
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) total FROM article a JOIN article_i18n i ON i.id_article=a.id_article AND i.id_master_comp=a.id_master_comp WHERE ${publicWhere} AND (?='' OR i.article_title LIKE ? OR i.article_excerpt LIKE ?) ${tagWhere}`,
      [s.company, s.locale, search, like, like, ...tagValues],
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `${baseSelect} WHERE ${publicWhere} AND (?='' OR i.article_title LIKE ? OR i.article_excerpt LIKE ?) ${tagWhere} ORDER BY a.article_is_sticky DESC,COALESCE(a.article_published_at,a.created) DESC LIMIT ? OFFSET ?`,
      [s.company, s.locale, search, like, like, ...tagValues, limit, offset],
    );
    const tags = await tagsOf(rows, s.company, s.locale);
    return sendList(
      res,
      'ARTICLES_FOUND',
      'Articles loaded',
      rows.map((r) => dto(r, tags.get(Number(r.id_article)) ?? [])),
      pageMeta({ page, limit }, Number(counts[0]?.total ?? 0)),
    );
  },
);
router.get(
  '/api/public/articles/:locale/:slug',
  onFailure('ARTICLE_UNAVAILABLE', 'Unable to load article'),
  async (req, res) => {
    res.setHeader('Cache-Control', PUBLIC_READ_CACHE);
    const s = scope(req.params.locale);
    if (!s) return sendError(res, 404, 'ARTICLE_NOT_FOUND', 'Article not found');
    const [rows] = await pool.query<RowDataPacket[]>(
      `${baseSelect} WHERE ${publicWhere} AND i.article_slug=? LIMIT 1`,
      [s.company, s.locale, req.params.slug],
    );
    if (!rows.length) {
      const moved = await movedSlug(pool, 'article', s.company, s.locale, String(req.params.slug));
      return sendError(res, 404, 'ARTICLE_NOT_FOUND', 'Article not found', notFoundData(moved));
    }
    const tags = await tagsOf(rows, s.company, s.locale);
    return sendSuccess(
      res,
      200,
      'ARTICLE_FOUND',
      'Article loaded',
      dto(rows[0], tags.get(Number(rows[0].id_article)) ?? [], true),
    );
  },
);
// A tag's page: its name in this language, its address in the other, and how many articles it has.
// A tag no public article uses has no page.
router.get(
  '/api/public/article-tags/:locale/:slug',
  onFailure('ARTICLE_TAG_UNAVAILABLE', 'Unable to load the tag'),
  async (req, res) => {
    res.setHeader('Cache-Control', PUBLIC_READ_CACHE);
    const s = scope(req.params.locale);
    if (!s) return sendError(res, 404, 'ARTICLE_TAG_NOT_FOUND', 'Tag not found');
    const slug = String(req.params.slug);
    const [tags] = await pool.query<RowDataPacket[]>(
      `SELECT t.id_article_tag, i.article_tag_name, i.article_tag_slug,
         (SELECT o.article_tag_slug FROM article_tag_i18n o
          WHERE o.id_article_tag = t.id_article_tag AND o.article_tag_locale = 'id-ID') AS slug_id,
         (SELECT o.article_tag_slug FROM article_tag_i18n o
          WHERE o.id_article_tag = t.id_article_tag AND o.article_tag_locale = 'en-US') AS slug_en
       FROM article_tag t JOIN article_tag_i18n i ON i.id_article_tag = t.id_article_tag
       WHERE ${PUBLIC_WHERE.article_tag} AND i.article_tag_slug = ? LIMIT 1`,
      [s.company, s.locale, slug],
    );
    if (!tags.length) {
      const moved = await movedSlug(pool, 'article_tag', s.company, s.locale, slug);
      return sendError(res, 404, 'ARTICLE_TAG_NOT_FOUND', 'Tag not found', notFoundData(moved));
    }
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) total FROM article_tag_map m
       JOIN article a ON a.id_article = m.id_article
       JOIN article_i18n i ON i.id_article = a.id_article AND i.id_master_comp = a.id_master_comp
       WHERE m.id_article_tag = ? AND ${publicWhere}`,
      [tags[0].id_article_tag, s.company, s.locale],
    );
    const total = Number(counts[0]?.total ?? 0);
    if (!total) return sendError(res, 404, 'ARTICLE_TAG_NOT_FOUND', 'Tag not found');
    return sendSuccess(res, 200, 'ARTICLE_TAG_FOUND', 'Tag loaded', {
      name: tags[0].article_tag_name,
      slug: tags[0].article_tag_slug,
      localized_slugs: { 'id-ID': tags[0].slug_id, 'en-US': tags[0].slug_en },
      article_count: total,
      indexable: total >= TAG_PAGE_MIN_ARTICLES,
    });
  },
);
export default router;
