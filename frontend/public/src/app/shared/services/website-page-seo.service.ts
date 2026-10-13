import { Injectable, inject } from '@angular/core';

import { PublicPageContextService } from './public-page-context.service';
import { PublicSeoService } from './public-seo.service';
import { IPublicWebsitePage } from '../interface/website-page.interface';

@Injectable({ providedIn: 'root' })
export class WebsitePageSeoService {
  private readonly pageContext = inject(PublicPageContextService);
  private readonly seo = inject(PublicSeoService);

  prepare(): void {
    this.pageContext.clearPage();
    this.seo.prepare();
  }

  apply(page: IPublicWebsitePage): void {
    this.pageContext.setPage(page);
    const image = page.media.find((item) => item.slot === 'og');
    const path = this.pageContext.pathFor(page.locale, page.path, page.key);
    const canonical = this.seo.canonicalUrl(path, page.seo.canonical_url || undefined);

    this.seo.apply({
      locale: page.locale,
      title: page.seo.title,
      description: page.seo.description,
      keywords: page.seo.keywords,
      robots: page.seo.robots,
      canonicalPath: path,
      canonicalUrl: canonical,
      alternates: page.translations.map((translation) => ({
        locale: translation.locale,
        path: this.pageContext.pathFor(translation.locale, translation.path, page.key),
      })),
      socialTitle: page.seo.social_title,
      socialDescription: page.seo.social_description,
      image: image?.asset_url || undefined,
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: page.title,
          description: page.seo.description,
          url: canonical,
          inLanguage: page.locale,
          isPartOf: {
            '@type': 'WebSite',
            name: 'MATEX',
            url: this.seo.publicUrl('/'),
          },
        },
        ...(page.key === 'home'
          ? [
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Matex Indo Abadi',
                url: this.seo.publicUrl('/'),
              },
            ]
          : []),
      ],
    });
  }

  clear(): void {
    this.pageContext.clearPage();
    this.seo.clear();
  }
}
