export type WebNavigationStatus = 0 | 1;

export type WebNavigationItemStatus = 0 | 1;

export type WebNavigationItemLinkType =
  'cms_page' | 'internal' | 'external' | 'label';

export interface IWebNavigationSummary {
  id_web_navigation: string;

  key: string;

  name: string;

  location: string;

  default_locale: string;

  status: WebNavigationStatus;

  item_count: number;

  active_item_count: number;

  created: string;

  updated: string;
}

export interface IWebNavigationListResponse {
  success: boolean;

  code: string;

  message: string;

  data: {
    navigations: IWebNavigationSummary[];
  };
}

export interface IWebNavigationItemTranslation {
  locale: string;

  label: string;

  path: string | null;

  url: string | null;

  status: WebNavigationItemStatus;
}

export interface IWebNavigationCmsPageReference {
  key: string | null;

  title: string | null;
}

export interface IWebNavigationItem {
  id_web_navigation_item: string;

  id_parent_web_navigation_item: string | null;

  id_cms_page: string | null;

  cms_page: IWebNavigationCmsPageReference | null;

  key: string;

  link_type: WebNavigationItemLinkType;

  target_blank: boolean;

  icon: string | null;

  badge_text: string | null;

  badge_color: string | null;

  sort_order: number;

  status: WebNavigationItemStatus;

  settings: Record<string, unknown> | null;

  translations: IWebNavigationItemTranslation[];

  created: string;

  updated: string;
}

export interface IWebNavigationDetail {
  id_web_navigation: string;

  key: string;

  name: string;

  location: string;

  default_locale: string;

  status: WebNavigationStatus;

  settings: Record<string, unknown> | null;

  items: IWebNavigationItem[];

  created: string;

  updated: string;
}

export interface IWebNavigationDetailResponse {
  success: boolean;

  code: string;

  message: string;

  data: IWebNavigationDetail;
}

export interface IWebNavigationPayload {
  web_navigation_key: string;

  web_navigation_name: string;

  web_navigation_location: string;

  web_navigation_default_locale: string;

  web_navigation_settings_json: Record<string, unknown> | null;
}

export type IWebNavigationUpdatePayload = Omit<
  IWebNavigationPayload,
  'web_navigation_key'
>;

export interface IWebNavigationStatusPayload {
  web_navigation_status: WebNavigationStatus;
}

export interface IWebNavigationItemTranslationPayload {
  locale: string;

  label: string;

  path: string | null;

  url: string | null;

  status: WebNavigationItemStatus;
}

export interface IWebNavigationItemPayload {
  id_parent_web_navigation_item: string | null;

  id_cms_page: string | null;

  web_navigation_item_key: string;

  web_navigation_item_link_type: WebNavigationItemLinkType;

  web_navigation_item_target_blank: boolean;

  web_navigation_item_icon: string | null;

  web_navigation_item_badge_text: string | null;

  web_navigation_item_badge_color: string | null;

  web_navigation_item_sort_order: number;

  web_navigation_item_status: WebNavigationItemStatus;

  web_navigation_item_settings_json: Record<string, unknown> | null;

  translations: IWebNavigationItemTranslationPayload[];
}

export interface IWebNavigationReorderItem {
  id_web_navigation_item: string;

  id_parent_web_navigation_item: string | null;

  sort_order: number;
}

export interface IWebNavigationReorderPayload {
  items: IWebNavigationReorderItem[];
}

export interface IWebNavigationMutationResponse {
  success: boolean;

  code: string;

  message: string;

  data?: {
    id_web_navigation?: string;

    id_web_navigation_item?: string;

    status?: WebNavigationStatus;

    item_count?: number;

    deleted_item_count?: number;
  };
}
