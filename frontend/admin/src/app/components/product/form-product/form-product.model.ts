import { Select2Data } from 'ng-select2-component';

import { mediaConfig } from '../../../shared/data/media-config';

//==================================================
//==== TYPES
//==================================================

export type ProductFormLocale = 'id' | 'en';

export type ProductAssistField =
  'short_description' | 'description' | 'meta_description' | 'og_description';

export type ProductMeasurementControl =
  'weight_grams' | 'length_mm' | 'width_mm' | 'height_mm';

export interface ProductSpecificationRow {
  label: string;
  value: string;
}

//==================================================
//==== MEDIA
//==================================================

export const PRODUCT_IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

export const PRODUCT_GALLERY_ACCEPT = [
  ...PRODUCT_IMAGE_ACCEPT,
  ...mediaConfig.video,
];

/** Most gallery items a product keeps. */
export const PRODUCT_GALLERY_LIMIT = 10;

//==================================================
//==== SELECT OPTIONS
//==================================================

export const PRODUCT_TYPE_OPTIONS: Select2Data = [
  { value: 'physical', label: 'Produk fisik' },
  { value: 'service', label: 'Layanan' },
  { value: 'digital', label: 'Digital' },
];

export const PRODUCT_STATUS_OPTIONS: Select2Data = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Dipublikasikan' },
  { value: 'archived', label: 'Diarsipkan' },
];

export const STOCK_STATUS_OPTIONS: Select2Data = [
  { value: 'in_stock', label: 'Tersedia' },
  { value: 'out_of_stock', label: 'Habis' },
  { value: 'preorder', label: 'Pre-order' },
  { value: 'made_to_order', label: 'Dibuat sesuai pesanan' },
];

export const PRICE_VISIBILITY_OPTIONS: Select2Data = [
  { value: 'displayed', label: 'Tampilkan harga' },
  { value: 'contact', label: 'Hubungi kami' },
  { value: 'hidden', label: 'Sembunyikan' },
];

export const PRICE_TYPE_OPTIONS: Select2Data = [
  { value: 'end_user', label: 'Harga konsumen' },
  { value: 'wholesale', label: 'Harga grosir' },
];

export const CURRENCY_OPTIONS: Select2Data = [
  { value: 'IDR', label: 'Rupiah Indonesia (IDR)' },
  { value: 'USD', label: 'Dollar Amerika Serikat (USD)' },
];

export const MARKETPLACE_PROVIDER_OPTIONS: Select2Data = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'tiktok-shop', label: 'TikTok Shop' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'blibli', label: 'Blibli' },
  { value: 'website', label: 'Toko resmi / website' },
  { value: 'other', label: 'Lainnya' },
];
