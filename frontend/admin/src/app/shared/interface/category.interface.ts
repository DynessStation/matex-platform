import { IAttachment } from './attachment.interface';

export type ProductCategoryStatus = 'draft' | 'published' | 'archived';
export interface ICategoryTranslation {
  locale: 'id-ID' | 'en-US';
  slug: string;
  name: string;
  description: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  status: 0 | 1;
}
export interface ICategory {
  id: any;
  parent_id?: any;
  key: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  status: ProductCategoryStatus;
  is_featured: boolean;
  sort_order: number;
  /** Products (not deleted) that use the category. */
  product_count?: number;
  category_image: IAttachment | null;
  category_icon: IAttachment | null;
  category_meta_image?: IAttachment | null;
  subcategories: ICategory[];
  created_at?: string;
  updated_at?: string;
}
export interface ICategoryDetail extends ICategory {
  translations: ICategoryTranslation[];
  /** Place among its siblings ("Posisi 2 dari 5"). */
  position: number;
  position_total: number;
}
export interface ICategoryModel {
  data: ICategory[];
  total: number;
  total_all?: number;
}
export interface ICategoryPayload {
  key: string;
  parent_id: string | null;
  status: ProductCategoryStatus;
  is_featured: 0 | 1;
  image_id: string | null;
  icon_id: string | null;
  og_image_id: string | null;
  translations: ICategoryTranslation[];
}

export interface ICategoryOrderItem {
  id: string;
  sort_order: number;
}
