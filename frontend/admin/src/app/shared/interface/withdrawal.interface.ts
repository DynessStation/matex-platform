import { IPaginateModel } from './core.interface';
import { IUser } from './user.interface';

export interface IWithdrawalModel extends IPaginateModel {
  data: IWithdrawal[];
}

export interface IWithdrawal {
  id: number;
  amount: number;
  message: string;
  status: string;
  withdrawal_status: string;
  vendor_wallet_id: number;
  vendor_id: number;
  user: IUser;
  vendor_name: string;
  payment_type: string;
  is_used: string;
  total_pending_withdraw_requests: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
