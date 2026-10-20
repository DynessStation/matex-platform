import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, DOCUMENT, inject, RESPONSE_INIT, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { catchError, finalize, map, of, startWith, switchMap, tap } from 'rxjs';

import { Gadget } from './gadget/gadget';
import { LayoutService } from '../../shared/services/layout.service';
import { ThemeOptionService } from '../../shared/services/theme-option.service';
import { WebsitePageSeoService } from '../../shared/services/website-page-seo.service';
import { GetHomePage } from '../../shared/store/action/theme.action';
import { ThemeState } from '../../shared/store/state/theme.state';

const HOME_THEME = 'gadget-store';

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, Gadget],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private websiteSeo = inject(WebsitePageSeoService);
  private title = inject(Title);
  private response = inject(RESPONSE_INIT, { optional: true });
  private originalLang = this.document.documentElement.lang;
  readonly state = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  readonly locale: 'id-ID' | 'en-US' =
    this.route.snapshot.routeConfig?.path === 'en' ? 'en-US' : 'id-ID';

  // The MATEX home page: the gadget-store layout filled with the published home page content.
  // The other Kartify demo home themes (selectable with ?theme=) were removed in 6B (FE-011).
  readonly view$ = of(HOME_THEME).pipe(
    tap(() => {
      this.state.set('loading');
      this.themeOptionService.preloader.set(true);
    }),
    switchMap((theme) =>
      this.store.dispatch(new GetHomePage(theme, this.locale)).pipe(
        map(() => ({
          theme,
          homePage: this.store.selectSnapshot(ThemeState.homePage) as any,
        })),
        tap(({ homePage }) => {
          if (homePage?.website_page) {
            this.websiteSeo.apply(homePage.website_page);
          }
          this.state.set('ready');
        }),
        catchError((error: unknown) => {
          const missing = error instanceof HttpErrorResponse && error.status === 404;
          this.state.set(missing ? 'missing' : 'error');
          this.websiteSeo.prepare();
          this.title.setTitle(
            `${this.message('Halaman tidak tersedia', 'Page unavailable')} | MATEX`,
          );

          if (this.response) {
            this.response.status = missing ? 404 : 503;
          }

          return of({ theme, homePage: null });
        }),
        startWith({ theme, homePage: null }),
        finalize(() => this.themeOptionService.preloader.set(false)),
      ),
    ),
  );

  constructor(
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
  ) {
    this.destroyRef.onDestroy(() => {
      this.websiteSeo.clear();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  message(indonesian: string, english: string): string {
    return this.locale === 'en-US' ? english : indonesian;
  }
}
