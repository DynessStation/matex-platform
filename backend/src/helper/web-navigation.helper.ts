import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
} from "../config/public-content.config";
import {
  getFixedWebNavigationPath,
  isFixedWebNavigationKey,
} from "../config/web-navigation.config";
import keyhsid from "../hsid";

export type WebNavigationItemLinkType = "internal";

export interface NormalizedNavigationItemTranslation {
  locale: string;
  label: string;
  path: string | null;
  url: string | null;
  status: 0 | 1;
}

export interface NormalizedNavigationItem {
  key: string;
  linkType: WebNavigationItemLinkType;
  targetBlank: 0 | 1;
  icon: string | null;
  badgeText: string | null;
  badgeColor: string | null;
  sortOrder: number;
  status: 0 | 1;
  settingsJson: string | null;
  settings: Record<string, unknown> | null;
  translations: NormalizedNavigationItemTranslation[];
}

export type NormalizeNavigationItemResult =
  | {
      success: true;
      data: NormalizedNavigationItem;
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export const decodeWebNavigationItemId = (value: unknown): number | null => {
  const encodedId = String(value ?? "").trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idWebNavigationItem.decode(encodedId)[0];

  const id = Number(decoded);

  if (!decoded || !Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const normalizeFlag = (value: unknown): 0 | 1 | null => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return 0;
  }

  return null;
};

export const normalizeNavigationItemInput = (
  body: any,
  defaultLocale: string,
): NormalizeNavigationItemResult => {
  const key = String(body?.web_navigation_item_key ?? "")
    .trim()
    .toLowerCase();

  if (!isFixedWebNavigationKey(key)) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_KEY_INVALID",
      message: "Navigation item is not part of the fixed website header",
    };
  }

  const linkType = String(
    body?.web_navigation_item_link_type ?? "",
  ) as WebNavigationItemLinkType;

  if (linkType !== "internal") {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_LINK_TYPE_INVALID",
      message: "Fixed website navigation items must use internal routes",
    };
  }

  for (const field of [
    "id_parent_web_navigation_item",
    "id_cms_page",
    "web_navigation_item_icon",
    "web_navigation_item_badge_text",
    "web_navigation_item_badge_color",
  ]) {
    const value = body?.[field];

    if (value !== null && value !== undefined && value !== "") {
      return {
        success: false,
        code: "WEB_NAVIGATION_ITEM_FIELD_UNSUPPORTED",
        message: `${field} is not used by the fixed website header`,
      };
    }
  }

  const targetBlankInput = normalizeFlag(
    body?.web_navigation_item_target_blank ?? 0,
  );

  if (targetBlankInput === null) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_TARGET_INVALID",
      message: "Invalid target blank value",
    };
  }

  if (targetBlankInput === 1) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_TARGET_INVALID",
      message: "Fixed website navigation items open in the same tab",
    };
  }

  const status = normalizeFlag(body?.web_navigation_item_status ?? 1);

  if (status === null) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_STATUS_INVALID",
      message: "Navigation item status must be 0 or 1",
    };
  }

  const sortOrder = Number(body?.web_navigation_item_sort_order ?? 0);

  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 2147483647) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_SORT_INVALID",
      message: "Invalid navigation item sort order",
    };
  }

  let settings: Record<string, unknown> | null = null;

  const rawSettings = body?.web_navigation_item_settings_json;

  if (rawSettings !== null && rawSettings !== undefined && rawSettings !== "") {
    let parsedSettings: unknown = rawSettings;

    if (typeof rawSettings === "string") {
      try {
        parsedSettings = JSON.parse(rawSettings);
      } catch {
        return {
          success: false,
          code: "WEB_NAVIGATION_ITEM_SETTINGS_INVALID",
          message: "Navigation item settings must contain valid JSON",
        };
      }
    }

    if (
      typeof parsedSettings !== "object" ||
      parsedSettings === null ||
      Array.isArray(parsedSettings)
    ) {
      return {
        success: false,
        code: "WEB_NAVIGATION_ITEM_SETTINGS_INVALID",
        message: "Navigation item settings must be a JSON object",
      };
    }

    settings = parsedSettings as Record<string, unknown>;
  }

  if (!Array.isArray(body?.translations)) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED",
      message: "Navigation item translations are required",
    };
  }

  const locales = new Set<string>();

  const translations: NormalizedNavigationItemTranslation[] = [];

  for (const rawTranslation of body.translations) {
    const locale = String(rawTranslation?.locale ?? "").trim();

    if (!isPublicContentLocale(locale)) {
      return {
        success: false,
        code: "WEB_NAVIGATION_ITEM_LOCALE_UNSUPPORTED",
        message: `Unsupported locale: ${locale}`,
      };
    }

    if (locales.has(locale)) {
      return {
        success: false,
        code: "WEB_NAVIGATION_ITEM_LOCALE_DUPLICATE",
        message: `Duplicate locale: ${locale}`,
      };
    }

    locales.add(locale);

    const label = String(rawTranslation?.label ?? "").trim();

    if (!label || label.length > 255) {
      return {
        success: false,
        code: "WEB_NAVIGATION_ITEM_LABEL_INVALID",
        message: `Invalid label for locale ${locale}`,
      };
    }

    const translationStatus = normalizeFlag(rawTranslation?.status ?? 1);

    if (translationStatus === null) {
      return {
        success: false,
        code: "WEB_NAVIGATION_ITEM_TRANSLATION_STATUS_INVALID",
        message: `Invalid translation status for locale ${locale}`,
      };
    }

    translations.push({
      locale,
      label,
      path: getFixedWebNavigationPath(key, locale),
      url: null,
      status: translationStatus,
    });
  }

  if (
    PUBLIC_CONTENT_LOCALES.some(
      (locale) =>
        !translations.some((translation) => translation.locale === locale),
    )
  ) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED",
      message: "Indonesian and English labels are required",
    };
  }

  const defaultTranslation = translations.find(
    (translation) =>
      translation.locale === defaultLocale && translation.status === 1,
  );

  if (!defaultTranslation) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_DEFAULT_TRANSLATION_REQUIRED",
      message:
        "An active translation for the navigation default locale is required",
    };
  }

  return {
    success: true,
    data: {
      key,
      linkType,
      targetBlank: 0,
      icon: null,
      badgeText: null,
      badgeColor: null,
      sortOrder,
      status,
      settingsJson: settings === null ? null : JSON.stringify(settings),
      settings,
      translations,
    },
  };
};
