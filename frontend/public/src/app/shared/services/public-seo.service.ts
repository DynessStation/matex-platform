import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { environment } from '../../../environments/environment';

export interface PublicSeoAlternate {
  locale: 'id-ID' | 'en-US';
  path: string;
}

export interface PublicSeoDocument {
  locale: 'id-ID' | 'en-US';
  title: string;
  description?: string;
  keywords?: string;
  robots?: string;
  canonicalPath?: string | null;
  canonicalUrl?: string | null;
  alternates?: PublicSeoAlternate[];
  type?: 'website' | 'article' | 'product';
  socialTitle?: string;
  socialDescription?: string;
  image?: string;
  schema?: Record<string, unknown> | Record<string, unknown>[] | null;
}

@Injectable({ providedIn: 'root' })
export class PublicSeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly siteUrl = environment.publicSiteURL.replace(/\/$/, '');
  private readonly siteOrigin = new URL(this.siteUrl).origin;

  apply(config: PublicSeoDocument): string | null {
    this.clear();
    this.document.documentElement.lang = config.locale;

    const title = config.title.trim() || 'MATEX';
    const description = this.toPlainText(config.description || '');
    const socialTitle = config.socialTitle?.trim() || title;
    const socialDescription = this.toPlainText(config.socialDescription || description);
    const canonical =
      config.canonicalPath === null
        ? null
        : this.canonicalUrl(config.canonicalPath || '/', config.canonicalUrl || undefined);

    this.title.setTitle(title);
    this.setName('description', description);
    this.setName('robots', config.robots || 'index, follow');
    if (config.keywords?.trim()) this.setName('keywords', config.keywords.trim());

    if (canonical) this.addLink('canonical', canonical);

    const alternates = this.uniqueAlternates(config.alternates || []);
    for (const alternate of alternates) {
      this.addLink('alternate', this.publicUrl(alternate.path), alternate.locale);
    }
    const defaultAlternate = alternates.find((item) => item.locale === 'id-ID');
    if (defaultAlternate) {
      this.addLink('alternate', this.publicUrl(defaultAlternate.path), 'x-default');
    }

    const ogEntries: Record<string, string> = {
      'og:type': config.type || 'website',
      'og:title': socialTitle,
      'og:description': socialDescription,
      'og:locale': config.locale.replace('-', '_'),
    };
    if (canonical) ogEntries['og:url'] = canonical;
    if (config.image) ogEntries['og:image'] = config.image;
    for (const alternate of alternates.filter((item) => item.locale !== config.locale)) {
      this.meta.addTag({
        property: 'og:locale:alternate',
        content: alternate.locale.replace('-', '_'),
        'data-public-seo': '',
      });
    }
    for (const [property, content] of Object.entries(ogEntries)) {
      this.meta.updateTag({ property, content, 'data-public-seo': '' }, `property="${property}"`);
    }

    this.setName('twitter:card', config.image ? 'summary_large_image' : 'summary');
    this.setName('twitter:title', socialTitle);
    this.setName('twitter:description', socialDescription);
    if (canonical) this.setName('twitter:url', canonical);
    if (config.image) this.setName('twitter:image', config.image);

    if (config.schema) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-public-seo', '');
      script.textContent = JSON.stringify(config.schema);
      this.document.head.appendChild(script);
    }

    return canonical;
  }

  prepare(locale: 'id-ID' | 'en-US' = 'id-ID'): void {
    this.apply({
      locale,
      title: 'MATEX',
      robots: 'noindex, nofollow',
      canonicalPath: null,
    });
  }

  canonicalUrl(path: string, candidate?: string): string {
    const fallback = this.publicUrl(path);
    if (!candidate) return fallback;

    try {
      const url = new URL(candidate, this.siteUrl);
      if (url.origin !== this.siteOrigin || !['http:', 'https:'].includes(url.protocol)) {
        return fallback;
      }
      url.hash = '';
      url.search = '';
      return url.href;
    } catch {
      return fallback;
    }
  }

  publicUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(normalized, `${this.siteUrl}/`);
    url.hash = '';
    url.search = '';
    return url.href;
  }

  toPlainText(value: string): string {
    return value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  clear(): void {
    this.document.head
      .querySelectorAll(
        '[data-public-seo], [data-article-seo], link[data-product-category-canonical], link[data-fixed-page-seo]',
      )
      .forEach((element) => element.remove());

    for (const name of [
      'description',
      'keywords',
      'robots',
      'twitter:card',
      'twitter:url',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]) {
      this.meta.removeTag(`name="${name}"`);
    }
    for (const property of ['type', 'url', 'title', 'description', 'locale', 'image']) {
      this.meta.removeTag(`property="og:${property}"`);
    }
    this.document.head
      .querySelectorAll('meta[property="og:locale:alternate"]')
      .forEach((element) => element.remove());
  }

  private setName(name: string, content: string): void {
    if (!content) return;
    this.meta.updateTag({ name, content, 'data-public-seo': '' }, `name="${name}"`);
  }

  private addLink(rel: string, href: string, hreflang?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-public-seo', '');
    link.rel = rel;
    link.href = href;
    if (hreflang) link.hreflang = hreflang;
    this.document.head.appendChild(link);
  }

  private uniqueAlternates(alternates: PublicSeoAlternate[]): PublicSeoAlternate[] {
    return Array.from(new Map(alternates.map((item) => [item.locale, item])).values());
  }
}
