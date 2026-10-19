import { Router, Response } from 'express';

import {
  SearchConsoleRow,
  googleSeoConfiguration,
  pageSpeedTarget,
  searchConsoleClient,
  searchConsoleDateRange,
  searchConsoleTotals,
} from '../../helper/google-seo.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';

const router = Router();

interface SearchConsoleQueryResponse {
  rows?: SearchConsoleRow[];
  metadata?: { first_incomplete_date?: string };
}

interface SearchConsoleSiteResponse {
  siteUrl?: string;
  permissionLevel?: string;
}

interface PageSpeedCategory {
  score?: number | null;
}

interface PageSpeedAudit {
  numericValue?: number;
  displayValue?: string;
}

interface PageSpeedResponse {
  id?: string;
  analysisUTCTimestamp?: string;
  loadingExperience?: { overall_category?: string };
  lighthouseResult?: {
    finalUrl?: string;
    categories?: Record<string, PageSpeedCategory>;
    audits?: Record<string, PageSpeedAudit>;
  };
}

const mappedRows = (rows: SearchConsoleRow[] = []) =>
  rows.map((row) => ({
    key: row.keys?.[0] ?? '',
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));

router.get(
  '/api/v1/seo-console/overview',
  verifyToken,
  requirePermission('dashboard.view'),
  async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const range = searchConsoleDateRange(req.query.days);
    if (!range) {
      return sendError(
        res,
        400,
        'SEO_RANGE_INVALID',
        'Search Console range must be 7, 28, or 90 days',
      );
    }

    const configuration = googleSeoConfiguration();
    const client = searchConsoleClient(configuration);
    const siteUrl = configuration.searchConsole.siteUrl;
    if (!client || !siteUrl) {
      return sendSuccess(res, 200, 'SEO_CONSOLE_NOT_CONFIGURED', 'SEO console is not configured', {
        configured: false,
        site_url: siteUrl,
        range,
        page_speed_configured: configuration.pageSpeed.configured,
      });
    }

    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`;
    const query = (dimensions: string[], rowLimit: number) =>
      client.request<SearchConsoleQueryResponse>({
        url: `${endpoint}/searchAnalytics/query`,
        method: 'POST',
        timeout: 15_000,
        data: {
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions,
          rowLimit,
          dataState: 'final',
        },
      });

    try {
      const [site, daily, queries, pages] = await Promise.all([
        client.request<SearchConsoleSiteResponse>({
          url: endpoint,
          timeout: 10_000,
        }),
        query(['date'], 100),
        query(['query'], 10),
        query(['page'], 10),
      ]);
      const dailyRows = daily.data.rows ?? [];

      return sendSuccess(res, 200, 'SEO_CONSOLE_FOUND', 'Search Console data loaded', {
        configured: true,
        site_url: site.data.siteUrl ?? siteUrl,
        permission_level: site.data.permissionLevel ?? null,
        range,
        totals: searchConsoleTotals(dailyRows),
        daily: mappedRows(dailyRows).map((row) => ({
          date: row.key,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        })),
        top_queries: mappedRows(queries.data.rows),
        top_pages: mappedRows(pages.data.rows),
        page_speed_configured: configuration.pageSpeed.configured,
      });
    } catch (error) {
      console.error('[SEO Console] Search Console request failed', error);
      return sendError(
        res,
        502,
        'SEO_CONSOLE_UNAVAILABLE',
        'Search Console could not be reached or the service account lacks property access',
      );
    }
  },
);

router.get(
  '/api/v1/seo-console/pagespeed',
  verifyToken,
  requirePermission('dashboard.view'),
  async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const configuration = googleSeoConfiguration();
    const pageSpeed = configuration.pageSpeed;
    if (!pageSpeed.configured || !pageSpeed.siteUrl || !pageSpeed.apiKey) {
      return sendSuccess(res, 200, 'PAGESPEED_NOT_CONFIGURED', 'PageSpeed is not configured', {
        configured: false,
      });
    }

    const target = pageSpeedTarget(pageSpeed.siteUrl, req.query.path, req.query.strategy);
    if (!target) {
      return sendError(
        res,
        400,
        'PAGESPEED_TARGET_INVALID',
        'PageSpeed path or strategy is invalid',
      );
    }

    const params = new URLSearchParams({
      url: target.url,
      strategy: target.strategy,
      key: pageSpeed.apiKey,
    });
    for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
      params.append('category', category);
    }

    try {
      const response = await fetch(
        `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
        { signal: AbortSignal.timeout(60_000) },
      );
      if (!response.ok) {
        throw new Error(`PageSpeed returned HTTP ${response.status}`);
      }
      const payload = (await response.json()) as PageSpeedResponse;
      const categories = payload.lighthouseResult?.categories ?? {};
      const audits = payload.lighthouseResult?.audits ?? {};

      return sendSuccess(res, 200, 'PAGESPEED_FOUND', 'PageSpeed audit loaded', {
        configured: true,
        url: payload.lighthouseResult?.finalUrl ?? target.url,
        strategy: target.strategy,
        analyzed_at: payload.analysisUTCTimestamp ?? null,
        field_category: payload.loadingExperience?.overall_category ?? null,
        scores: {
          performance: Math.round(Number(categories.performance?.score ?? 0) * 100),
          accessibility: Math.round(Number(categories.accessibility?.score ?? 0) * 100),
          best_practices: Math.round(Number(categories['best-practices']?.score ?? 0) * 100),
          seo: Math.round(Number(categories.seo?.score ?? 0) * 100),
        },
        metrics: {
          lcp_ms: Number(audits['largest-contentful-paint']?.numericValue ?? 0),
          inp_ms: Number(audits['interaction-to-next-paint']?.numericValue ?? 0),
          cls: Number(audits['cumulative-layout-shift']?.numericValue ?? 0),
          ttfb_ms: Number(audits['server-response-time']?.numericValue ?? 0),
        },
      });
    } catch (error) {
      console.error('[SEO Console] PageSpeed request failed', error);
      return sendError(res, 502, 'PAGESPEED_UNAVAILABLE', 'PageSpeed audit could not be completed');
    }
  },
);

export default router;
