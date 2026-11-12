// Dasbor Uang: the period's money per store, product, and party, and the book of each party.
// API: /api/v1/money (backend/src/ctrl/admin/money.ts).

export interface IMoneyBucket {
  key: string;
  name: string;
  detail: string | null;
  qty: number;
  revenue: number;
  amount: number;
  hpp: number;
  unmapped: boolean;
  orders?: number;
}

export interface IMoneyParty {
  id: string;
  name: string;
  share: number;
  fees: number;
  total: number;
}

export interface IMoneySummary {
  period: { from: string | null; to: string | null };
  orders: number;
  revenue: number;
  fees: number;
  adjustments: number;
  amount: number;
  hpp: number;
  gross_profit: number;
  unmapped_qty: number;
  stores: IMoneyBucket[];
  products: IMoneyBucket[];
  parties: IMoneyParty[];
}

export type LedgerKind =
  'share' | 'platform_fee' | 'production_fee' | 'other_fee' | 'payment';

export interface ILedgerEntry {
  id: string;
  entity_id: string;
  entity_name: string;
  counter_id: string;
  counter_name: string;
  store_name: string | null;
  kind: LedgerKind;
  date: string;
  label: string;
  amount: number;
  note: string | null;
  created: string;
  created_by: string | null;
}

export interface ILedgerBalance {
  entity_id: string;
  entity_name: string;
  counter_id: string;
  counter_name: string;
  balance: number;
  last_date: string | null;
}

export interface IMoneyFilter {
  entity?: string;
  store?: string;
  from?: string;
  to?: string;
}

export interface IPaymentPayload {
  payer_entity_id: string;
  payee_entity_id: string;
  date: string;
  amount: number;
  label?: string;
  note?: string | null;
}
