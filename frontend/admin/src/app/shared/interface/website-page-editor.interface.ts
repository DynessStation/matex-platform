import { IAttachment } from './attachment.interface';

//==================================================
//==== TYPE
//==================================================

export type WebsitePageEditorStatus = 0 | 1 | 2;

export type WebsitePageEditorVisibility = 0 | 1 | 2;

export type WebsitePageEditorI18nStatus = 0 | 1;

export type WebsitePageEditorEffectiveStatus =
  'draft' | 'scheduled' | 'published' | 'expired' | 'archived';

export type WebsitePageEditorPublicationAction =
  | 'publish'
  | 'schedule'
  | 'cancel_schedule'
  | 'unpublish'
  | 'archive'
  | 'restore';

//==================================================
//==== TRANSLATION
//==================================================

export interface IWebsitePageEditorTranslation {
  website_page_locale: string;

  website_page_slug: string;

  website_page_title: string;

  website_page_excerpt: string | null;

  website_page_content: string | null;

  website_page_content_json: unknown | null;

  website_page_meta_title: string | null;

  website_page_meta_description: string | null;

  website_page_meta_keywords: string | null;

  website_page_meta_robots: string | null;

  website_page_canonical_url: string | null;

  website_page_og_title: string | null;

  website_page_og_description: string | null;

  website_page_schema_json: unknown | null;

  website_page_i18n_status: WebsitePageEditorI18nStatus;

  created: string;

  updated: string;
}

//==================================================
//==== ATTACHMENT TRANSLATION
//==================================================

export interface IWebsitePageEditorAttachmentTranslation {
  website_page_attachment_locale: string;

  website_page_attachment_caption: string | null;

  website_page_attachment_alt_text: string | null;

  created: string;

  updated: string;
}

//==================================================
//==== ATTACHMENT
//==================================================

export interface IWebsitePageEditorAttachment extends IAttachment {
  website_page_attachment_role: string;

  website_page_attachment_sort_order: number;

  website_page_attachment_is_public: 0 | 1;

  website_page_attachment_action_type:
    'none' | 'internal' | 'external' | 'product' | 'category';

  website_page_attachment_action_value: string | null;

  translations: IWebsitePageEditorAttachmentTranslation[];

  created: string;

  updated: string;
}

//==================================================
//==== ACTOR
//==================================================

export interface IWebsitePageEditorActor {
  id_admin_acct: string;

  alias: string | null;
}

//==================================================
//==== DETAIL
//==================================================

export interface IWebsitePageEditorDetail {
  id_website_page: string;

  id_parent_website_page: string | null;

  website_page_key: string;

  website_page_type: string;

  website_page_template: string | null;

  website_page_content_mode: string;

  website_page_default_locale: string;

  website_page_status: WebsitePageEditorStatus;

  effective_status: WebsitePageEditorEffectiveStatus;

  website_page_visibility: WebsitePageEditorVisibility;

  website_page_is_system: 0 | 1;

  website_page_is_featured: 0 | 1;

  website_page_sort_order: number;

  website_page_publish_at: string | null;

  website_page_unpublish_at: string | null;

  website_page_settings_json: unknown | null;

  translations: IWebsitePageEditorTranslation[];

  attachments: IWebsitePageEditorAttachment[];

  translation_count: number;

  attachment_count: number;

  created_by: IWebsitePageEditorActor | null;

  updated_by: IWebsitePageEditorActor | null;

  created: string;

  updated: string;
}

//==================================================
//==== SAVE TRANSLATION
//==================================================

export interface IWebsitePageEditorTranslationPayload {
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

  status?: WebsitePageEditorI18nStatus;
}

//==================================================
//==== SAVE ATTACHMENT TRANSLATION
//==================================================

export interface IWebsitePageEditorAttachmentTranslationPayload {
  locale: string;

  caption?: string | null;

  alt_text?: string | null;
}

//==================================================
//==== SAVE ATTACHMENT
//==================================================

export interface IWebsitePageEditorAttachmentPayload {
  id_attachment: string;

  role?: string;

  sort_order?: number;

  is_public?: 0 | 1 | boolean;

  action_type?: 'none' | 'internal' | 'external' | 'product' | 'category';

  action_value?: string | null;

  translations?: IWebsitePageEditorAttachmentTranslationPayload[];
}

//==================================================
//==== SAVE
//==================================================

export interface IWebsitePageEditorPayload {
  id_parent_website_page?: string | null;

  website_page_key: string;

  website_page_type?: string;

  website_page_template?: string | null;

  website_page_content_mode?: string;

  website_page_default_locale?: string;

  website_page_status?: WebsitePageEditorStatus;

  website_page_visibility?: WebsitePageEditorVisibility;

  website_page_is_system?: 0 | 1 | boolean;

  website_page_is_featured?: 0 | 1 | boolean;

  website_page_sort_order?: number;

  website_page_publish_at?: string | null;

  website_page_unpublish_at?: string | null;

  website_page_settings_json?: unknown;

  translations: IWebsitePageEditorTranslationPayload[];

  attachments?: IWebsitePageEditorAttachmentPayload[];
}

//==================================================
//==== FORM SAVE
//==================================================

export interface IWebsitePageEditorSaveRequest {
  payload: IWebsitePageEditorPayload;

  publicationActions: IWebsitePageEditorPublicationPayload[];
}

//==================================================
//==== PUBLICATION
//==================================================

export interface IWebsitePageEditorPublicationPayload {
  action: WebsitePageEditorPublicationAction;

  website_page_publish_at?: string | null;

  website_page_unpublish_at?: string | null;
}
