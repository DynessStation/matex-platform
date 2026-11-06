// The insight band of the article list, under /api/v1/articles/insight: most read articles, the
// trend chart, the publishing score, and the data audit. Loaded before article.ts (file order),
// so these paths are not taken for an article id. Contract: ops/e2e/write/article-tag-api.spec.ts.
import express = require('express');
import { Response } from 'express';
import { RowDataPacket } from 'mysql2';

import db = require('../../db');
import keyhsid from '../../hsid';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { ARTICLE_AUDITS, ArticleAudit } from '../../helper/article-audit.helper';
import { buildAttachmentUrl } from '../../helper/attachment.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

const ARTICLE_PATHS = `(path LIKE '/artikel/%' OR path LIKE '/en/article/%')`;
const TOP_LIMIT = 5;
const SCORE_WEEKS = 8;
// An article published without a set time has none: the website dates it by when it was made.
const PUBLISHED_TIME = 'COALESCE(article_published_at, created)';

/** 1, 7, or 30 days; 7 for anything else. */
const daysOf = (value: unknown) => {
  const days = Number(value);
  return days === 1 || days === 30 ? days : 7;
};

const pathsOf = (locale: string, slug: string) =>
  locale === 'en-US' ? `/en/article/${slug}` : `/artikel/${slug}`;

/** The article each address belongs to, old addresses of moved articles too. */
const articleByPath = async (idMasterComp: number) => {
  const [current] = await pool.query<RowDataPacket[]>(
    `SELECT id_article, article_locale AS locale, article_slug AS slug FROM article_i18n
     WHERE id_master_comp = ?`,
    [idMasterComp],
  );
  const [moved] = await pool.query<RowDataPacket[]>(
    `SELECT slug_redirect_entity_id AS id_article, slug_redirect_locale AS locale,
       slug_redirect_old_slug AS slug
     FROM slug_redirect WHERE id_master_comp = ? AND slug_redirect_entity = 'article'`,
    [idMasterComp],
  );
  const map = new Map<string, number>();
  for (const row of [...moved, ...current]) {
    map.set(pathsOf(row.locale, row.slug), Number(row.id_article));
  }
  return map;
};

router.get(
  '/api/v1/articles/insight/top',
  verifyToken,
  requirePermission('article.view'),
  onFailure('ARTICLE_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const days = daysOf(req.query.days);
    const [views] = await pool.query<RowDataPacket[]>(
      `SELECT SUBSTRING_INDEX(path, '?', 1) AS clean_path, COUNT(*) AS total
       FROM public_analytics_event
       WHERE id_master_comp = ? AND event_name = 'page_view' AND ${ARTICLE_PATHS}
         AND received_at >= NOW() - INTERVAL ? DAY
       GROUP BY clean_path`,
      [scope.idMasterComp, days],
    );
    const paths = await articleByPath(scope.idMasterComp);
    const totals = new Map<number, number>();
    for (const row of views) {
      const id = paths.get(row.clean_path);
      if (id) totals.set(id, (totals.get(id) ?? 0) + Number(row.total));
    }
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_LIMIT);
    if (!top.length) return sendSuccess(res, 200, 'ARTICLE_INSIGHT_TOP', 'Top articles', []);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id_article, a.article_published_at, a.created, i.article_title, i.article_slug,
         th.storage_path
       FROM article a
       JOIN article_i18n i ON i.id_article = a.id_article AND i.article_locale = 'id-ID'
       LEFT JOIN article_attachment aa ON aa.id_article = a.id_article
         AND aa.article_attachment_role = 'thumbnail'
       LEFT JOIN attachment th ON th.id_attachment = aa.id_attachment
       WHERE a.id_article IN (?) AND a.id_master_comp = ? AND a.article_deleted_at IS NULL`,
      [top.map(([id]) => id), scope.idMasterComp],
    );
    const byId = new Map(rows.map((row) => [Number(row.id_article), row]));
    return sendSuccess(
      res,
      200,
      'ARTICLE_INSIGHT_TOP',
      'Top articles',
      top.flatMap(([id, total]) => {
        const row = byId.get(id);
        return row
          ? [
              {
                id: keyhsid.idArticle.encode(id),
                title: row.article_title,
                slug: row.article_slug,
                published_at: row.article_published_at ?? row.created,
                thumbnail: row.storage_path ? buildAttachmentUrl(row.storage_path) : null,
                views: total,
              },
            ]
          : [];
      }),
    );
  },
);

// One point per day; for "1 day", one per hour of the last 24.
router.get(
  '/api/v1/articles/insight/chart',
  verifyToken,
  requirePermission('article.view'),
  onFailure('ARTICLE_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const days = daysOf(req.query.days);
    const hourly = days === 1;
    const format = hourly ? '%Y-%m-%d %H:00' : '%Y-%m-%d';

    const [nowRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:00:00Z') AS now_hour`,
    );
    const now = new Date(String(nowRows[0].now_hour));
    const count = hourly ? 24 : days;
    const buckets = Array.from({ length: count }, (_, index) => {
      const point = new Date(now);
      if (hourly) point.setUTCHours(point.getUTCHours() - (count - 1 - index));
      else point.setUTCDate(point.getUTCDate() - (count - 1 - index));
      const iso = point.toISOString();
      return hourly ? `${iso.slice(0, 10)} ${iso.slice(11, 13)}:00` : iso.slice(0, 10);
    });

    const [events] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(received_at, ?) AS bucket,
         SUM(event_name = 'page_view') AS views,
         SUM(event_name = 'article_share') AS shares,
         COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_hash END) AS reach
       FROM public_analytics_event
       WHERE id_master_comp = ? AND event_name IN ('page_view', 'article_share')
         AND ${ARTICLE_PATHS} AND received_at >= NOW() - INTERVAL ? DAY
       GROUP BY bucket`,
      [format, scope.idMasterComp, days],
    );
    const [published] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(${PUBLISHED_TIME}, ?) AS bucket, COUNT(*) AS total
       FROM article
       WHERE id_master_comp = ? AND article_deleted_at IS NULL AND article_status = 'published'
         AND ${PUBLISHED_TIME} >= NOW() - INTERVAL ? DAY AND ${PUBLISHED_TIME} <= NOW()
       GROUP BY bucket`,
      [format, scope.idMasterComp, days],
    );
    const eventsBy = new Map(events.map((row) => [row.bucket, row]));
    const publishedBy = new Map(published.map((row) => [row.bucket, Number(row.total)]));

    return sendSuccess(res, 200, 'ARTICLE_INSIGHT_CHART', 'Article trend', {
      labels: buckets,
      published: buckets.map((bucket) => publishedBy.get(bucket) ?? 0),
      views: buckets.map((bucket) => Number(eventsBy.get(bucket)?.views ?? 0)),
      shares: buckets.map((bucket) => Number(eventsBy.get(bucket)?.shares ?? 0)),
      reach: buckets.map((bucket) => Number(eventsBy.get(bucket)?.reach ?? 0)),
    });
  },
);

// The score: of the last 8 weeks, the share with a new article; change against the 8 before.
router.get(
  '/api/v1/articles/insight/audit',
  verifyToken,
  requirePermission('article.view'),
  onFailure('ARTICLE_INSIGHT_FAILED', 'Unable to load the summary'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const company = scope.idMasterComp;

    const [statusRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         SUM(a.article_status = 'published'
           AND (a.article_published_at IS NULL OR a.article_published_at <= UTC_TIMESTAMP())) AS published,
         SUM(a.article_status IN ('published', 'scheduled')
           AND a.article_published_at > UTC_TIMESTAMP()) AS scheduled,
         SUM(a.article_status = 'draft') AS draft,
         SUM(a.article_status = 'archived') AS archived,
         COUNT(*) AS total
       FROM article a WHERE a.id_master_comp = ? AND a.article_deleted_at IS NULL`,
      [company],
    );
    const auditKeys = Object.keys(ARTICLE_AUDITS) as ArticleAudit[];
    const [auditRows] = await pool.query<RowDataPacket[]>(
      `SELECT ${auditKeys.map((key) => `SUM(${ARTICLE_AUDITS[key]}) AS ${key}`).join(', ')}
       FROM article a WHERE a.id_master_comp = ? AND a.article_deleted_at IS NULL`,
      [company],
    );
    const [weekRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT FLOOR(DATEDIFF(NOW(), ${PUBLISHED_TIME}) / 7) AS week_ago
       FROM article
       WHERE id_master_comp = ? AND article_deleted_at IS NULL AND article_status = 'published'
         AND ${PUBLISHED_TIME} <= NOW()
         AND ${PUBLISHED_TIME} >= NOW() - INTERVAL ? DAY`,
      [company, SCORE_WEEKS * 14],
    );
    const weeks = weekRows.map((row) => Number(row.week_ago));
    const percent = (count: number) => Math.round((count / SCORE_WEEKS) * 100);
    const score = percent(weeks.filter((week) => week < SCORE_WEEKS).length);
    const before = percent(weeks.filter((week) => week >= SCORE_WEEKS).length);

    const number = (value: unknown) => Number(value ?? 0);
    const statuses = statusRows[0];
    return sendSuccess(res, 200, 'ARTICLE_INSIGHT_AUDIT', 'Article audit', {
      total: number(statuses.total),
      published: number(statuses.published),
      scheduled: number(statuses.scheduled),
      draft: number(statuses.draft),
      archived: number(statuses.archived),
      checks: Object.fromEntries(auditKeys.map((key) => [key, number(auditRows[0][key])])),
      score,
      score_change: score - before,
    });
  },
);

export default router;
