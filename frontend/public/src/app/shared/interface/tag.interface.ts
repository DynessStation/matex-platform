import { PaginateModel } from './core.interface';

export interface TagModel extends PaginateModel {
  data: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  status: number;
}
