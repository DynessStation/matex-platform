import { PublicContentLocale } from "./public-content.config";

export const FIXED_WEB_NAVIGATION_ROUTES = {
  home: { "id-ID": "/", "en-US": "/en" },
  about: { "id-ID": "/tentang-matex", "en-US": "/en/about-matex" },
  categories: { "id-ID": "/katalog", "en-US": "/en/catalog" },
  products: { "id-ID": "/katalog", "en-US": "/en/catalog" },
  articles: { "id-ID": "/artikel", "en-US": "/en/articles" },
  contact: { "id-ID": "/kontak", "en-US": "/en/contact-us" },
} as const;

export type FixedWebNavigationKey = keyof typeof FIXED_WEB_NAVIGATION_ROUTES;

export const isFixedWebNavigationKey = (
  value: unknown,
): value is FixedWebNavigationKey =>
  typeof value === "string" && value in FIXED_WEB_NAVIGATION_ROUTES;

export const getFixedWebNavigationPath = (
  key: FixedWebNavigationKey,
  locale: PublicContentLocale,
): string => FIXED_WEB_NAVIGATION_ROUTES[key][locale];
