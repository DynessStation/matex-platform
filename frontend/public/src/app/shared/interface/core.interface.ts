export interface Params {
  [key: string]: any;
}

export interface PaginateModel {
  current_page?: number;
  first_page_url?: string;
  from?: number;
  last_page?: number;
  links?: Link[];
  next_page_url?: string;
  path?: string;
  per_page?: number;
  prev_page_url?: string;
  to?: number;
  total: number;
}

export interface Link {
  active?: number;
  label?: string;
  url?: string;
}

export interface BannerLink {
  image_url?: string;
  redirection_type?: string;
  link?: string;
}
