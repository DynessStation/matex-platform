import { IAttachment } from './attachment.interface';
import { IPaginateModel } from './core.interface';

export interface IBrandModel extends IPaginateModel {
  data: IBrand[];
}

export interface IBrand {
  id: number;
  name: string;
  slug: string;
  brand_image_id?: number;
  brand_image?: IAttachment;
  brand_banner_id: number;
  brand_banner: IAttachment;
  brand_meta_image_id: number;
  brand_meta_image: IAttachment;
  meta_title: string;
  meta_description: string;
  status: boolean;
  created_by_id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
