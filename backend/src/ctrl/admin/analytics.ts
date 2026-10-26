import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';

import { pool } from '../../db';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { onFailure } from '../../middleware/error-handler.middleware';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const dateRange = (fromValue: unknown, toValue: unknown) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const fromText = String(fromValue ?? '');
  const toText = String(toValue ?? '');
  const from = datePattern.test(fromText) ? new Date(`${fromText}T00:00:00.000Z`) : defaultFrom;
  const toInclusive = datePattern.test(toText) ? new Date(`${toText}T00:00:00.000Z`) : today;
  if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime()) || from > toInclusive) {
    return null;
  }

  const days = Math.floor((toInclusive.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days > 90) return null;
  const toExclusive = new Date(toInclusive);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  return {
    from,
    toExclusive,
    fromDate: isoDate(from),
    toDate: isoDate(toInclusive),
    days,
  };
};

router.get(
  '/api/v1/analytics/overview',
  verifyToken,
  requirePermission('dashboard.view'),
  onFailure('ANALYTICS_UNAVAILABLE', 'Unable to load analytics'),
  async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const range = dateRange(req.query.from, req.query.to);
    if (!range) {
      return sendError(
        res,
        400,
        'ANALYTICS_RANGE_INVALID',
        'Date range must be valid and no longer than 90 days',
      );
    }

    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const parameters = [scope.idMasterComp, range.from, range.toExclusive];

    const [[summary], [daily], [topPages], [sources], [locations], [performance], [content]] =
      await Promise.all([
        pool.query<RowDataPacket[]>(
          `SELECT
             SUM(event_name = 'page_view') AS page_views,
             COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_hash END) AS visitors,
             COUNT(DISTINCT CASE
               WHEN event_name = 'page_view'
                AND received_at >= UTC_TIMESTAMP() - INTERVAL 5 MINUTE
               THEN session_hash END) AS active_visitors,
             SUM(event_name = 'outbound_click') AS outbound_clicks,
             SUM(event_name = 'contact_start') AS contact_starts,
             SUM(event_name = 'contact_submit') AS contact_submissions,
             MAX(received_at) AS updated_at
           FROM public_analytics_event
          WHERE id_master_comp = ? AND received_at >= ? AND received_at < ?`,
          parameters,
        ),
        pool.query<RowDataPacket[]>(
          `SELECT DATE(received_at) AS date,
                  SUM(event_name = 'page_view') AS page_views,
                  COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_hash END) AS visitors
             FROM public_analytics_event
            WHERE id_master_comp = ? AND received_at >= ? AND received_at < ?
            GROUP BY DATE(received_at)
            ORDER BY DATE(received_at)`,
          parameters,
        ),
        pool.query<RowDataPacket[]>(
          `SELECT path, COUNT(*) AS page_views,
                  COUNT(DISTINCT session_hash) AS visitors
             FROM public_analytics_event
            WHERE id_master_comp = ? AND received_at >= ? AND received_at < ?
              AND event_name = 'page_view'
            GROUP BY path
            ORDER BY page_views DESC, path
            LIMIT 10`,
          parameters,
        ),
        pool.query<RowDataPacket[]>(
          `SELECT COALESCE(NULLIF(referrer_host, ''), 'Direct') AS source,
                  COUNT(*) AS page_views
             FROM public_analytics_event
            WHERE id_master_comp = ? AND received_at >= ? AND received_at < ?
              AND event_name = 'page_view'
            GROUP BY COALESCE(NULLIF(referrer_host, ''), 'Direct')
            ORDER BY page_views DESC, source
            LIMIT 10`,
          parameters,
        ),
        pool.query<RowDataPacket[]>(
          `SELECT country_code, COUNT(DISTINCT session_hash) AS visitors
             FROM public_analytics_event
            WHERE id_master_comp = ? AND received_at >= ? AND received_at < ?
              AND event_name = 'page_view' AND country_code IS NOT NULL
            GROUP BY country_code
            ORDER BY visitors DESC, country_code
            LIMIT 10`,
          parameters,
        ),
        pool.query<RowDataPacket[]>(
          `SELECT target_key AS metric,
                  COUNT(*) AS samples,
                  ROUND(AVG(numeric_value), 3) AS average_value,
                  ROUND(
                    100 * SUM(CASE
                      WHEN target_key = 'LCP' AND numeric_value <= 2500 THEN 1
                      WHEN target_key = 'INP' AND numeric_value <= 200 THEN 1
                      WHEN target_key = 'CLS' AND numeric_value <= 0.1 THEN 1
                      ELSE 0
                    END) / COUNT(*),
                    1
                  ) AS good_percent
             FROM public_analytics_event
            WHERE id_master_comp = ? AND received_at >= ? AND received_at < ?
              AND event_name = 'web_vital' AND numeric_value IS NOT NULL
            GROUP BY target_key
            ORDER BY FIELD(target_key, 'LCP', 'INP', 'CLS')`,
          parameters,
        ),
        pool.query<RowDataPacket[]>(
          `SELECT
             (SELECT COUNT(*) FROM product_catalog
               WHERE id_master_comp = ? AND product_deleted_at IS NULL) AS products_total,
             (SELECT COUNT(*) FROM product_catalog
               WHERE id_master_comp = ? AND product_deleted_at IS NULL
                 AND product_status = 'published') AS products_published,
             (SELECT COUNT(*) FROM product_catalog
               WHERE id_master_comp = ? AND product_deleted_at IS NULL
                 AND product_status = 'draft') AS products_draft,
             (SELECT COUNT(*) FROM article
               WHERE id_master_comp = ? AND article_deleted_at IS NULL) AS articles_total,
             (SELECT COUNT(*) FROM article
               WHERE id_master_comp = ? AND article_deleted_at IS NULL
                 AND ((article_status = 'published' AND article_published_at IS NULL)
                   OR (article_status IN ('published', 'scheduled')
                     AND article_published_at <= UTC_TIMESTAMP()))) AS articles_published,
             (SELECT COUNT(*) FROM article
               WHERE id_master_comp = ? AND article_deleted_at IS NULL
                 AND (article_status = 'draft'
                   OR (article_status IN ('published', 'scheduled')
                     AND article_published_at > UTC_TIMESTAMP()))) AS articles_pending,
             (SELECT COUNT(*) FROM faq
               WHERE id_master_comp = ? AND faq_deleted_at IS NULL
                 AND faq_status = 1) AS faq_active,
             (SELECT COUNT(*) FROM contact_inquiry
               WHERE id_master_comp = ? AND created >= UTC_DATE()) AS inquiries_today`,
          Array(8).fill(scope.idMasterComp),
        ),
      ]);

    const totals = summary[0] ?? {};
    const contentTotals = content[0] ?? {};
    return sendSuccess(res, 200, 'ANALYTICS_OVERVIEW_FOUND', 'Analytics loaded', {
      range: { from: range.fromDate, to: range.toDate, days: range.days },
      source: 'matex_first_party',
      collection_enabled: process.env.PUBLIC_ANALYTICS_ENABLED === 'true',
      updated_at: totals.updated_at ?? null,
      totals: {
        page_views: Number(totals.page_views ?? 0),
        visitors: Number(totals.visitors ?? 0),
        active_visitors: Number(totals.active_visitors ?? 0),
        outbound_clicks: Number(totals.outbound_clicks ?? 0),
        contact_starts: Number(totals.contact_starts ?? 0),
        contact_submissions: Number(totals.contact_submissions ?? 0),
      },
      daily: daily.map((item) => ({
        date: item.date,
        page_views: Number(item.page_views ?? 0),
        visitors: Number(item.visitors ?? 0),
      })),
      top_pages: topPages.map((item) => ({
        path: item.path,
        page_views: Number(item.page_views ?? 0),
        visitors: Number(item.visitors ?? 0),
      })),
      sources: sources.map((item) => ({
        source: item.source,
        page_views: Number(item.page_views ?? 0),
      })),
      locations: locations.map((item) => ({
        country_code: item.country_code,
        visitors: Number(item.visitors ?? 0),
      })),
      performance: performance.map((item) => ({
        metric: item.metric,
        samples: Number(item.samples ?? 0),
        average_value: Number(item.average_value ?? 0),
        good_percent: Number(item.good_percent ?? 0),
      })),
      content: {
        products_total: Number(contentTotals.products_total ?? 0),
        products_published: Number(contentTotals.products_published ?? 0),
        products_draft: Number(contentTotals.products_draft ?? 0),
        articles_total: Number(contentTotals.articles_total ?? 0),
        articles_published: Number(contentTotals.articles_published ?? 0),
        articles_pending: Number(contentTotals.articles_pending ?? 0),
        faq_active: Number(contentTotals.faq_active ?? 0),
        inquiries_today: Number(contentTotals.inquiries_today ?? 0),
      },
    });
  },
);

export default router;
