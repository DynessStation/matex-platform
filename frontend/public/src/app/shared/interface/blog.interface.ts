import { Attachment } from './attachment.interface';
import { Category } from './category.interface';
import { PaginateModel } from './core.interface';
import { Tag } from './tag.interface';
import { User } from './user.interface';

export interface IBlogModel extends PaginateModel {
  data: IBlog[];
}

export interface IBlog {
  id: string;
  title: string;
  slug: string;
  localized_slugs?: Record<string, string>;
  description: string;
  content: string;
  status: boolean;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  schema_json?: Record<string, unknown> | null;
  blog_thumbnail: Attachment | null;
  blog_thumbnail_id: number;
  blog_meta_image_id: number;
  blog_meta_image: Attachment | null;
  categories: Category[];
  tags: Tag[];
  is_featured: boolean;
  is_sticky: boolean | number;
  created_by: User;
  /** A writer's name was set; otherwise created_by says MATEX. */
  has_author?: boolean;
  created_by_id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

/** What a tag page knows about its tag. */
export interface IBlogTagPage {
  name: string;
  slug: string;
  localized_slugs: Record<string, string>;
  article_count: number;
  /** Enough articles for search engines. */
  indexable: boolean;
}
