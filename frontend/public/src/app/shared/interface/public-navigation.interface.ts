export interface IPublicNavigationItem {
  key: string;

  label: string;

  path: string;

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
