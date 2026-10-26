import { IApiResponse } from './api-response.interface';

/** One row of an order list (GET .../order); the first row has position 1. */
export interface IOrderItem {
  id: string;
  key?: string;
  label: string;
  /** Raw state from the API (FAQ 0/1, product "draft" ...); pages turn it into `note`. */
  status?: number | string;
  /** Short state shown after the label, such as "Disembunyikan". */
  note?: string;
  thumbnail_url?: string | null;
  position: number;
}

export type IOrderListResponse = IApiResponse<{
  data: IOrderItem[];
  max?: number;
}>;

export type IOrderSaveResponse = IApiResponse<{ item_count: number }>;
