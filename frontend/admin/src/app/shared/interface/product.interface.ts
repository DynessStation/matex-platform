import { IAttachment } from './attachment.interface';
import { IAttribute, IAttributeValue } from './attribute.interface';
import { IBrand } from './brand.interface';
import { ICategory } from './category.interface';
import { IPaginateModel } from './core.interface';
import { ILicenseKey } from './license-key.interface';
import { IStores } from './store.interface';
import { ITag } from './tag.interface';
import { ITax } from './tax.interface';

export interface IProductModel extends IPaginateModel {
  data: IProduct[];
}

export interface IProduct {
  id: any;
  key?: string;
  product_type: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  type: string;
  product_thumbnail_id: number;
  product_thumbnail: IAttachment;
  watermark: boolean;
  watermark_position: string;
  watermark_image_id: number;
  watermark_image: IAttachment;
  product_galleries_id: [];
  product_galleries: IAttachment[];
  unit: string;
  weight: number;
  price: number;
  sale_price: number;
  discount: number;
  wholesale_price_type: string;
  wholesales: IWholesalePrice[];
  is_sale_enable: boolean;
  sale_starts_at: string;
  sale_expired_at: string;
  sku: string;
  stock_status: string;
  stock: string;
  visible_time: string;
  quantity: number;
  store_id: number;
  size_chart_image_id: number;
  size_chart_image: IAttachment;
  estimated_delivery_text: string;
  return_policy_text: string;
  safe_checkout: boolean;
  secure_checkout: boolean;
  social_share: boolean;
  encourage_order: boolean;
  encourage_view: boolean;
  is_free_shipping: boolean;
  is_featured: boolean;
  is_trending: boolean;
  is_return: boolean;
  shipping_days: number;
  tax_id: number;
  tax: ITax;
  status: any;
  meta_title: string;
  meta_description: string;
  product_meta_image: IAttachment;
  product_meta_image_id: number;
  tags: ITag[];
  tag: ITag;
  categories: ICategory[];
  category: ICategory;
  brand_id: number;
  brand: IBrand;
  store: IStores;
  store_name: string;
  orders_count: string | number;
  order_amount: string | number;
  attribute_values: [];
  variations: IVariation[];
  variants: IVariant[];
  attributes: IAttribute[];
  attributes_ids: number[];
  is_random_related_products: boolean;
  digital_files: IAttachment[];
  digital_file_ids: number[];
  is_licensable: boolean;
  is_licensekey_auto: string;
  license_key: string;
  license_keys: ILicenseKey[];
  separator: string;
  preview_type: string;
  preview_audio_file: IAttachment;
  preview_audio_file_id: number;
  preview_video_file: IAttachment;
  preview_video_file_id: number;
  preview_url: string;
  is_external: boolean;
  external_url: string;
  external_button_text: string;
  related_products: number[];
  cross_sell_products: number[];
  pivot?: IPivotProduct;
  created_by_id: number;
  is_approved: boolean;
  total_in_approved_products: number;
  published_at: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  translations?: IProductTranslation[];
  prices?: IProductPrice[];
  marketplaces?: IProductMarketplace[];
  media?: Array<IAttachment & { role: ProductMediaRole; sort_order: number }>;
  category_ids?: string[];
  price_visibility?: ProductPriceVisibility;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  internal_commerce_enabled?: boolean;
  manufacturer_code?: string;
  barcode?: string;
  country_origin?: string;
  hs_code?: string;
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  min_order_qty?: number;
  lead_time_days?: number | null;
  sort_order?: number;
}

export type ProductCatalogStatus = 'draft' | 'published' | 'archived';
export type ProductPriceVisibility = 'displayed' | 'contact' | 'hidden';
export type ProductMediaRole = 'thumbnail' | 'gallery' | 'og' | 'size_chart' | 'document';
export interface IProductTranslation {
  locale: 'id-ID' | 'en-US'; slug: string; name: string;
  short_description: string; description: string; specifications: unknown;
  meta_title: string; meta_description: string; canonical_url: string;
  og_title: string; og_description: string; status: 0 | 1;
}
export interface IProductPrice {
  id?: number; type: string; label: string | null; currency: string; amount: number;
  compare_at: number | null; min_qty: number | null; max_qty: number | null;
  starts_at?: string | null; ends_at?: string | null; is_public: boolean;
  is_active: boolean; sort_order: number;
}
export interface IProductMarketplace {
  id?: number; provider: string; label: string | null; url: string; sku: string | null;
  price: number | null; currency: string; is_primary: boolean; is_active: boolean; sort_order: number;
}
export interface IProductPayload {
  key: string; sku: string; product_type: 'physical' | 'service' | 'digital';
  status: ProductCatalogStatus; unit: string | null; barcode: string | null;
  manufacturer_code: string | null; country_origin: string | null; hs_code: string | null;
  weight_grams: number | null; length_mm: number | null; width_mm: number | null; height_mm: number | null;
  min_order_qty: number; lead_time_days: number | null; manage_stock: 0 | 1;
  stock_quantity: number | null; stock_status: string; price_visibility: ProductPriceVisibility;
  internal_commerce_enabled: 0 | 1; is_featured: 0 | 1; sort_order: number;
  category_ids: string[]; media: Array<{ id: string; role: ProductMediaRole; sort_order: number }>;
  prices: IProductPrice[]; marketplaces: IProductMarketplace[]; translations: IProductTranslation[];
}

export interface IWholesalePrice {
  id?: number | null;
  min_qty: number;
  max_qty: number;
  value: number;
}

export interface IPivotProduct {
  order_id: number;
  product_id: number;
  quantity: number;
  shipping_cost: number;
  single_price: number;
  subtotal: number;
  variation_id?: number;
  variation: IVariation;
  wholesale_price: number;
}

export interface IVariation {
  id?: number;
  name: string;
  price: number;
  sale_price: number;
  stock_status: string;
  sku: string;
  discount: number;
  quantity: number;
  digital_files: IAttachment[];
  digital_file_ids: number[];
  variation_galleries_id: number[];
  variation_galleries: IAttachment[];
  is_licensable: boolean;
  is_licensekey_auto: string;
  license_key: string;
  license_keys: ILicenseKey[];
  separator: string;
  variation_image: IAttachment;
  variation_image_id: number;
  variation_options: IVariationOption[];
  attribute_values: IAttributeValue[];
  status: boolean;
}

export interface IVariationOption {
  name: string;
  value: string;
}

export interface IVariant {
  id: number | null;
  attribute_values: number[] | null;
  options: any;
  variant_option: any;
}

export interface IVariationCombination {
  name: string;
  attribute_values: number[];
}

export interface ISelectedVariant {
  id: number;
  attribute_id: number;
}

export interface ICustomSelect2Product {
  label: string;
  value: string | number;
  data: IProductData;
}

export interface IProductData {
  image: string;
  name: string;
  slug: string;
  stock_status: string;
  type: string;
}
