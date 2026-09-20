import { Attachment } from './attachment.interface';
import { PaginateModel } from './core.interface';

export interface CategoryModel extends PaginateModel {
  data: Category[];
}

export type ICategory = Category;

export interface Category {
  id: number;
  name: string;
  slug: string;
  category_icon?: Attachment;
  subcategories?: Category[];
  type: string;
  meta_title: string;
  meta_description: string;
  category_meta_image: Attachment;
}
