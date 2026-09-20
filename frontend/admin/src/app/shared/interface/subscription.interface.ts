import { IPaginateModel } from './core.interface';

export interface ISubscriptionModel extends IPaginateModel {
  data: ISubscription[];
}

export interface ISubscription {
  id: number;
  email: string;
  created_at?: string;
  updated_at?: string;
}
