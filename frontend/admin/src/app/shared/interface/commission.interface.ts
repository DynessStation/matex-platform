import { IPaginateModel } from './core.interface';
import { IOrder } from './order.interface';
import { IStores } from './store.interface';

export interface ICommissionModel extends IPaginateModel {
  data: ICommission[];
}

export interface ICommission {
  id: number;
  order: IOrder;
  order_id: string;
  store: IStores;
  store_id: number;
  store_name: string;
  admin_commission: number;
  vendor_commission: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
