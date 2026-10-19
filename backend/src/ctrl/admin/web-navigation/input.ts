// Navigation input rules: key, metadata, and menu items. Invalid input throws HttpError (400).
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
} from '../../../config/public-content.config';
import {
  getFixedWebNavigationPath,
  isFixedWebNavigationKey,
} from '../../../config/web-navigation.config';
import { HttpError } from '../../../helper/http-error.helper';
import { parseFlag } from '../../../helper/input.helper';

const invalid = (code: string, message: string) => new HttpError(400, code, message);

const SLUG = /^[a-z0-9][a-z0-9_-]*$/;

export const readNavigationKey = (value: unknown): string => {
  const key = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!key || key.length > 100 || !SLUG.test(key)) {
    throw invalid('WEB_NAVIGATION_KEY_INVALID', 'Invalid web navigation key');
  }
  return key;
};

export interface NavigationMetadata {
  name: string;
  location: string;
  defaultLocale: string;
  settingsJson: string | null;
  settings: Record<string, unknown> | null;
}

export const readNavigationMetadata = (body: any): NavigationMetadata => {
  const name = String(body?.web_navigation_name ?? '').trim();
  if (!name || name.length > 255) {
    throw invalid(
      'WEB_NAVIGATION_NAME_INVALID',
      'Web navigation name is required and must not exceed 255 characters',
    );
  }

  const location = String(body?.web_navigation_location ?? '')
    .trim()
    .toLowerCase();
  if (!location || location.length > 50 || !SLUG.test(location)) {
    throw invalid('WEB_NAVIGATION_LOCATION_INVALID', 'Invalid web navigation location');
  }

  const defaultLocale = String(body?.web_navigation_default_locale ?? '').trim();
  if (!isPublicContentLocale(defaultLocale)) {
    throw invalid('WEB_NAVIGATION_LOCALE_UNSUPPORTED', 'Unsupported default locale');
  }

  const raw = body?.web_navigation_settings_json ?? null;
  if (raw === null || raw === undefined || raw === '') {
    return { name, location, defaultLocale, settingsJson: null, settings: null };
  }

  let settings: unknown = raw;
  if (typeof raw === 'string') {
    try {
      settings = JSON.parse(raw);
    } catch {
      throw invalid(
        'WEB_NAVIGATION_SETTINGS_INVALID',
        'Web navigation settings must contain valid JSON',
      );
    }
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    throw invalid(
      'WEB_NAVIGATION_SETTINGS_INVALID',
      'Web navigation settings must be a JSON object',
    );
  }

  return {
    name,
    location,
    defaultLocale,
    settingsJson: JSON.stringify(settings),
    settings: settings as Record<string, unknown>,
  };
};

export interface NavigationItemTranslation {
  locale: string;
  label: string;
  path: string | null;
  url: string | null;
  status: 0 | 1;
}

export interface NavigationItemInput {
  key: string;
  sortOrder: number;
  status: 0 | 1;
  translations: NavigationItemTranslation[];
}

/**
 * Menu items are the fixed website sections (config/web-navigation.config.ts); their public paths
 * come from that config, never from the request. Both Indonesian and English labels are required,
 * and the navigation's default locale must have an active one.
 */
export const readNavigationItemInput = (body: any, defaultLocale: string): NavigationItemInput => {
  const key = String(body?.web_navigation_item_key ?? '')
    .trim()
    .toLowerCase();
  if (!isFixedWebNavigationKey(key)) {
    throw invalid(
      'WEB_NAVIGATION_ITEM_KEY_INVALID',
      'Navigation item is not part of the fixed website header',
    );
  }

  const status = parseFlag(body?.web_navigation_item_status ?? 1);
  if (status === null) {
    throw invalid('WEB_NAVIGATION_ITEM_STATUS_INVALID', 'Navigation item status must be 0 or 1');
  }

  const sortOrder = Number(body?.web_navigation_item_sort_order ?? 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 2147483647) {
    throw invalid('WEB_NAVIGATION_ITEM_SORT_INVALID', 'Invalid navigation item sort order');
  }

  if (!Array.isArray(body?.translations)) {
    throw invalid(
      'WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED',
      'Navigation item translations are required',
    );
  }

  const translations: NavigationItemTranslation[] = [];
  for (const item of body.translations) {
    const locale = String(item?.locale ?? '').trim();
    if (!isPublicContentLocale(locale)) {
      throw invalid('WEB_NAVIGATION_ITEM_LOCALE_UNSUPPORTED', `Unsupported locale: ${locale}`);
    }
    if (translations.some((translation) => translation.locale === locale)) {
      throw invalid('WEB_NAVIGATION_ITEM_LOCALE_DUPLICATE', `Duplicate locale: ${locale}`);
    }
    const label = String(item?.label ?? '').trim();
    if (!label || label.length > 255) {
      throw invalid('WEB_NAVIGATION_ITEM_LABEL_INVALID', `Invalid label for locale ${locale}`);
    }
    const translationStatus = parseFlag(item?.status ?? 1);
    if (translationStatus === null) {
      throw invalid(
        'WEB_NAVIGATION_ITEM_TRANSLATION_STATUS_INVALID',
        `Invalid translation status for locale ${locale}`,
      );
    }
    translations.push({
      locale,
      label,
      path: getFixedWebNavigationPath(key, locale),
      url: null,
      status: translationStatus,
    });
  }

  if (PUBLIC_CONTENT_LOCALES.some((locale) => !translations.some((t) => t.locale === locale))) {
    throw invalid(
      'WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED',
      'Indonesian and English labels are required',
    );
  }
  if (!translations.some((t) => t.locale === defaultLocale && t.status === 1)) {
    throw invalid(
      'WEB_NAVIGATION_ITEM_DEFAULT_TRANSLATION_REQUIRED',
      'An active translation for the navigation default locale is required',
    );
  }

  return { key, sortOrder, status, translations };
};
