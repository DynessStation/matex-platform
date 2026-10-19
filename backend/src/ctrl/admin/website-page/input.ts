// Fixed website pages: the page list, their slots, and the rules for a save body.
import keyhsid from '../../../hsid';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';

export const FIXED_PAGE_KEYS = new Set(['home', 'about', 'contact', 'faq', 'terms', 'career']);

const SUPPORTED_LOCALES = ['id-ID', 'en-US'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'id-ID';

const FIXED_PATHS: Record<string, Record<Locale, string>> = {
  home: { 'id-ID': 'home', 'en-US': 'home' },
  about: { 'id-ID': 'tentang-matex', 'en-US': 'about-matex' },
  contact: { 'id-ID': 'kontak', 'en-US': 'contact-us' },
  faq: { 'id-ID': 'faq', 'en-US': 'faq' },
  terms: { 'id-ID': 'syarat-ketentuan', 'en-US': 'terms-and-conditions' },
  career: { 'id-ID': 'karir', 'en-US': 'careers' },
};

const HOME_MEDIA_SLOTS = [
  'home_main',
  'home_side_1',
  'home_side_2',
  'home_tile_1',
  'home_tile_2',
  'home_tile_3',
  'home_tile_4',
  'home_advertisement',
] as const;

const HOME_CONTENT_SECTION_KEYS = [
  'latex_features',
  'categories',
  'products',
  'articles',
  'tags',
  'newsletter',
  'advertisement',
] as const;

const ABOUT_CONTRACT_VERSION = 1;
const ABOUT_HIGHLIGHT_LIMIT = 3;
const ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH = 160;
const ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH = 1000;

const PAGE_MEDIA_SLOTS: Record<string, Set<string>> = {
  home: new Set([...HOME_MEDIA_SLOTS, 'og']),
  about: new Set(['about_content', 'og']),
  contact: new Set(['og']),
  faq: new Set(['og']),
  terms: new Set(['og']),
  career: new Set(['og']),
};

// Images a page must show (visible) before it can be published.
const REQUIRED_MEDIA_SLOTS: Record<string, readonly string[]> = {
  home: HOME_MEDIA_SLOTS,
  about: ['about_content'],
};

const CLICK_ACTIONS = new Set(['none', 'internal', 'external', 'product', 'category']);

const invalid = (code: string, message: string) => new HttpError(400, code, message);
const payloadInvalid = (message: string) => invalid('WEBSITE_PAGE_PAYLOAD_INVALID', message);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The fixed page key from the URL (case-insensitive), or null for anything else. */
export const readPageKey = (value: unknown): string | null => {
  const key = String(value).trim().toLowerCase();
  return FIXED_PAGE_KEYS.has(key) ? key : null;
};

export const getEffectiveStatus = (
  isPublished: number,
  publishAt: string | Date | null,
  unpublishAt: string | Date | null,
): 'draft' | 'scheduled' | 'published' | 'expired' => {
  if (isPublished !== 1) return 'draft';
  const now = Date.now();
  if (publishAt && new Date(publishAt).getTime() > now) return 'scheduled';
  if (unpublishAt && new Date(unpublishAt).getTime() <= now) return 'expired';
  return 'published';
};

const optionalString = (value: unknown, field: string, maximum: number): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > maximum) {
    throw payloadInvalid(`${field} is invalid or too long`);
  }
  return value;
};

const jsonValue = (value: unknown, field: string): unknown | null => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw payloadInvalid(`${field} must be an object`);
  try {
    JSON.stringify(value);
    return value;
  } catch {
    throw payloadInvalid(`${field} must be valid JSON data`);
  }
};

const dateValue = (value: unknown, field: string): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'string' ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) throw payloadInvalid(`${field} is invalid`);
  return date;
};

// Home content: version 2 or 3 (saved as 3), every section with a boolean visibility.
const normalizeHomeContent = (value: unknown): Record<string, unknown> => {
  const homeInvalid = (message: string) => invalid('WEBSITE_HOME_CONTENT_INVALID', message);
  if (!isRecord(value) || ![2, 3].includes(Number(value['home_contract_version']))) {
    throw homeInvalid('Home content settings use an unsupported format');
  }
  const content: Record<string, unknown> = { home_contract_version: 3 };
  for (const key of HOME_CONTENT_SECTION_KEYS) {
    const section = value[key];
    if (!isRecord(section) || typeof section['status'] !== 'boolean') {
      throw homeInvalid(`Home section ${key} requires a visibility setting`);
    }
    content[key] = { ...section };
  }
  return content;
};

// About content: up to three highlights, each with a title and description.
const normalizeAboutContent = (value: unknown): Record<string, unknown> => {
  const aboutInvalid = (message: string) => invalid('WEBSITE_ABOUT_CONTENT_INVALID', message);
  if (!isRecord(value) || value['about_contract_version'] !== ABOUT_CONTRACT_VERSION) {
    throw aboutInvalid('About MATEX content settings use an unsupported format');
  }
  const highlights = value['highlights'];
  if (!Array.isArray(highlights) || highlights.length > ABOUT_HIGHLIGHT_LIMIT) {
    throw aboutInvalid(`About MATEX supports up to ${ABOUT_HIGHLIGHT_LIMIT} highlights`);
  }
  return {
    about_contract_version: ABOUT_CONTRACT_VERSION,
    highlights: highlights.map((item) => {
      if (!isRecord(item)) {
        throw aboutInvalid('Each About MATEX highlight needs a title and description');
      }
      const title = typeof item['title'] === 'string' ? item['title'].trim() : '';
      const description = typeof item['description'] === 'string' ? item['description'].trim() : '';
      if (
        !title ||
        !description ||
        title.length > ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH ||
        description.length > ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH
      ) {
        throw aboutInvalid('Each About MATEX highlight needs a valid title and description');
      }
      return { title, description };
    }),
  };
};

const validateClickAction = (action: string, target: string | null): void => {
  const actionInvalid = (message: string) => invalid('WEBSITE_PAGE_MEDIA_ACTION_INVALID', message);
  if (!CLICK_ACTIONS.has(action)) throw actionInvalid('Banner click action is invalid');
  if (action === 'none') {
    if (target) throw actionInvalid('A banner without a click action cannot have a destination');
    return;
  }
  if (!target) throw actionInvalid('Banner destination is required');
  if (action === 'external' && !/^https:\/\/[^\s]+$/i.test(target)) {
    throw actionInvalid('External banner destinations must use HTTPS');
  }
  if (action === 'internal' && (!/^\/(?!\/)[^\s]*$/.test(target) || target.includes('..'))) {
    throw actionInvalid('Internal banner destinations must use a safe website path');
  }
  if (
    (action === 'product' || action === 'category') &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)
  ) {
    throw actionInvalid('Product and category destinations must use a valid address');
  }
};

const readLocale = (value: unknown, seen: Set<string>): Locale | null => {
  const locale = String(value ?? '');
  if (!SUPPORTED_LOCALES.includes(locale as Locale) || seen.has(locale)) return null;
  seen.add(locale);
  return locale as Locale;
};

const readTranslations = (pageKey: string, value: unknown) => {
  if (!Array.isArray(value) || value.length !== SUPPORTED_LOCALES.length) {
    throw invalid(
      'WEBSITE_PAGE_TRANSLATIONS_REQUIRED',
      'Indonesian and English content are required',
    );
  }
  const translationInvalid = (message: string) =>
    invalid('WEBSITE_PAGE_TRANSLATIONS_INVALID', message);
  const seenLocales = new Set<string>();
  return value.map((item: any) => {
    const locale = readLocale(item?.locale, seenLocales);
    if (!locale) throw translationInvalid('Each supported language must appear exactly once');
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    if (!title || title.length > 255 || typeof item?.is_published !== 'boolean') {
      throw translationInvalid('Each language needs a valid title and publication status');
    }
    const seo = item?.seo ?? {};
    const canonicalUrl = optionalString(seo.canonical_url, 'Canonical URL', 500);
    if (canonicalUrl && !/^https?:\/\/[^\s]+$/i.test(canonicalUrl)) {
      throw translationInvalid('Canonical URL must be an absolute HTTP or HTTPS URL');
    }
    const content = jsonValue(item.content, 'Structured page content');
    const structured = pageKey === 'home' || pageKey === 'about';
    return {
      locale,
      path: FIXED_PATHS[pageKey][locale],
      title,
      summary: optionalString(item.summary, 'Summary', 65535),
      bodyHtml: structured ? null : optionalString(item.body_html, 'Page content', 2_000_000),
      content:
        pageKey === 'home'
          ? normalizeHomeContent(content)
          : pageKey === 'about'
            ? normalizeAboutContent(content)
            : content,
      seoTitle: optionalString(seo.title, 'SEO title', 255),
      seoDescription: optionalString(seo.description, 'SEO description', 500),
      seoKeywords: optionalString(seo.keywords, 'SEO keywords', 500),
      seoRobots: optionalString(seo.robots, 'Search engine instruction', 100),
      canonicalUrl,
      socialTitle: optionalString(seo.social_title, 'Social title', 255),
      socialDescription: optionalString(seo.social_description, 'Social description', 500),
      schema: jsonValue(seo.schema, 'Structured SEO data'),
      isPublished: item.is_published ? 1 : 0,
    };
  });
};

const readMedia = (pageKey: string, value: unknown) => {
  const mediaInvalid = (message: string) => invalid('WEBSITE_PAGE_MEDIA_INVALID', message);
  if (!Array.isArray(value) || value.length > 10) {
    throw mediaInvalid('Page media selection is invalid');
  }
  const seenSlots = new Set<string>();
  const seenAttachments = new Set<number>();
  return value.map((item: any, index: number) => {
    const idAttachment = decodeId(item?.id_attachment, keyhsid.idAttachment);
    const slot = String(item?.slot ?? '');
    if (
      !idAttachment ||
      !PAGE_MEDIA_SLOTS[pageKey].has(slot) ||
      seenSlots.has(slot) ||
      seenAttachments.has(idAttachment) ||
      typeof item?.is_visible !== 'boolean'
    ) {
      throw mediaInvalid('Page media contains an invalid or duplicate assignment');
    }
    seenSlots.add(slot);
    seenAttachments.add(idAttachment);
    const clickAction = String(item.click_action ?? 'none');
    const clickTarget = optionalString(item.click_target, 'Banner destination', 1000);
    validateClickAction(clickAction, clickTarget);

    const texts = item.translations ?? [];
    if (!Array.isArray(texts) || texts.length > SUPPORTED_LOCALES.length) {
      throw mediaInvalid('Media text is invalid');
    }
    const textLocales = new Set<string>();
    return {
      idAttachment,
      slot,
      sortOrder: index,
      isVisible: item.is_visible ? 1 : 0,
      clickAction,
      clickTarget,
      translations: texts.map((text: any) => {
        const locale = readLocale(text?.locale, textLocales);
        if (!locale) throw mediaInvalid('Media languages must be unique and supported');
        return {
          locale,
          caption: optionalString(text.caption, 'Media caption', 500),
          altText: optionalString(text.alt_text, 'Alternative image text', 500),
        };
      }),
    };
  });
};

/** The save body of a fixed page, validated. Rejections are HttpErrors (400). */
export const readSavePayload = (pageKey: string, body: any) => {
  if (!isRecord(body)) throw payloadInvalid('Website page data is incomplete');
  if (typeof body.is_published !== 'boolean')
    throw payloadInvalid('Publication status is required');

  const publishAt = dateValue(body.publish_at, 'Publication start');
  const unpublishAt = dateValue(body.unpublish_at, 'Publication end');
  if (publishAt && unpublishAt && unpublishAt <= publishAt) {
    throw invalid(
      'WEBSITE_PAGE_PUBLICATION_WINDOW_INVALID',
      'Publication end must be later than its start',
    );
  }

  const translations = readTranslations(pageKey, body.translations);
  if (
    body.is_published &&
    translations.find((item) => item.locale === DEFAULT_LOCALE)?.isPublished !== 1
  ) {
    throw invalid(
      'WEBSITE_PAGE_DEFAULT_TRANSLATION_REQUIRED',
      'Published pages require published Indonesian content',
    );
  }

  const media = readMedia(pageKey, body.media);
  if (body.is_published) {
    const visibleSlots = new Set(
      media.filter((item) => item.isVisible === 1).map((item) => item.slot),
    );
    const missing = (REQUIRED_MEDIA_SLOTS[pageKey] ?? []).filter((slot) => !visibleSlots.has(slot));
    if (missing.length) {
      throw invalid(
        'WEBSITE_PAGE_MEDIA_REQUIRED',
        `Complete required page images: ${missing.join(', ')}`,
      );
    }

    // The About image needs alternative text in every published language.
    if (pageKey === 'about') {
      const contentImage = media.find(
        (item) => item.slot === 'about_content' && item.isVisible === 1,
      );
      const missingAltLocales = translations
        .filter((item) => item.isPublished === 1)
        .map((item) => item.locale)
        .filter(
          (locale) => !contentImage?.translations.find((text) => text.locale === locale)?.altText,
        );
      if (missingAltLocales.length) {
        throw invalid(
          'WEBSITE_ABOUT_MEDIA_ALT_REQUIRED',
          `About MATEX image alternative text is required for: ${missingAltLocales.join(', ')}`,
        );
      }
    }
  }

  return { isPublished: body.is_published ? 1 : 0, publishAt, unpublishAt, translations, media };
};

export type SavePayload = ReturnType<typeof readSavePayload>;
