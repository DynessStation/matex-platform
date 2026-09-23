export interface IPublicCmsPage {
  key: string;
  template: string | null;
  locale: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  content_json: unknown | null;
  seo: {
    title: string;
    description: string;
    keywords: string;
    robots: string;
    canonical_url: string | null;
    og_title: string;
    og_description: string;
  };
  translations: { locale: string; slug: string }[];
  attachments: { role: string; asset_url: string; alt: string; caption: string }[];
}
