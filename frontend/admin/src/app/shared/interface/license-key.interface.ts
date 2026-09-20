import { IPaginateModel } from './core.interface';
import { IProduct, IVariation } from './product.interface';
import { IUser } from './user.interface';

export interface ILicenseKeyModel extends IPaginateModel {
  data: ILicenseKey[];
}

export interface ILicenseKey {
  id: number;
  license_key: string;
  separator: string;
  product_id: number;
  product: IProduct;
  variation_id: number;
  variation: IVariation;
  order_id: number;
  purchased_by: IUser;
  purchased_by_id: number;
  product_name: string;
  status: boolean;
  created_by_id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
