import { IAttachment } from './attachment.interface';
import { IPaginateModel } from './core.interface';

export interface IMenuModel extends IPaginateModel {
  data: IMenu[];
}

export interface IMenu {
  id?: number;
  title: string;
  link_type: string;
  path: string;
  parent_id: number;
  show?: boolean;
  mega_menu: number | boolean;
  mega_menu_type: string;
  set_page_link: string;
  badge_text: string;
  badge_color: string;
  is_target_blank: boolean | number;
  product_ids: number[];
  blog_ids: number[];
  child: IMenu[];
  banner_image_id: string;
  banner_image: IAttachment;
  item_image_id: string;
  item_image: IAttachment;
  status: number | boolean;
}

export interface IMobileMenu {
  id?: number;
  active?: boolean;
  title?: string;
  icon?: string;
  path?: string;
}
