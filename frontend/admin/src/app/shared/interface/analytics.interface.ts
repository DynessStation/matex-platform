import { IApiResponse } from './api-response.interface';

export interface IAnalyticsTotals {
  page_views: number;
  visitors: number;
  outbound_clicks: number;
  contact_starts: number;
  contact_submissions: number;
}

export interface IAnalyticsDailyPoint {
  date: string;
  page_views: number;
  visitors: number;
}

export interface IAnalyticsPage {
  path: string;
  page_views: number;
  visitors: number;
}

export interface IAnalyticsSource {
  source: string;
  page_views: number;
}

export interface IAnalyticsLocation {
  country_code: string;
  visitors: number;
}

export interface IAnalyticsContentTotals {
  products_total: number;
  products_published: number;
  products_draft: number;
  articles_total: number;
  articles_published: number;
  articles_pending: number;
  faq_active: number;
  inquiries_today: number;
}

export interface IAnalyticsOverview {
  range: { from: string; to: string; days: number };
  source: 'matex_first_party';
  collection_enabled: boolean;
  updated_at: string | null;
  totals: IAnalyticsTotals;
  daily: IAnalyticsDailyPoint[];
  top_pages: IAnalyticsPage[];
  sources: IAnalyticsSource[];
  locations: IAnalyticsLocation[];
  content: IAnalyticsContentTotals;
}

export type IAnalyticsOverviewResponse = IApiResponse<IAnalyticsOverview>;
