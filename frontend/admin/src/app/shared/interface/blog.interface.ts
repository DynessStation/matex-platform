import { IAttachment } from './attachment.interface';
import { IListResponse } from './list.interface';

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
  author_name: string;
  tags: { id: string; name: string }[];
  thumbnail: IAttachment | null;
  og_image: IAttachment | null;
  translations: IArticleTranslation[];
}
export type IBlogModel = IListResponse<IBlog>;
export interface IArticlePayload {
  author_name: string;
  tags: { id?: string; name: string }[];
  status: ArticleStatus;
  is_featured: 0 | 1;
  is_sticky: 0 | 1;
  published_at: string | null;
  unpublished_at: string | null;
  thumbnail_id: string | null;
  og_image_id: string | null;
  translations: IArticleTranslation[];
}

export interface IArticleTag {
  id: string;
  key: string;
  name_id: string;
  name_en: string;
  article_count: number;
}

export interface IArticleInsightTop {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  thumbnail: string | null;
  views: number;
}

export interface IArticleInsightChart {
  labels: string[];
  published: number[];
  views: number[];
  shares: number[];
  reach: number[];
}

export interface IArticleInsightAudit {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
  archived: number;
  checks: {
    no_tag: number;
    untranslated: number;
    no_image: number;
    long_meta: number;
    no_excerpt: number;
  };
  score: number;
  score_change: number;
}
