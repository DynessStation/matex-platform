import { IAttachment } from './attachment.interface';
import { IListResponse } from './list.interface';

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
  id: string;
  parent_id?: string | null;
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
export type ICategoryModel = IListResponse<ICategory>;
export interface ICategoryPayload {
  /** Left out: the server makes it, and an existing category keeps its own. */
  key?: string;
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

export interface ICategoryInsightTop {
  id: string;
  name: string;
  slug: string;
  views: number;
}

export interface ICategoryInsightCheck {
  count: number;
  first_id: string | null;
}

export interface ICategoryInsightAudit {
  total: number;
  published: number;
  draft: number;
  archived: number;
  products: {
    id: string;
    name: string;
    products: number;
    published_products: number;
  }[];
  checks: {
    no_product: ICategoryInsightCheck;
    no_image: ICategoryInsightCheck;
    no_description: ICategoryInsightCheck;
    untranslated: ICategoryInsightCheck;
    no_seo: ICategoryInsightCheck;
  };
}
