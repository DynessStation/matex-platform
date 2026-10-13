import { Router, Response } from "express";
import { RowDataPacket } from "mysql2";

import { pool } from "../../db";
import { getAdminScope } from "../../helper/admin-scope.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const dateRange = (fromValue: unknown, toValue: unknown) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const fromText = String(fromValue ?? "");
  const toText = String(toValue ?? "");
  const from = datePattern.test(fromText)
    ? new Date(`${fromText}T00:00:00.000Z`)
    : defaultFrom;
  const toInclusive = datePattern.test(toText)
    ? new Date(`${toText}T00:00:00.000Z`)
    : today;
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(toInclusive.getTime()) ||
    from > toInclusive
  ) {
    return null;
  }

  const days =
    Math.floor((toInclusive.getTime() - from.getTime()) / 86_400_000) + 1;
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
  "/api/v1/analytics/overview",
  verifyToken,
  requirePermission("dashboard.view"),
  async (req: AuthRequest, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const range = dateRange(req.query.from, req.query.to);
    if (!range) {
      return sendError(
        res,
        400,
        "ANALYTICS_RANGE_INVALID",
        "Date range must be valid and no longer than 90 days",
      );
    }

    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);
    const parameters = [scope.idMasterComp, range.from, range.toExclusive];

    try {
      const [[summary], [daily], [topPages], [sources], [locations]] =
        await Promise.all([
          pool.query<RowDataPacket[]>(
            `SELECT
             SUM(event_name = 'page_view') AS page_views,
             COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_hash END) AS visitors,
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
        ]);

      const totals = summary[0] ?? {};
      return sendSuccess(
        res,
        200,
        "ANALYTICS_OVERVIEW_FOUND",
        "Analytics loaded",
        {
          range: { from: range.fromDate, to: range.toDate, days: range.days },
          source: "matex_first_party",
          updated_at: totals.updated_at ?? null,
          totals: {
            page_views: Number(totals.page_views ?? 0),
            visitors: Number(totals.visitors ?? 0),
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
        },
      );
    } catch (error) {
      console.error("[Admin Analytics] Overview failed", error);
      return sendError(
        res,
        500,
        "ANALYTICS_UNAVAILABLE",
        "Unable to load analytics",
      );
    }
  },
);

export default router;
