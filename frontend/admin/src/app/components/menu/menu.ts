import { CommonModule } from '@angular/common';

import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';

import { Observable, finalize, map, of, switchMap } from 'rxjs';

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
  DeleteWebNavigationItemAction,
  GetWebNavigationDetailAction,
  GetWebNavigationsAction,
  ReorderWebNavigationItemsAction,
} from '../../shared/store/action/web-navigation.action';

import { WebNavigationState } from '../../shared/store/state/web-navigation.state';

import { FormMenu } from './form-menu/form-menu';
import { MenuTree } from './menu-tree/menu-tree';

@Component({
  selector: 'app-menu',

  imports: [
    CommonModule,
    PageWrapper,
    Button,
    HasPermissionDirective,
    FormMenu,
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

  deleteMenuItem(item: IWebNavigationTreeItem): void {
    const navigation = this.store.selectSnapshot(
      WebNavigationState.selectedNavigation,
    );

    if (
      this.editingItem?.id_web_navigation_item === item.id_web_navigation_item
    ) {
      this.editingItem = null;
    }

    if (!navigation) {
      return;
    }

    this.store.dispatch(
      new DeleteWebNavigationItemAction(
        navigation.id_web_navigation,
        item.id_web_navigation_item,
      ),
    );
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

    const nodes = new Map<string, IWebNavigationTreeItem>();

    navigation.items.forEach((item) => {
      nodes.set(item.id_web_navigation_item, {
        ...item,

        title: this.itemTitle(item, navigation.default_locale),

        child: [],

        show: true,
      });
    });

    const rootItems: IWebNavigationTreeItem[] = [];

    nodes.forEach((item) => {
      const parentId = item.id_parent_web_navigation_item;

      const parent = parentId ? nodes.get(parentId) : null;

      if (
        parent &&
        parent.id_web_navigation_item !== item.id_web_navigation_item
      ) {
        parent.child.push(item);
      } else {
        rootItems.push(item);
      }
    });

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

    items.forEach((item) => {
      this.sortTree(item.child);
    });
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
