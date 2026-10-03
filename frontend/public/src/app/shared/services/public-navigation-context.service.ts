import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import { PublicNavigationService } from './public-navigation.service';
import { IPublicNavigation } from '../interface/public-navigation.interface';

@Injectable({
  providedIn: 'root',
})
export class PublicNavigationContextService {
  private router = inject(Router);
  private navigationService = inject(PublicNavigationService);

  readonly locale$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.localeFromUrl(this.router.url)),
    distinctUntilChanged(),
  );

  readonly locale = toSignal(this.locale$, {
    initialValue: 'id-ID',
  });

  readonly primaryNavigation$ = this.locale$.pipe(
    switchMap((locale) =>
      this.navigationService.getNavigation('primary', locale).pipe(
        map((response) => response.data),
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 404
            ? of<IPublicNavigation>({
                key: 'primary',
                location: 'header',
                locale,
                items: [],
              })
            : of(null),
        ),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly primaryNavigation = toSignal(this.primaryNavigation$, {
    initialValue: undefined,
  });

  readonly primaryItems = computed(() => this.primaryNavigation()?.items ?? []);

  readonly homePath = computed(() => (this.locale() === 'en-US' ? '/en' : '/'));

  private localeFromUrl(url: string): string {
    const path = url.split('?')[0].split('#')[0];

    return path === '/en' || path.startsWith('/en/') ? 'en-US' : 'id-ID';
  }
}
