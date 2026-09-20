import { Injectable, inject } from '@angular/core';

import { Title } from '@angular/platform-browser';

import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { filter, merge } from 'rxjs';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class AppTitleService {
  //==================================================
  //==== INJECT
  //==================================================

  private router = inject(Router);

  private title = inject(Title);

  private translate = inject(TranslateService);

  //==================================================
  //==== CONFIG
  //==================================================

  private readonly appName = 'Matex Admin';

  //==================================================
  //==== INITIALIZE
  //==================================================

  initialize(): void {
    const navigation$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    );

    merge(
      navigation$,

      this.translate.onLangChange,
    ).subscribe(() => {
      this.updateTitle();
    });

    // Initial title.
    this.updateTitle();
  }

  //==================================================
  //==== UPDATE TITLE
  //==================================================

  private updateTitle(): void {
    const titleKey = this.getDeepestTitleKey(
      this.router.routerState.snapshot.root,
    );

    if (!titleKey) {
      this.title.setTitle(this.appName);

      return;
    }

    const translatedTitle = this.translate.instant(titleKey);

    this.title.setTitle(`${translatedTitle} | ${this.appName}`);
  }

  //==================================================
  //==== FIND DEEPEST TITLE KEY
  //==================================================

  private getDeepestTitleKey(route: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = route;

    let titleKey: string | null = null;

    while (current) {
      const currentTitleKey = current.data?.['titleKey'];

      if (typeof currentTitleKey === 'string' && currentTitleKey.trim()) {
        titleKey = currentTitleKey.trim();
      }

      current = current.firstChild ?? null;
    }

    return titleKey;
  }
}
