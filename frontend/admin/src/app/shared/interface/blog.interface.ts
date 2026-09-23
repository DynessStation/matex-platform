import { IAttachment } from './attachment.interface';

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export interface IArticleTranslation {
  locale: 'id-ID' | 'en-US';
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  schema_json: string;
  status: 0 | 1;
}
export interface IBlog {
  id: string;
  key: string;
  title: string;
  slug: string;
  description: string;
  status: ArticleStatus;
  locale_status?: number;
  is_featured: boolean;
  is_sticky: boolean;
  published_at?: string | null;
  unpublished_at?: string | null;
  created_at?: string;
  updated_at?: string;
  blog_thumbnail: IAttachment | null;
}
export interface IArticleDetail extends IBlog {
  thumbnail: IAttachment | null;
  og_image: IAttachment | null;
  translations: IArticleTranslation[];
}
export interface IBlogModel {
  data: IBlog[];
  total: number;
  current_page?: number;
  per_page?: number;
}
export interface IArticlePayload {
  key: string;
  status: ArticleStatus;
  is_featured: 0 | 1;
  is_sticky: 0 | 1;
  published_at: string | null;
  unpublished_at: string | null;
  thumbnail_id: string | null;
  og_image_id: string | null;
  translations: IArticleTranslation[];
}
