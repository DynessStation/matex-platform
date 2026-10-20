// Types and constants of the fixed website page form, shared by the form and its tabs.
import { GADGET_HOME_MEDIA_RULES } from '../../../shared/data/gadget-home-media';
import { IAttachment } from '../../../shared/interface/attachment.interface';

export type WebsitePageEditorLocale = 'id-ID' | 'en-US';

export type WebsitePageEditorPublicationChoice =
  'current' | 'draft' | 'publish_now' | 'schedule' | 'archive';

export const HOME_SECTION_KEYS = [
  'latex_features',
  'categories',
  'products',
  'articles',
  'tags',
  'newsletter',
  'advertisement',
] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];
export type HomeSectionVisibility = Record<HomeSectionKey, boolean>;

export const HOME_SECTION_DEFAULTS: HomeSectionVisibility = {
  latex_features: true,
  categories: true,
  products: true,
  articles: true,
  tags: false,
  newsletter: false,
  advertisement: false,
};

export interface HomeLatexFeatureDraft {
  title: string;
  description: string;
}

export interface HomeLatexContentDraft {
  eyebrow: string;
  title: string;
  description: string;
  items: HomeLatexFeatureDraft[];
}

export interface HomeAdvertisementDraft {
  label: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
}

export interface AboutFeatureDraft {
  title: string;
  description: string;
}

export const ABOUT_CONTRACT_VERSION = 1;
export const ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH = 160;
export const ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH = 1000;

//==================================================
//==== MEDIA DRAFT
//==================================================

export interface WebsitePageEditorMediaTranslationDraft {
  caption: string;

  alt_text: string;
}

export interface WebsitePageEditorMediaDraft {
  attachment: IAttachment;

  role: string;

  is_public: boolean;

  action_type: 'none' | 'internal' | 'external' | 'product' | 'category';

  action_value: string;

  translations: Record<
    WebsitePageEditorLocale,
    WebsitePageEditorMediaTranslationDraft
  >;
}

export const PAGE_MEDIA_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

export const GADGET_HOME_MEDIA_ROLES = [
  ...GADGET_HOME_MEDIA_RULES.map((rule) => ({
    value: rule.value,
    label: `${rule.label} (${rule.recommendedWidth} × ${rule.recommendedHeight})`,
  })),
  { value: 'og', label: 'Open Graph / share image' },
];
