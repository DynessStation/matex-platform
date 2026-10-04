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
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { catchError, of, startWith, tap, timeout } from 'rxjs';

import { Breadcrumb } from '../../shared/components/widgets/breadcrumb/breadcrumb';
import { IPublicWebsitePage } from '../../shared/interface/website-page.interface';
import { WebsitePageSeoService } from '../../shared/services/website-page-seo.service';
import { WebsitePageService } from '../../shared/services/website-page.service';

@Component({
  selector: 'app-website-page',
  imports: [Breadcrumb],
  templateUrl: './website-page.html',
  styleUrl: './website-page.scss',
})
export class WebsitePage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(WebsitePageService);
  private readonly websiteSeo = inject(WebsitePageSeoService);
  private readonly title = inject(Title);
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

    this.websiteSeo.prepare();

    this.service
      .getPage(this.locale(), this.resolvePath())
      .pipe(
        timeout(15000),
        tap((page) => {
          this.state.set('ready');
          this.websiteSeo.apply(page);
        }),
        catchError((error: unknown) => {
          const missing = error instanceof HttpErrorResponse && error.status === 404;
          this.state.set(missing ? 'missing' : 'error');
          this.title.setTitle(
            `${this.message('Halaman tidak tersedia', 'Page unavailable')} | MATEX`,
          );

          if (this.response) {
            this.response.status = missing ? 404 : 503;
          }

          return of(null);
        }),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.page.set(page));

    this.destroyRef.onDestroy(() => {
      this.websiteSeo.clear();
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
}
