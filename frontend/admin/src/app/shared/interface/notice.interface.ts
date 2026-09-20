import { IPaginateModel } from './core.interface';

export interface INoticeModel extends IPaginateModel {
  data: INotice[];
}

export interface INotice {
  id: number;
  title: string;
  description: string;
  priority: string;
  badge: string;
  is_read: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
