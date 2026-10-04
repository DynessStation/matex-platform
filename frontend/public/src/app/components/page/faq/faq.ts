import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, DOCUMENT, inject, RESPONSE_INIT, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, map, of, tap, timeout } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { IPublicWebsitePage } from '../../../shared/interface/website-page.interface';
import { PublicContentService } from '../../../shared/services/public-content.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { WebsitePageSeoService } from '../../../shared/services/website-page-seo.service';
import { WebsitePageService } from '../../../shared/services/website-page.service';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-faq',
  imports: [AsyncPipe, NgbAccordionModule, NoData, Breadcrumb, HomeNewsletter, TranslateModule],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
  private content = inject(PublicContentService);
  private navigation = inject(PublicNavigationContextService);
  private websitePages = inject(WebsitePageService);
  private websiteSeo = inject(WebsitePageSeoService);
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private response = inject(RESPONSE_INIT, { optional: true });
  private originalLang = this.document.documentElement.lang;
  readonly locale = this.navigation.locale();
  readonly page = signal<IPublicWebsitePage | null>(null);
  readonly pageState = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  readonly faq$ = this.content.getFaq(this.locale).pipe(
    map((response) => response.data?.items ?? []),
    catchError(() => of([])),
  );
  readonly breadcrumb: breadcrumb = {
    title: this.locale === 'en-US' ? 'Frequently Asked Questions' : 'Pertanyaan Umum',
    items: [{ label: this.locale === 'en-US' ? 'FAQ' : 'Pertanyaan Umum', active: true }],
  };

  constructor() {
    this.websiteSeo.prepare();

    if (this.response) {
      const headers = new Headers(this.response.headers);
      headers.set('Cache-Control', 'no-store');
      this.response.headers = headers;
    }

    this.websitePages
      .getPage(this.locale, 'faq')
      .pipe(
        timeout(15000),
        tap((page) => {
          this.pageState.set('ready');
          this.page.set(page);
          this.breadcrumb.title = page.title;
          this.breadcrumb.items = [{ label: page.title, active: true }];
          this.websiteSeo.apply(page);
        }),
        catchError((error: HttpErrorResponse) => {
          this.pageState.set(error.status === 404 ? 'missing' : 'error');
          if (this.response) this.response.status = error.status === 404 ? 404 : 503;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.destroyRef.onDestroy(() => {
      this.websiteSeo.clear();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  pageMessage(indonesian: string, english: string): string {
    return this.locale === 'en-US' ? english : indonesian;
  }
}
