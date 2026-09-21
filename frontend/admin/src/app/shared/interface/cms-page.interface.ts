import { IAttachment } from './attachment.interface';

//==================================================
//==== TYPE
//==================================================

export type CmsPageStatus = 0 | 1 | 2;

export type CmsPageVisibility = 0 | 1 | 2;

export type CmsPageI18nStatus = 0 | 1;

export type CmsPageEffectiveStatus =
  'draft' | 'scheduled' | 'published' | 'expired' | 'archived';

export type CmsPagePublicationAction =
  | 'publish'
  | 'schedule'
  | 'cancel_schedule'
  | 'unpublish'
  | 'archive'
  | 'restore';

//==================================================
//==== LIST ITEM
//==================================================

export interface ICmsPage {
  id: string;

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

  cms_page_publish_at: string | null;

  cms_page_unpublish_at: string | null;

  requested_locale: string;

  resolved_locale: string | null;

  is_fallback: boolean;

  cms_page_slug: string | null;

  cms_page_title: string | null;

  cms_page_excerpt: string | null;

  cms_page_i18n_status: CmsPageI18nStatus | null;

  translation_count: number;

  published_translation_count: number;

  created: string;

  updated: string;
}

//==================================================
//==== TRASH ITEM
//==================================================

export interface ICmsPageTrash extends ICmsPage {
  cms_page_deleted_at: string;
}

//==================================================
//==== PAGINATION
//==================================================

export interface ICmsPagePagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  pagerows: number;

  total_pages: number;

  has_more: boolean;
}

export interface ICmsPageModel {
  success: boolean;

  code: string;

  message: string;

  data: ICmsPage[];

  pagination: ICmsPagePagination;
}

export interface ICmsPageTrashModel {
  success: boolean;

  code: string;

  message: string;

  data: ICmsPageTrash[];

  pagination: ICmsPagePagination;
}

//==================================================
//==== TRANSLATION
//==================================================

export interface ICmsPageTranslation {
  cms_page_locale: string;

  cms_page_slug: string;

  cms_page_title: string;

  cms_page_excerpt: string | null;

  cms_page_content: string | null;

  cms_page_content_json: unknown | null;

  cms_page_meta_title: string | null;

  cms_page_meta_description: string | null;

  cms_page_meta_keywords: string | null;

  cms_page_meta_robots: string | null;

  cms_page_canonical_url: string | null;

  cms_page_og_title: string | null;

  cms_page_og_description: string | null;

  cms_page_schema_json: unknown | null;

  cms_page_i18n_status: CmsPageI18nStatus;

  created: string;

  updated: string;
}

//==================================================
//==== ATTACHMENT TRANSLATION
//==================================================

export interface ICmsPageAttachmentTranslation {
  cms_page_attachment_locale: string;

  cms_page_attachment_caption: string | null;

  cms_page_attachment_alt_text: string | null;

  created: string;

  updated: string;
}

//==================================================
//==== ATTACHMENT
//==================================================

export interface ICmsPageAttachment extends IAttachment {
  cms_page_attachment_role: string;

  cms_page_attachment_sort_order: number;

  cms_page_attachment_is_public: 0 | 1;

  translations: ICmsPageAttachmentTranslation[];

  created: string;

  updated: string;
}

//==================================================
//==== ACTOR
//==================================================

export interface ICmsPageActor {
  id_admin_acct: string;

  alias: string | null;
}

//==================================================
//==== DETAIL
//==================================================

export interface ICmsPageDetail {
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

  cms_page_publish_at: string | null;

  cms_page_unpublish_at: string | null;

  cms_page_settings_json: unknown | null;

  translations: ICmsPageTranslation[];

  attachments: ICmsPageAttachment[];

  translation_count: number;

  attachment_count: number;

  created_by: ICmsPageActor | null;

  updated_by: ICmsPageActor | null;

  created: string;

  updated: string;
}

export interface ICmsPageDetailResponse {
  success: boolean;

  code: string;

  message: string;

  data: ICmsPageDetail;
}

//==================================================
//==== SAVE TRANSLATION
//==================================================

export interface ICmsPageTranslationPayload {
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

  status?: CmsPageI18nStatus;
}

//==================================================
//==== SAVE ATTACHMENT TRANSLATION
//==================================================

export interface ICmsPageAttachmentTranslationPayload {
  locale: string;

  caption?: string | null;

  alt_text?: string | null;
}

//==================================================
//==== SAVE ATTACHMENT
//==================================================

export interface ICmsPageAttachmentPayload {
  id_attachment: string;

  role?: string;

  sort_order?: number;

  is_public?: 0 | 1 | boolean;

  translations?: ICmsPageAttachmentTranslationPayload[];
}

//==================================================
//==== SAVE
//==================================================

export interface ICmsPagePayload {
  id_parent_cms_page?: string | null;

  cms_page_key: string;

  cms_page_type?: string;

  cms_page_template?: string | null;

  cms_page_content_mode?: string;

  cms_page_default_locale?: string;

  cms_page_status?: CmsPageStatus;

  cms_page_visibility?: CmsPageVisibility;

  cms_page_is_system?: 0 | 1 | boolean;

  cms_page_is_featured?: 0 | 1 | boolean;

  cms_page_sort_order?: number;

  cms_page_publish_at?: string | null;

  cms_page_unpublish_at?: string | null;

  cms_page_settings_json?: unknown;

  translations: ICmsPageTranslationPayload[];

  attachments?: ICmsPageAttachmentPayload[];
}

//==================================================
//==== FORM SAVE
//==================================================

export interface ICmsPageSaveRequest {
  payload: ICmsPagePayload;

  publicationActions: ICmsPagePublicationPayload[];
}

//==================================================
//==== MUTATION RESPONSE
//==================================================

export interface ICmsPageMutationResponse {
  success: boolean;

  code: string;

  message: string;

  data: {
    id_cms_page: string;
  };
}

//==================================================
//==== PUBLICATION
//==================================================

export interface ICmsPagePublicationPayload {
  action: CmsPagePublicationAction;

  cms_page_publish_at?: string | null;

  cms_page_unpublish_at?: string | null;
}

export interface ICmsPagePublicationResponse {
  success: boolean;

  code: string;

  message: string;

  data: {
    id_cms_page: string;

    action: CmsPagePublicationAction;

    cms_page_status: CmsPageStatus;

    effective_status: CmsPageEffectiveStatus;

    cms_page_publish_at: string | null;

    cms_page_unpublish_at: string | null;
  };
}

//==================================================
//==== RESTORE
//==================================================

export interface ICmsPageRestoreResponse {
  success: boolean;

  code: string;

  message: string;

  data: {
    id_cms_page: string;

    cms_page_status: CmsPageStatus;

    effective_status: CmsPageEffectiveStatus;
  };
}
