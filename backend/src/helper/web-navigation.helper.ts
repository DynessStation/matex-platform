import { isCmsPageLocale } from "../config/cms-page.config";
import keyhsid from "../hsid";

export type WebNavigationItemLinkType =
  | "cms_page"
  | "internal"
  | "external"
  | "label";

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

export const decodeCmsPageId = (value: unknown): number | null => {
  const encodedId = String(value ?? "").trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idCmsPage.decode(encodedId)[0];

  const id = Number(decoded);

  if (!decoded || !Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const nullableString = (
  value: unknown,
  maximumLength: number,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  return clean.slice(0, maximumLength);
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

const normalizeInternalPath = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const path = value.trim();

  if (
    !path ||
    path.length > 500 ||
    !path.startsWith("/") ||
    path.startsWith("//")
  ) {
    return null;
  }

  return path;
};

const normalizeExternalUrl = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  if (!clean || clean.length > 1000) {
    return null;
  }

  try {
    const url = new URL(clean);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};

export const normalizeNavigationItemInput = (
  body: any,
  defaultLocale: string,
): NormalizeNavigationItemResult => {
  const key = String(body?.web_navigation_item_key ?? "")
    .trim()
    .toLowerCase();

  if (!key || key.length > 100 || !/^[a-z0-9][a-z0-9_-]*$/.test(key)) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_KEY_INVALID",
      message: "Invalid web navigation item key",
    };
  }

  const linkType = String(
    body?.web_navigation_item_link_type ?? "",
  ) as WebNavigationItemLinkType;

  if (!["cms_page", "internal", "external", "label"].includes(linkType)) {
    return {
      success: false,
      code: "WEB_NAVIGATION_ITEM_LINK_TYPE_INVALID",
      message: "Invalid navigation item link type",
    };
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

    if (!isCmsPageLocale(locale)) {
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

    let path: string | null = null;
    let url: string | null = null;

    if (linkType === "internal") {
      path = normalizeInternalPath(rawTranslation?.path);

      if (translationStatus === 1 && !path) {
        return {
          success: false,
          code: "WEB_NAVIGATION_ITEM_PATH_INVALID",
          message: `A valid internal path is required for locale ${locale}`,
        };
      }
    }

    if (linkType === "external") {
      url = normalizeExternalUrl(rawTranslation?.url);

      if (translationStatus === 1 && !url) {
        return {
          success: false,
          code: "WEB_NAVIGATION_ITEM_URL_INVALID",
          message: `A valid external URL is required for locale ${locale}`,
        };
      }
    }

    translations.push({
      locale,
      label,
      path,
      url,
      status: translationStatus,
    });
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
      targetBlank: linkType === "external" ? targetBlankInput : 0,
      icon: nullableString(body?.web_navigation_item_icon, 100),
      badgeText: nullableString(body?.web_navigation_item_badge_text, 100),
      badgeColor: nullableString(body?.web_navigation_item_badge_color, 50),
      sortOrder,
      status,
      settingsJson: settings === null ? null : JSON.stringify(settings),
      settings,
      translations,
    },
  };
};
