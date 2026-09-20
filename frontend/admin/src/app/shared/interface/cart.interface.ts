import { IProduct, IVariation } from './product.interface';

export interface ICartModel {
  is_digital_only: boolean;
  items: ICart[];
  total: number;
}

export interface ICart {
  id: number;
  product_id: number;
  variation: IVariation;
  variation_id: number;
  consumer_id: number;
  quantity: number;
  sub_total: number;
  wholesale_price: number | null;
  product: IProduct;
  created_by_id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ICartAddOrUpdate {
  id?: number;
  product_id: number;
  product: IProduct;
  variation_id: number | null | String;
  variation: IVariation | null;
  quantity: number;
}
