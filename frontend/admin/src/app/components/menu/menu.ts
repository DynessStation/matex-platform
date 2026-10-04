import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, finalize, map, of, switchMap } from 'rxjs';

import { FixedMenuForm } from './fixed-menu-form/fixed-menu-form';
import { MenuTree } from './menu-tree/menu-tree';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import {
  IWebNavigationDetail,
  IWebNavigationItem,
  IWebNavigationReorderItem,
  IWebNavigationSummary,
  IWebNavigationTreeItem,
} from '../../shared/interface/web-navigation.interface';
import {
  CreateWebNavigationAction,
  GetWebNavigationDetailAction,
  GetWebNavigationsAction,
  ReorderWebNavigationItemsAction,
  UpdateWebNavigationStatusAction,
} from '../../shared/store/action/web-navigation.action';
import { WebNavigationState } from '../../shared/store/state/web-navigation.state';

@Component({
  selector: 'app-menu',

  imports: [
    CommonModule,
    PageWrapper,
    Button,
    HasPermissionDirective,
    TranslateModule,
    FixedMenuForm,
    MenuTree,
  ],

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

  readonly navigationTree$: Observable<IWebNavigationTreeItem[]> =
    this.selectedNavigation$.pipe(
      map((navigation) => this.buildNavigationTree(navigation)),
    );

  editingItem: IWebNavigationItem | null = null;

  loading = true;

  creating = false;

  changingStatus = false;

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

          web_navigation_name: 'Header Website',

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

  editMenuItem(item: IWebNavigationTreeItem): void {
    const navigation = this.store.selectSnapshot(
      WebNavigationState.selectedNavigation,
    );

    this.editingItem =
      navigation?.items.find(
        (candidate) =>
          candidate.id_web_navigation_item === item.id_web_navigation_item,
      ) ?? null;
  }

  finishEditing(): void {
    this.editingItem = null;
  }

  reorderMenuItems(items: IWebNavigationReorderItem[]): void {
    const navigation = this.store.selectSnapshot(
      WebNavigationState.selectedNavigation,
    );

    if (!navigation || !items.length) {
      return;
    }

    this.store.dispatch(
      new ReorderWebNavigationItemsAction(navigation.id_web_navigation, {
        items,
      }),
    );
  }

  private buildNavigationTree(
    navigation: IWebNavigationDetail | null,
  ): IWebNavigationTreeItem[] {
    if (!navigation) {
      return [];
    }

    const rootItems = navigation.items.map((item) => ({
      ...item,

      title: this.itemTitle(item, navigation.default_locale),

      child: [],

      show: true,
    })) satisfies IWebNavigationTreeItem[];

    this.sortTree(rootItems);

    return rootItems;
  }

  private itemTitle(item: IWebNavigationItem, defaultLocale: string): string {
    const defaultTranslation = item.translations.find(
      (translation) => translation.locale === defaultLocale,
    );

    return defaultTranslation?.label ?? item.translations[0]?.label ?? item.key;
  }

  private sortTree(items: IWebNavigationTreeItem[]): void {
    items.sort((first, second) => first.sort_order - second.sort_order);
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

  canActivateNavigation(): boolean {
    const navigation = this.store.selectSnapshot(
      WebNavigationState.selectedNavigation,
    );

    return navigation?.items.some((item) => item.status === 1) ?? false;
  }

  toggleNavigationStatus(navigation: IWebNavigationSummary): void {
    if (this.changingStatus) {
      return;
    }

    if (navigation.status === 0 && !this.canActivateNavigation()) {
      return;
    }

    this.changingStatus = true;

    this.store
      .dispatch(
        new UpdateWebNavigationStatusAction(navigation.id_web_navigation, {
          web_navigation_status: navigation.status === 1 ? 0 : 1,
        }),
      )
      .pipe(
        finalize(() => {
          this.changingStatus = false;
        }),
      )
      .subscribe();
  }
}
