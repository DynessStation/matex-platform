import { Component, inject } from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';

import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { catchError, distinctUntilChanged, filter, map, of, startWith, switchMap } from 'rxjs';

import { Language } from '../../../shared/components/header/widgets/language/language';

import { MainMenu } from '../../../shared/components/header/widgets/main-menu/main-menu';

import { MenuService } from '../../../shared/services/menu.service';

import { PublicNavigationService } from '../../../shared/services/public-navigation.service';

@Component({
  selector: 'app-matex-header',

  imports: [Language, MainMenu, RouterLink],

  templateUrl: './matex-header.html',

  styleUrl: './matex-header.scss',
})
export class MatexHeader {
  private router = inject(Router);

  private navigationService = inject(PublicNavigationService);

  readonly menuService = inject(MenuService);

  private readonly locale$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),

    startWith(null),

    map(() => this.localeFromUrl(this.router.url)),

    distinctUntilChanged(),
  );

  readonly navigationItems = toSignal(
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

  readonly homePath = toSignal(
    this.locale$.pipe(map((locale) => (locale === 'en-US' ? '/en' : '/'))),

    {
      initialValue: '/',
    },
  );

  mainMenuOpen(): void {
    this.menuService.mainMenuToggle = true;
  }

  private localeFromUrl(url: string): string {
    const path = url.split('?')[0].split('#')[0];

    return path === '/en' || path.startsWith('/en/') ? 'en-US' : 'id-ID';
  }
}
