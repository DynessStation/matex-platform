import { Injectable, signal } from '@angular/core';

export interface PublicPageTranslation {
  locale: string;
  path: string;
}

interface PublicPageSource {
  key: string;
  locale: string;
  path?: string;
  slug?: string;
  translations: Array<{
    locale: string;
    path?: string;
    slug?: string;
  }>;
}

interface PublicPageContext {
  key: string;
  locale: string;
  path: string;
  translations: PublicPageTranslation[];
}

@Injectable({
  providedIn: 'root',
})
export class PublicPageContextService {
  private readonly activeState = signal(false);
  private readonly pageState = signal<PublicPageContext | null>(null);

  readonly active = this.activeState.asReadonly();
  readonly page = this.pageState.asReadonly();

  activate(): void {
    this.activeState.set(true);
  }

  deactivate(): void {
    this.activeState.set(false);
    this.pageState.set(null);
  }

  clearPage(): void {
    this.pageState.set(null);
  }

  setPage(page: PublicPageSource): void {
    const currentPath = page.path ?? page.slug ?? '';
    const translations = page.translations.map((item) => ({
      locale: item.locale,
      path: item.path ?? item.slug ?? '',
    }));

    // Jaga-jaga kalau API suatu saat tidak mengembalikan
    // translation untuk locale yang sedang aktif.
    if (!translations.some((item) => item.locale === page.locale)) {
      translations.unshift({
        locale: page.locale,
        path: currentPath,
      });
    }

    this.pageState.set({
      key: page.key,
      locale: page.locale,
      path: currentPath,
      translations,
    });
  }

  pathFor(locale: string, path: string, key?: string): string {
    if (key === 'home') {
      return locale === 'en-US' ? '/en' : '/';
    }

    const fixedRoutes: Record<string, { id: string; en: string }> = {
      about: { id: '/tentang-matex', en: '/en/about-matex' },
      terms: { id: '/syarat-ketentuan', en: '/en/terms-and-conditions' },
      career: { id: '/karir', en: '/en/careers' },
    };

    if (key && fixedRoutes[key]) {
      return locale === 'en-US' ? fixedRoutes[key].en : fixedRoutes[key].id;
    }

    const encodedPath = encodeURIComponent(path);

    if (locale === 'en-US') {
      return `/en/${encodedPath}`;
    }

    return `/${encodedPath}`;
  }

  routeFor(translation: PublicPageTranslation): string {
    return this.pathFor(translation.locale, translation.path, this.pageState()?.key);
  }
}
