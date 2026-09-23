import { CommonModule } from '@angular/common';

import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';

import { Observable, finalize, map, of, switchMap } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

import { Button } from '../../shared/components/ui/button/button';

import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';

import {
  IWebNavigationDetail,
  IWebNavigationSummary,
} from '../../shared/interface/web-navigation.interface';

import {
  CreateWebNavigationAction,
  GetWebNavigationDetailAction,
  GetWebNavigationsAction,
} from '../../shared/store/action/web-navigation.action';

import { WebNavigationState } from '../../shared/store/state/web-navigation.state';

@Component({
  selector: 'app-menu',

  imports: [CommonModule, PageWrapper, Button, HasPermissionDirective],

  templateUrl: './menu.html',

  styleUrl: './menu.scss',
})
export class Menu {
  private store = inject(Store);

  readonly type = input<string>('create');

  readonly primaryNavigation$: Observable<IWebNavigationSummary | null> =
    this.store
      .select(WebNavigationState.navigations)
      .pipe(
        map(
          (navigations) =>
            navigations.find((navigation) => navigation.key === 'primary') ??
            null,
        ),
      );

  readonly selectedNavigation$: Observable<IWebNavigationDetail | null> =
    this.store.select(WebNavigationState.selectedNavigation);

  loading = true;

  creating = false;

  ngOnInit(): void {
    this.loadPrimaryNavigation();
  }

  initializePrimaryNavigation(): void {
    if (this.creating) {
      return;
    }

    this.creating = true;

    this.store
      .dispatch(
        new CreateWebNavigationAction({
          web_navigation_key: 'primary',

          web_navigation_name: 'Primary Navigation',

          web_navigation_location: 'header',

          web_navigation_default_locale: 'id-ID',

          web_navigation_settings_json: {
            theme: 'gadget-store',
          },
        }),
      )
      .pipe(
        switchMap(() => {
          const id = this.store.selectSnapshot(
            WebNavigationState.lastCreatedNavigationId,
          );

          if (!id) {
            return of(null);
          }

          return this.store.dispatch(new GetWebNavigationDetailAction(id));
        }),

        finalize(() => {
          this.creating = false;
        }),
      )
      .subscribe();
  }

  private loadPrimaryNavigation(): void {
    this.loading = true;

    this.store
      .dispatch(new GetWebNavigationsAction())
      .pipe(
        switchMap(() => {
          const primary = this.store
            .selectSnapshot(WebNavigationState.navigations)
            .find((navigation) => navigation.key === 'primary');

          if (!primary) {
            return of(null);
          }

          return this.store.dispatch(
            new GetWebNavigationDetailAction(primary.id_web_navigation),
          );
        }),

        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe();
  }
}
