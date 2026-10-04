import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  RESPONSE_INIT,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { catchError, of, startWith, tap, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Breadcrumb } from '../../shared/components/widgets/breadcrumb/breadcrumb';
import { IPublicWebsitePage } from '../../shared/interface/website-page.interface';
import { PublicPageContextService } from '../../shared/services/public-page-context.service';
import { WebsitePageService } from '../../shared/services/website-page.service';

@Component({
  selector: 'app-website-page',
  imports: [Breadcrumb],
  templateUrl: './website-page.html',
  styleUrl: '../cms-page/cms-page.scss',
})
export class WebsitePage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(WebsitePageService);
  private readonly pageContext = inject(PublicPageContextService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly originalLang = this.document.documentElement.lang;

  readonly page = signal<IPublicWebsitePage | null>(null);
  readonly state = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  readonly locale = signal<'id-ID' | 'en-US'>(this.resolveLocale());

  readonly breadcrumb = computed(() => {
    const page = this.page();
    if (!page) return null;

    return {
      title: page.title,
      items: [{ label: page.title, active: true }],
    };
  });

  constructor() {
    if (this.response) {
      const headers = new Headers(this.response.headers);
      headers.set('Cache-Control', 'no-store');
      this.response.headers = headers;
    }

    this.clearSeo();
    this.pageContext.clearPage();
    this.title.setTitle('MATEX');
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    this.service
      .getPage(this.locale(), this.resolvePath())
      .pipe(
        timeout(15000),
        tap((page) => {
          this.state.set('ready');
          this.pageContext.setPage(page);
          this.applySeo(page);
        }),
        catchError((error: HttpErrorResponse) => {
          this.state.set(error.status === 404 ? 'missing' : 'error');
          this.title.setTitle(
            `${this.message('Halaman tidak tersedia', 'Page unavailable')} | MATEX`,
          );

          if (this.response) {
            this.response.status = error.status === 404 ? 404 : 503;
          }

          return of(null);
        }),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.page.set(page));

    this.destroyRef.onDestroy(() => {
      this.pageContext.clearPage();
      this.clearSeo();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  message(indonesian: string, english: string): string {
    return this.locale() === 'en-US' ? english : indonesian;
  }

  private resolveLocale(): 'id-ID' | 'en-US' {
    return this.route.snapshot.data['locale'] === 'en-US' ? 'en-US' : 'id-ID';
  }

  private resolvePath(): string {
    const path = this.route.snapshot.data['path'];
    return typeof path === 'string' ? path : '';
  }

  private applySeo(page: IPublicWebsitePage): void {
    this.clearSeo();
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

    this.addSeoLink('canonical', canonical);
    for (const translation of page.translations) {
      this.addSeoLink(
        'alternate',
        `${site}${this.pageContext.pathFor(translation.locale, translation.path, page.key)}`,
        translation.locale,
      );
    }

    const socialImage = page.media.find((item) => item.slot === 'og');
    for (const [property, content] of Object.entries({
      'og:type': 'website',
      'og:url': canonical,
      'og:title': page.seo.social_title,
      'og:description': page.seo.social_description,
      'og:locale': page.locale.replace('-', '_'),
      'og:image': socialImage?.asset_url || '',
    })) {
      this.meta.updateTag({ property, content });
    }
  }

  private addSeoLink(rel: string, href: string, locale?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-website-page-seo', '');
    link.rel = rel;
    link.href = href;
    if (locale) link.hreflang = locale;
    this.document.head.appendChild(link);
  }

  private clearSeo(): void {
    this.document.head
      .querySelectorAll('link[data-website-page-seo]')
      .forEach((link) => link.remove());
    for (const name of ['description', 'keywords', 'robots']) {
      this.meta.removeTag(`name="${name}"`);
    }
    for (const property of ['type', 'url', 'title', 'description', 'locale', 'image']) {
      this.meta.removeTag(`property="og:${property}"`);
    }
  }
}
