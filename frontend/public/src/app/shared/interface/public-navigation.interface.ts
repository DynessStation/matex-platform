export type PublicNavigationLinkType = 'cms_page' | 'internal' | 'external' | 'label';

export interface IPublicNavigationBadge {
  text: string;

  color: string | null;
}

export interface IPublicNavigationItem {
  key: string;

  label: string;

  link_type: PublicNavigationLinkType;

  path: string | null;

  url: string | null;

  target_blank: boolean;

  icon: string | null;

  badge: IPublicNavigationBadge | null;

  children: IPublicNavigationItem[];

  active?: boolean;
}

export interface IPublicNavigation {
  key: string;

  location: string;

  locale: string;

  items: IPublicNavigationItem[];
}

export interface IPublicNavigationResponse {
  success: boolean;

  code: string;

  message: string;

  data: IPublicNavigation;
}
