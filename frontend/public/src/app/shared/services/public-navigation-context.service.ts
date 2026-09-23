import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { catchError, distinctUntilChanged, filter, map, of, startWith, switchMap } from 'rxjs';

import { PublicNavigationService } from './public-navigation.service';

@Injectable({
  providedIn: 'root',
})
export class PublicNavigationContextService {
  private router = inject(Router);
  private navigationService = inject(PublicNavigationService);

  private readonly locale$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.localeFromUrl(this.router.url)),
    distinctUntilChanged(),
  );

  readonly locale = toSignal(this.locale$, {
    initialValue: 'id-ID',
  });

  readonly primaryItems = toSignal(
    this.locale$.pipe(
      switchMap((locale) =>
        this.navigationService.getNavigation('primary', locale).pipe(
          map((response) => response.data.items),
          catchError(() => of([])),
        ),
      ),
    ),
    {
      initialValue: [],
    },
  );

  readonly homePath = computed(() => (this.locale() === 'en-US' ? '/en' : '/'));

  private localeFromUrl(url: string): string {
    const path = url.split('?')[0].split('#')[0];

    return path === '/en' || path.startsWith('/en/') ? 'en-US' : 'id-ID';
  }
}
