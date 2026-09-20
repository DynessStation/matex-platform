export interface Params {
  [key: string]: any;
}

export interface IPaginateModel {
  current_page?: number;
  from?: number;
  last_page?: number;
  links?: ILink[];
  next_page_url?: string;
  path?: string;
  per_page?: number;
  prev_page_url?: string;
  to?: number;
  total: number;
}

export interface ILink {
  active?: number;
  label?: string;
  url?: string;
}
