import { IApiResponse } from './api-response.interface';

export type WebsitePageKey = 'home' | 'about' | 'terms' | 'career';

export type WebsitePageLocale = 'id-ID' | 'en-US';

export type WebsitePageEffectiveStatus =
  'draft' | 'scheduled' | 'published' | 'expired';

export type WebsitePageClickAction =
  'none' | 'internal' | 'external' | 'product' | 'category';

export interface IWebsitePageSeo {
  title: string | null;
  description: string | null;
  keywords: string | null;
  robots: string | null;
  canonical_url: string | null;
  social_title: string | null;
  social_description: string | null;
  schema: unknown | null;
}

export interface IWebsitePageTranslation {
  locale: WebsitePageLocale;
  path: string;
  title: string;
  summary: string | null;
  body_html: string | null;
  content: unknown | null;
  seo: IWebsitePageSeo;
  is_published: boolean;
  created: string;
  updated: string;
}

export interface IWebsitePageMediaTranslation {
  locale: WebsitePageLocale;
  caption: string | null;
  alt_text: string | null;
}

export interface IWebsitePageMedia {
  id_attachment: string;
  slot: string;
  sort_order: number;
  is_visible: boolean;
  click_action: WebsitePageClickAction;
  click_target: string | null;
  collection_name: string;
  name: string;
  original_name: string;
  file_name: string;
  mime_type: string;
  extension: string;
  file_size: number;
  width: number | null;
  height: number | null;
  asset_url: string;
  translations: IWebsitePageMediaTranslation[];
  created: string;
  updated: string;
}

export interface IWebsitePageDetail {
  key: WebsitePageKey;
  default_locale: WebsitePageLocale;
  is_published: boolean;
  effective_status: WebsitePageEffectiveStatus;
  publish_at: string | null;
  unpublish_at: string | null;
  translations: IWebsitePageTranslation[];
  media: IWebsitePageMedia[];
  created_by: string | null;
  updated_by: string | null;
  created: string;
  updated: string;
}

export interface IWebsitePageSaveTranslation {
  locale: WebsitePageLocale;
  title: string;
  summary: string | null;
  body_html: string | null;
  content: unknown | null;
  seo: IWebsitePageSeo;
  is_published: boolean;
}

export interface IWebsitePageSaveMedia {
  id_attachment: string;
  slot: string;
  is_visible: boolean;
  click_action: WebsitePageClickAction;
  click_target: string | null;
  translations: IWebsitePageMediaTranslation[];
}

export interface IWebsitePageSaveRequest {
  is_published: boolean;
  publish_at: string | null;
  unpublish_at: string | null;
  translations: IWebsitePageSaveTranslation[];
  media: IWebsitePageSaveMedia[];
}

export type IWebsitePageDetailResponse = IApiResponse<IWebsitePageDetail>;

export type IWebsitePageMutationResponse = IApiResponse<{
  key: WebsitePageKey;
}>;
