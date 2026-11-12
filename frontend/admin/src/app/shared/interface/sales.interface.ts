// Penjualan: orders and payouts imported from a store's Seller Center files, and the map from
// a channel's SKU to a product. API: /api/v1/sales (backend/src/ctrl/admin/sales).

export type SalesImportKind = 'orders' | 'settlement';

export interface ISalesStore {
  id: string;
  name: string;
  entity_name: string;
  channel_name: string;
  status: boolean;
  orders: number;
  settlements: number;
  unmapped: number;
  last_import: string | null;
}

export interface ISalesUnknownSku {
  ref: string;
  seller_sku: string | null;
  name: string | null;
  variation: string | null;
}

export interface ISalesImportReport {
  saved: boolean;
  import_id?: string;
  issues: { row: number; detail: string }[];
  summary: {
    kind: SalesImportKind;
    store: { id: string; name: string };
    file: string;
    rows: number;
    records: number;
    new_records: number;
    updated_records: number;
    period: { from: string | null; to: string | null };
    amount: number;
    adjustments: number;
    unknown_skus: ISalesUnknownSku[];
  };
}

export interface ISalesImport {
  id: string;
  store_id: string;
  store_name: string;
  kind: SalesImportKind;
  file: string;
  rows: number;
  new_records: number;
  updated_records: number;
  from: string | null;
  to: string | null;
  created: string;
  created_by: string | null;
}

export interface ISalesOrderLine {
  sku_ref: string;
  seller_sku: string | null;
  name: string | null;
  variation: string | null;
  qty: number;
  returned_qty: number;
  unit_price: number;
  discount_platform: number;
  discount_seller: number;
  subtotal: number;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
}

export interface ISalesOrder {
  id: string;
  store_id: string;
  store_name: string;
  ref: string;
  status: string;
  ordered_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  province: string | null;
  city: string | null;
  source: string | null;
  amount: number;
  shipping_fee: number;
  settled_amount: number | null;
  lines: ISalesOrderLine[];
}

export interface ISalesSettlement {
  id: string;
  store_id: string;
  store_name: string;
  ref: string;
  kind: 'order' | 'adjustment';
  label: string;
  order_ref: string | null;
  ordered_at: string | null;
  settled_at: string | null;
  amount: number;
  revenue: number;
  fees: number;
  source: string | null;
  detail: Record<string, number>;
}

export interface ISalesListMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  amount: number;
  revenue?: number;
  fees?: number;
  adjustments?: number;
}

export interface ISkuMap {
  id: string;
  store_id: string;
  store_name: string;
  ref: string;
  seller_sku: string | null;
  name: string | null;
  variation: string | null;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  sold_qty: number;
}

export interface ISalesProductOption {
  id: string;
  name: string;
  sku: string | null;
  status: string;
}

export interface ISalesFilter {
  store?: string;
  from?: string;
  to?: string;
  search?: string;
  kind?: string;
  page?: number;
}
