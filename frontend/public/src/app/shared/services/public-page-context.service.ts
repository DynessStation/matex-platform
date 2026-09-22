import { Injectable, signal } from '@angular/core';

import { IPublicCmsPage } from '../interface/cms-page.interface';

export type PublicPageTranslation = IPublicCmsPage['translations'][number];

interface PublicPageContext {
  key: string;
  locale: string;
  slug: string;
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

  setPage(page: IPublicCmsPage): void {
    const translations = [...page.translations];

    // Jaga-jaga kalau API suatu saat tidak mengembalikan
    // translation untuk locale yang sedang aktif.
    if (!translations.some((item) => item.locale === page.locale)) {
      translations.unshift({
        locale: page.locale,
        slug: page.slug,
      });
    }

    this.pageState.set({
      key: page.key,
      locale: page.locale,
      slug: page.slug,
      translations,
    });
  }

  pathFor(locale: string, slug: string, key?: string): string {
    if (key === 'home') {
      return locale === 'en-US' ? '/en' : '/';
    }

    const encodedSlug = encodeURIComponent(slug);

    if (locale === 'en-US') {
      return `/en/${encodedSlug}`;
    }

    return `/${encodedSlug}`;
  }

  routeFor(translation: PublicPageTranslation): string {
    return this.pathFor(translation.locale, translation.slug, this.pageState()?.key);
  }
}
