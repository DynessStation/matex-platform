import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { PublicPageContextService } from './public-page-context.service';
import { environment } from '../../../environments/environment';
import { IPublicWebsitePage } from '../interface/website-page.interface';

@Injectable({ providedIn: 'root' })
export class WebsitePageSeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly pageContext = inject(PublicPageContextService);

  prepare(): void {
    this.clear();
    this.title.setTitle('MATEX');
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  apply(page: IPublicWebsitePage): void {
    this.clear();
    this.pageContext.setPage(page);
    this.document.documentElement.lang = page.locale;
    this.title.setTitle(page.seo.title);

    for (const name of ['description', 'keywords', 'robots'] as const) {
      this.meta.updateTag({ name, content: page.seo[name] });
    }

    const site = environment.cmsSiteURL.replace(/\/$/, '');
    const fallbackUrl = `${site}${this.pageContext.pathFor(page.locale, page.path, page.key)}`;
    let canonical = fallbackUrl;

    try {
      const candidate = new URL(page.seo.canonical_url || fallbackUrl);
      if (candidate.protocol === 'http:' || candidate.protocol === 'https:') {
        canonical = candidate.href;
      }
    } catch {
      /* Invalid custom canonical falls back to the fixed public route. */
    }

    this.addLink('canonical', canonical);
    for (const translation of page.translations) {
      this.addLink(
        'alternate',
        `${site}${this.pageContext.pathFor(translation.locale, translation.path, page.key)}`,
        translation.locale,
      );
    }

    const image = page.media.find((item) => item.slot === 'og');
    for (const [property, content] of Object.entries({
      'og:type': 'website',
      'og:url': canonical,
      'og:title': page.seo.social_title,
      'og:description': page.seo.social_description,
      'og:locale': page.locale.replace('-', '_'),
      'og:image': image?.asset_url || '',
    })) {
      this.meta.updateTag({ property, content });
    }
  }

  clear(): void {
    this.pageContext.clearPage();
    this.document.head
      .querySelectorAll('link[data-fixed-page-seo]')
      .forEach((link) => link.remove());

    for (const name of ['description', 'keywords', 'robots']) {
      this.meta.removeTag(`name="${name}"`);
    }
    for (const property of ['type', 'url', 'title', 'description', 'locale', 'image']) {
      this.meta.removeTag(`property="og:${property}"`);
    }
  }

  private addLink(rel: string, href: string, locale?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-fixed-page-seo', '');
    link.rel = rel;
    link.href = href;
    if (locale) link.hreflang = locale;
    this.document.head.appendChild(link);
  }
}
