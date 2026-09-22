import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  RESPONSE_INIT,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, startWith, switchMap, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IPublicCmsPage } from '../../shared/interface/cms-page.interface';
import { CmsPageService } from '../../shared/services/cms-page.service';
import { Breadcrumb } from '../../shared/components/widgets/breadcrumb/breadcrumb';
import { PublicPageContextService } from '../../shared/services/public-page-context.service';

@Component({
  selector: 'app-cms-page',
  imports: [Breadcrumb],
  templateUrl: './cms-page.html',
  styleUrl: './cms-page.scss',
})
export class CmsPage {
  private publicPageContext = inject(PublicPageContextService);
  private route = inject(ActivatedRoute);
  private service = inject(CmsPageService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private response = inject(RESPONSE_INIT, { optional: true });
  private destroyRef = inject(DestroyRef);
  private originalLang = this.document.documentElement.lang;
  readonly page = signal<IPublicCmsPage | null>(null);
  readonly state = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  readonly locale = signal('id-ID');

  readonly breadcrumb = computed(() => {
    const page = this.page();

    if (!page) return null;

    return {
      title: page.title,
      items: [
        {
          label: page.title,
          active: true,
        },
      ],
    };
  });

  private resolveLocale(routeLocale: string | null): 'id-ID' | 'en-US' {
    const configuredLocale = this.route.snapshot.data['locale'];

    if (configuredLocale === 'en-US' || routeLocale === 'en-US') {
      return 'en-US';
    }

    return 'id-ID';
  }

  constructor() {
    if (this.response) {
      const headers = new Headers(this.response.headers);
      headers.set('Cache-Control', 'no-store');
      this.response.headers = headers;
    }
    this.route.paramMap
      .pipe(
        tap((params) => {
          const locale = this.resolveLocale(params.get('locale'));

          this.locale.set(locale);

          this.publicPageContext.clearPage();

          this.clearSeo();
          this.title.setTitle('MATEX');

          this.meta.updateTag({
            name: 'robots',
            content: 'noindex, nofollow',
          });
        }),
        switchMap((params) =>
          this.service
            .getPage(this.resolveLocale(params.get('locale')), params.get('slug') || '')
            .pipe(
              timeout(15000),
              tap((page) => {
                this.state.set('ready');

                this.publicPageContext.setPage(page);

                this.applySeo(page);
              }),
              catchError((error: HttpErrorResponse) => {
                this.publicPageContext.clearPage();

                this.state.set(error.status === 404 ? 'missing' : 'error');

                this.title.setTitle(
                  this.message('Halaman tidak tersedia', 'Page unavailable') + ' | MATEX',
                );

                if (this.response) {
                  this.response.status = error.status === 404 ? 404 : 503;
                }

                return of(null);
              }),
              startWith(null),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.page.set(page));
    this.destroyRef.onDestroy(() => {
      this.publicPageContext.clearPage();
      this.clearSeo();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  message(id: string, en: string): string {
    return this.locale() === 'en-US' ? en : id;
  }

  private pageUrl(locale: string, slug: string, key?: string): string {
    const site = environment.cmsSiteURL.replace(/\/$/, '');

    return `${site}${this.publicPageContext.pathFor(locale, slug, key)}`;
  }

  private applySeo(page: IPublicCmsPage): void {
    this.document.documentElement.lang = page.locale;
    this.title.setTitle(page.seo.title);
    for (const name of ['description', 'keywords', 'robots'] as const) {
      this.meta.updateTag({ name, content: page.seo[name] });
    }
    const fallbackUrl = this.pageUrl(page.locale, page.slug, page.key);
    let canonical = fallbackUrl;
    try {
      const url = new URL(page.seo.canonical_url || fallbackUrl);
      if (['http:', 'https:'].includes(url.protocol)) canonical = url.href;
    } catch {
      /* Use the current public URL for an invalid canonical. */
    }
    this.addLink('canonical', canonical);
    for (const translation of page.translations) {
      this.addLink(
        'alternate',
        this.pageUrl(translation.locale, translation.slug, page.key),
        translation.locale,
      );
    }
    const image =
      page.attachments.find((item) => item.role === 'og') ||
      page.attachments.find((item) => item.role === 'hero');
    for (const [property, content] of Object.entries({
      'og:type': 'website',
      'og:url': canonical,
      'og:title': page.seo.og_title,
      'og:description': page.seo.og_description,
      'og:locale': page.locale.replace('-', '_'),
      'og:image': image?.asset_url || '',
    }))
      this.meta.updateTag({ property, content });
  }

  private addLink(rel: string, href: string, locale?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-cms-seo', '');
    link.rel = rel;
    link.href = href;
    if (locale) link.hreflang = locale;
    this.document.head.appendChild(link);
  }

  private clearSeo(): void {
    this.state.set('loading');
    // Also remove links rendered by SSR before hydration; JS references do not survive it.
    this.document.head.querySelectorAll('link[data-cms-seo]').forEach((link) => link.remove());
    for (const name of ['description', 'keywords', 'robots']) this.meta.removeTag(`name="${name}"`);
    for (const property of ['type', 'url', 'title', 'description', 'locale', 'image']) {
      this.meta.removeTag(`property="og:${property}"`);
    }
  }
}
