import {
  CmsPageI18nStatus,
  CmsPagePublicationAction,
  CmsPageStatus,
  CmsPageVisibility,
} from "../config/cms-page.config";

//==================================================
//==== EFFECTIVE STATUS
//==================================================

export type CmsPageEffectiveStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "expired"
  | "archived";

//==================================================
//==== PUBLICATION INPUT
//==================================================

export interface CmsPagePublicationInput {
  action: CmsPagePublicationAction;

  cms_page_publish_at?: string | Date | null;

  cms_page_unpublish_at?: string | Date | null;
}

//==================================================
//==== LIST ITEM
//==================================================

export interface CmsPageListItem {
  id_cms_page: string;

  id_parent_cms_page: string | null;

  cms_page_key: string;

  cms_page_type: string;

  cms_page_template: string | null;

  cms_page_content_mode: string;

  cms_page_default_locale: string;

  cms_page_status: CmsPageStatus;

  effective_status: CmsPageEffectiveStatus;

  cms_page_visibility: CmsPageVisibility;

  cms_page_is_system: 0 | 1;

  cms_page_is_featured: 0 | 1;

  cms_page_sort_order: number;

  cms_page_publish_at: string | Date | null;

  cms_page_unpublish_at: string | Date | null;

  requested_locale: string;

  resolved_locale: string | null;

  is_fallback: boolean;

  cms_page_slug: string | null;

  cms_page_title: string | null;

  cms_page_excerpt: string | null;

  cms_page_i18n_status: CmsPageI18nStatus | null;

  translation_count: number;

  published_translation_count: number;

  created: string | Date;

  updated: string | Date;
}

//==================================================
//==== PAGINATION
//==================================================

export interface CmsPagePagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  pagerows: number;

  total_pages: number;

  has_more: boolean;
}

//==================================================
//==== CREATE TRANSLATION INPUT
//==================================================

export interface CmsPageTranslationInput {
  locale: string;

  slug?: string | null;

  title: string;

  excerpt?: string | null;

  content?: string | null;

  content_json?: unknown;

  meta_title?: string | null;

  meta_description?: string | null;

  meta_keywords?: string | null;

  meta_robots?: string | null;

  canonical_url?: string | null;

  og_title?: string | null;

  og_description?: string | null;

  schema_json?: unknown;

  status?: number;
}

//==================================================
//==== CREATE ATTACHMENT TRANSLATION INPUT
//==================================================

export interface CmsPageAttachmentTranslationInput {
  locale: string;

  caption?: string | null;

  alt_text?: string | null;
}

//==================================================
//==== CREATE ATTACHMENT INPUT
//==================================================

export interface CmsPageAttachmentInput {
  id_attachment: string;

  role?: string;

  sort_order?: number;

  is_public?: number | boolean;

  translations?: CmsPageAttachmentTranslationInput[];
}
