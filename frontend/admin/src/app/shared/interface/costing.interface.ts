// HPP, prices, channels, and the calculator (backend ctrl/admin/costing). Rates are fractions.

export type CostPriceStatus =
  'no_product' | 'no_hpp' | 'manual' | 'follow' | 'review';

export const PRICE_STATUS_LABELS: Record<CostPriceStatus, string> = {
  no_product: 'Belum ada produk',
  no_hpp: 'Belum ada HPP',
  manual: 'Harga manual',
  follow: 'Ikut hitungan',
  review: 'Perlu ditinjau',
};

export const COST_KIND_LABELS: Record<string, string> = {
  material: 'Bahan',
  service: 'Tenaga kerja & jasa',
  overhead: 'Overhead',
  packaging: 'Kemasan',
  shipping: 'Ongkir',
  other: 'Lainnya',
};

export interface ICostRates {
  gpm: number;
  affiliate: number;
  app: number;
}

export interface ICostLine {
  material_id: string | null;
  label: string;
  material_name: string | null;
  kind: string | null;
  unit: string | null;
  qty: number;
  formula: string | null;
  own_price: number | null;
  price: number;
  total: number;
}

export interface ICostItem {
  id: string;
  name: string;
  group: string | null;
  sku: string | null;
  product_id: string | null;
  product_name: string | null;
  product_status: string | null;
  width: number | null;
  length: number | null;
  height: number | null;
  rates: ICostRates;
  own_rates: {
    gpm: number | null;
    affiliate: number | null;
    app: number | null;
  };
  price_mode: 'follow' | 'manual';
  status: CostPriceStatus;
  breakdown: { kind: string; total: number }[];
  version: number;
  hpp: number;
  net: number;
  affiliate_price: number;
  commerce: number;
  wholesale: number;
  usd: number;
  usd_wholesale: number;
  live: {
    idr: number | null;
    wholesale: number | null;
    usd: number | null;
    usd_wholesale: number | null;
  };
  lines?: ICostLine[];
}

export interface ICostItemPayload {
  name: string;
  group: string | null;
  sku: string | null;
  width: number | null;
  length: number | null;
  height: number | null;
  gpm: number | null;
  affiliate: number | null;
  app: number | null;
}

export interface ICostLinePayload {
  material_id: string | null;
  label: string;
  qty: number;
  formula: string | null;
  own_price: number | null;
}

export interface ICostMaterial {
  id: string;
  name: string;
  kind: string;
  unit: string;
  note: string | null;
  status: boolean;
  price: number | null;
  price_from: string | null;
  used_by: number;
}

export interface ICostImpact {
  id: string;
  name: string;
  sku: string | null;
  hpp: number;
  change: number;
}

export interface ICostSetting {
  gpm: number;
  affiliate: number;
  app: number;
  wholesale_discount: number;
  usd_rate: number;
  round_idr: number;
}

export interface ISalesChannelFee {
  id: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  cap: number | null;
  per: 'item' | 'order';
  from: string;
  to: string | null;
  category_id: string | null;
  category_name: string | null;
}

export interface ISalesChannel {
  id: string;
  name: string;
  status: boolean;
  fees: ISalesChannelFee[];
}

export interface ICalculateRequest {
  item_id?: string;
  hpp?: number;
  price?: number;
  qty: number;
  discount: number;
  voucher: number;
  ads_rate: number;
  shipping: number;
  tax_rate: number;
  target_margin?: number | null;
}

export interface ICalculatedChannel {
  id: string;
  name: string;
  has_rules: boolean;
  revenue: number;
  fees: { name: string; amount: number }[];
  received: number;
  cost: number;
  profit: number;
  margin: number;
  minimum_price: number | null;
}

export interface ICalculateResult {
  hpp: number;
  price: number;
  channels: ICalculatedChannel[];
}

export interface IImportIssue {
  kind: string;
  row: number | null;
  item: string | null;
  detail: string;
}

export interface IImportReport {
  saved: boolean;
  recipes?: number;
  issues: IImportIssue[];
  summary: {
    items: number;
    with_product: number;
    without_product: string[];
    unknown_skus: string[];
    new_items: number;
    updated_items: number;
    materials: number;
    price_changes: {
      sku: string;
      name: string;
      status: string;
      live: number | null;
      excel: number;
    }[];
  };
}

export const rupiah = (value: number | null | undefined): string =>
  value == null
    ? '-'
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value);

export const percent = (value: number | null | undefined): string =>
  value == null
    ? '-'
    : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value * 100)}%`;

export const costSize = (item: ICostItem): string =>
  item.width == null ? '-' : `${item.width} x ${item.length} x ${item.height}`;
