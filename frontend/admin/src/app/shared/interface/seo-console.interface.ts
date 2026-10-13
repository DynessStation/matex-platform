import { IApiResponse } from './api-response.interface';

export interface ISearchMetricTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ISearchMetricRow extends ISearchMetricTotals {
  key: string;
}

export interface ISearchDailyPoint extends ISearchMetricTotals {
  date: string;
}

export interface ISeoConsoleOverview {
  configured: boolean;
  site_url: string | null;
  permission_level?: string | null;
  range: { days: number; startDate: string; endDate: string };
  totals?: ISearchMetricTotals;
  daily?: ISearchDailyPoint[];
  top_queries?: ISearchMetricRow[];
  top_pages?: ISearchMetricRow[];
  page_speed_configured: boolean;
}

export interface IPageSpeedResult {
  configured: boolean;
  url?: string;
  strategy?: 'mobile' | 'desktop';
  analyzed_at?: string | null;
  field_category?: string | null;
  scores?: {
    performance: number;
    accessibility: number;
    best_practices: number;
    seo: number;
  };
  metrics?: {
    lcp_ms: number;
    inp_ms: number;
    cls: number;
    ttfb_ms: number;
  };
}

export type ISeoConsoleOverviewResponse = IApiResponse<ISeoConsoleOverview>;
export type IPageSpeedResponse = IApiResponse<IPageSpeedResult>;
