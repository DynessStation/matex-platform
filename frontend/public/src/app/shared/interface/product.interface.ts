import { Attachment } from './attachment.interface';
import { Attribute, AttributeValue } from './attribute.interface';
import { Brand } from './brand.interface';
import { Category } from './category.interface';
import { PaginateModel } from './core.interface';
import { IStores } from './store.interface';

export interface ProductModel extends PaginateModel {
  data: Product[];
}

export type TProduct = Product;

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  sale_price: number;
  discount: number;
  rating: number;
  product_thumbnail: Attachment;
  product_galleries?: Attachment[];
  brand: Brand;
  categories: Category[];
  store: IStores;
  related_products?: number[];
  cross_sell_products?: number[];
  categories_ids?: number[];
  short_description?: string;
  description?: string;
  quantity: number;
  orders_count: number;
  product_type: string;
  wholesale_price_type: string | null;
  wholesales: WholesalePrice[];
  is_sale_enable: boolean | number;
  sale_starts_at: string;
  sale_expired_at: string;
  attributes: Attribute[];
  attributes_ids: number[];
  attribute_values: [];
  variations: Variation[];
  stock_status: string;
  status: boolean;
  is_external?: boolean;
  type?: string;
  external_url?: string;
  external_button_text?: string;
  rating_count?: number | null;
  reviews_count?: number | null;
  size_chart_image?: Attachment;
  is_return?: number;
  unit?: string;
  weight?: string;
  estimated_delivery_text?: string;
  return_policy_text?: string;
  safe_checkout?: boolean;
  secure_checkout?: boolean;
  can_review?: boolean;
  review_ratings?: number[];
  selected_variant?: Variation;
  is_wishlist: boolean;
  pivot?: PivotProduct;
  meta_title: string;
  meta_description: string;
  product_meta_image: Attachment;
}

export interface PivotProduct {
  order_id: number;
  product_id: number;
  quantity: number;
  shipping_cost: number;
  single_price: number;
  subtotal: number;
  variation_id?: number;
  variation: Variation;
  refund_status: string;
}

export interface Variation {
  id: number;
  name: string;
  price: number;
  sale_price: number;
  stock_status: string;
  product_id: number;
  sku: string;
  discount: number;
  quantity: number;
  variation_image: Attachment;
  variation_image_id: number;
  variation_options: VariationOption[];
  variation_galleries_id: [];
  variation_galleries: Attachment[];
  attribute_values: AttributeValue[];
  selected_variation: string;
  status: boolean;
}

export interface VariationOption {
  name: string;
  value: string;
}

export interface WholesalePrice {
  id?: number | null;
  min_qty: number;
  max_qty: number;
  value: number;
}

export interface SelectedVariant {
  id: number;
  attribute_id: number;
}
