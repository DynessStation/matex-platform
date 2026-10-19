// Navigation metadata: key and field validation, settings JSON parsing.
import { isPublicContentLocale } from '../../../config/public-content.config';

export type NavigationMetadataResult =
  | {
      success: true;
      name: string;
      location: string;
      defaultLocale: string;
      settingsJson: string | null;
      settings: Record<string, unknown> | null;
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export const normalizeNavigationKey = (value: unknown): string | null => {
  const key = String(value ?? '')
    .trim()
    .toLowerCase();

  if (!key || key.length > 100 || !/^[a-z0-9][a-z0-9_-]*$/.test(key)) {
    return null;
  }

  return key;
};

export const normalizeNavigationMetadata = (body: any): NavigationMetadataResult => {
  const name = String(body?.web_navigation_name ?? '').trim();

  if (!name || name.length > 255) {
    return {
      success: false,
      code: 'WEB_NAVIGATION_NAME_INVALID',
      message: 'Web navigation name is required and must not exceed 255 characters',
    };
  }

  const location = String(body?.web_navigation_location ?? '')
    .trim()
    .toLowerCase();

  if (!location || location.length > 50 || !/^[a-z0-9][a-z0-9_-]*$/.test(location)) {
    return {
      success: false,
      code: 'WEB_NAVIGATION_LOCATION_INVALID',
      message: 'Invalid web navigation location',
    };
  }

  const defaultLocale = String(body?.web_navigation_default_locale ?? '').trim();

  if (!isPublicContentLocale(defaultLocale)) {
    return {
      success: false,
      code: 'WEB_NAVIGATION_LOCALE_UNSUPPORTED',
      message: 'Unsupported default locale',
    };
  }

  const rawSettings = body?.web_navigation_settings_json ?? null;

  if (rawSettings === null || rawSettings === undefined || rawSettings === '') {
    return {
      success: true,
      name,
      location,
      defaultLocale,
      settingsJson: null,
      settings: null,
    };
  }

  let settings: unknown = rawSettings;

  if (typeof rawSettings === 'string') {
    try {
      settings = JSON.parse(rawSettings);
    } catch {
      return {
        success: false,
        code: 'WEB_NAVIGATION_SETTINGS_INVALID',
        message: 'Web navigation settings must contain valid JSON',
      };
    }
  }

  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    return {
      success: false,
      code: 'WEB_NAVIGATION_SETTINGS_INVALID',
      message: 'Web navigation settings must be a JSON object',
    };
  }

  return {
    success: true,
    name,
    location,
    defaultLocale,
    settingsJson: JSON.stringify(settings),
    settings: settings as Record<string, unknown>,
  };
};
