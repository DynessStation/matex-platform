import { IBaseRow } from './table.interface';
import { IUser } from './user.interface';

export interface IVenderWallet {
  id?: number;
  consumer_id: number;
  balance: number;
  transactions: ITransactions;
  vendor: IUser;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ITransactions {
  current_page: number;
  data: ITransactionsData[];
  from: string;
  last_page: number;
  links: [];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface ITransactionsData extends IBaseRow {
  id: number;
  amount: number;
  detail: string;
  from: string;
  type: string;
  type_status: string;
  vendor_id: number;
  vendor_wallet_id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ITransactionsPayload {
  vendor_id: number;
  balance: number;
}
