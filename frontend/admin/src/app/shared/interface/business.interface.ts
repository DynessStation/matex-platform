// Bisnis: entities (the parties of the business), their stores per sales channel, and the
// revenue share rules between them. API: /api/v1/business (backend/src/ctrl/admin/business).

export type BusinessEntityKind = 'platform' | 'own_brand' | 'partner';

export interface IBusinessEntity {
  id: string;
  kind: BusinessEntityKind;
  name: string;
  code: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  show_on_website: boolean;
  note: string | null;
  status: boolean;
  store_count: number;
  product_count: number;
  account_count: number;
  created: string;
  updated: string;
}

export interface IBusinessEntityPayload {
  kind: BusinessEntityKind;
  name: string;
  code?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  show_on_website?: boolean;
  note?: string | null;
}

export interface IBusinessEntityOption {
  value: string;
  label: string;
  kind: BusinessEntityKind;
}

export interface IBusinessChannel {
  id: string;
  key: string;
  name: string;
}

export interface IStore {
  id: string;
  entity_id: string;
  entity_name: string;
  channel_id: string;
  channel_name: string;
  name: string;
  url: string | null;
  external_id: string | null;
  note: string | null;
  status: boolean;
}

export interface IStorePayload {
  channel_id: string;
  name: string;
  url?: string | null;
  external_id?: string | null;
  note?: string | null;
  status?: boolean;
}

export type RevenueShareKind = 'platform_fee' | 'production_fee' | 'other_fee';
export type RevenueShareType = 'percent' | 'fixed' | 'cost_plus';
export type RevenueShareBase = 'gross' | 'net';

export interface IRevenueShareComponent {
  kind: RevenueShareKind;
  label: string;
  type: RevenueShareType;
  value: number;
  base: RevenueShareBase;
  receiver_entity_id?: string | null;
}

export interface IRevenueShareRule {
  id: string;
  entity_id: string;
  entity_name: string;
  store_id: string | null;
  store_name: string | null;
  name: string;
  from: string;
  to: string | null;
  note: string | null;
  components: IRevenueShareComponent[];
}

export interface IRevenueShareRulePayload {
  name: string;
  store_id?: string | null;
  from: string;
  to?: string | null;
  note?: string | null;
  components: IRevenueShareComponent[];
}
