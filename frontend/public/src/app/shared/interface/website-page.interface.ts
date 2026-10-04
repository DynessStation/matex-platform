export type WebsitePageClickAction = 'none' | 'internal' | 'external' | 'product' | 'category';

export interface IPublicWebsitePage {
  key: string;
  locale: string;
  path: string;
  title: string;
  summary: string | null;
  body_html: string | null;
  content: unknown | null;
  seo: {
    title: string;
    description: string;
    keywords: string;
    robots: string;
    canonical_url: string | null;
    social_title: string;
    social_description: string;
  };
  translations: { locale: string; path: string }[];
  media: {
    slot: string;
    asset_url: string;
    alt_text: string;
    caption: string;
    click_action: WebsitePageClickAction;
    click_target: string | null;
  }[];
}
