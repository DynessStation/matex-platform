import { Attachment } from './attachment.interface';
import { PaginateModel } from './core.interface';

export interface CategoryModel extends PaginateModel {
  data: Category[];
}

export type ICategory = Category;

export interface Category {
  id: number;
  parent_id?: number | null;
  key?: string;
  name: string;
  slug: string;
  description?: string;
  category_image?: Attachment | null;
  category_icon?: Attachment | null;
  subcategories?: Category[];
  type: string;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  category_meta_image: Attachment | null;
  is_featured?: boolean;
  sort_order?: number;
  status?: boolean;
}
