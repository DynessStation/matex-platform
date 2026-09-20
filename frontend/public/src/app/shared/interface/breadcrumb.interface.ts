export type IBreadcrumb = breadcrumb;

export interface breadcrumb {
  title: string;
  items: item[];
}

export interface item {
  label: string;
  url?: string;
  active?: boolean;
}
