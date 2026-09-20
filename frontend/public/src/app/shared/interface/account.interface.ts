import { Attachment } from './attachment.interface';
import { PaymentDetails } from './payment-details.interface';
import { Point } from './point.interface';
import { Role } from './role.interface';
import { UserAddress } from './user.interface';
import { Wallet } from './wallet.interface';

export interface AccountUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code: string;
  profile_image?: Attachment;
  profile_image_id?: number;
  status: boolean;
  email_verified_at: string;
  payment_account: PaymentDetails;
  role_id: number;
  role_name?: string;
  role?: Role;
  address?: UserAddress[];
  point?: Point;
  wallet?: Wallet;
  orders_count: number;
  is_approved: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface AccountUserUpdatePassword {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
