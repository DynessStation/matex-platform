import { CommonModule, isPlatformBrowser } from '@angular/common';

import { Component, PLATFORM_ID, inject, input } from '@angular/core';

import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { combineLatest, Observable } from 'rxjs';

import { IValues } from '../../interface/setting.interface';

import { ISidebar, ISidebarModel } from '../../interface/sidebar.interface';

import { NavService } from '../../services/nav.service';

import { GetSidebarAction } from '../../store/action/sidebar.action';

import { AuthState } from '../../store/state/auth.state';

import { SettingState } from '../../store/state/setting.state';

import { SidebarState } from '../../store/state/sidebar.state';

import { filterSidebarByPermission } from '../../utils/sidebar-permission.util';

import { Search } from '../header/widgets/search/search';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-sidebar',

  imports: [CommonModule, RouterModule, TranslateModule, Search],

  templateUrl: './sidebar.html',

  styleUrl: './sidebar.scss',
})
export class Sidebar {
  //==================================================
  //==== INJECT
  //==================================================

  navServices = inject(NavService);

  private store = inject(Store);

  private platformId = inject(PLATFORM_ID);

  private translate = inject(TranslateService);

  //==================================================
  //==== INPUT
  //==================================================

  readonly class = input<string>();

  //==================================================
  //==== STATE
  //==================================================

  setting$: Observable<IValues> = this.store.select(
    SettingState.setting,
  ) as Observable<IValues>;

  menu$: Observable<ISidebarModel> = this.store.select(SidebarState.menu);

  permissions$: Observable<string[]> = this.store.select(AuthState.permissions);

  isAllAccess$: Observable<boolean> = this.store.select(AuthState.isAllAccess);

  //==================================================
  //==== DATA
  //==================================================

  public menuItems: ISidebar[] = [];

  public originalMenu: ISidebar[] = [];

  public filteredMenu: ISidebar[] = [];

  public showEmptyMessage = false;

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    //==================================================
    //==== LOAD MENU
    //==================================================

    this.store.dispatch(new GetSidebarAction());

    //==================================================
    //==== AUTHORIZED MENU
    //==================================================

    combineLatest([this.menu$, this.permissions$, this.isAllAccess$]).subscribe(
      ([menu, permissions, isAllAccess]) => {
        this.originalMenu = filterSidebarByPermission(
          menu?.data ?? [],
          permissions ?? [],
          isAllAccess,
        );

        this.filteredMenu = this.cloneMenu(this.originalMenu);

        this.menuItems = this.filteredMenu;
      },
    );
  }

  //==================================================
  //==== CLONE MENU
  //==================================================

  private cloneMenu(menus: ISidebar[]): ISidebar[] {
    return menus.map((menu) => ({
      ...menu,

      children: menu.children ? this.cloneMenu(menu.children) : undefined,
    }));
  }

  //==================================================
  //==== FILTER MENU
  //==================================================

  filterMenu(searchText: string) {
    if (!searchText) {
      this.filteredMenu = this.cloneMenu(this.originalMenu);

      this.showEmptyMessage = false;

      return;
    }

    const text = searchText.toLowerCase().trim();

    this.filteredMenu = this.filterRecursive(this.originalMenu, text);

    this.showEmptyMessage = this.filteredMenu.length === 0;
  }

  //==================================================
  //==== FILTER RECURSIVE
  //==================================================

  private filterRecursive(menus: ISidebar[], text: string): ISidebar[] {
    return menus
      .map<ISidebar | null>((menu) => {
        const title = menu.title ?? '';

        const translatedTitle = String(this.translate.instant(title));

        const matched =
          title.toLowerCase().includes(text) ||
          translatedTitle.toLowerCase().includes(text);

        const children = menu.children
          ? this.filterRecursive(menu.children, text)
          : [];

        //==================================================
        //==== MATCHED
        //==================================================

        if (matched || children.length) {
          return {
            ...menu,

            active: true,

            children: menu.children ? children : undefined,
          };
        }

        return null;
      })
      .filter((menu): menu is ISidebar => menu !== null);
  }

  //==================================================
  //==== SIDEBAR TOGGLE
  //==================================================

  sidebarToggle() {
    this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
  }

  //==================================================
  //==== ITEM SELECTED
  //==================================================

  onItemSelected(item: ISidebar, onRoute: boolean = false) {
    this.menuItems.forEach((menu) => {
      this.deActiveAllMenu(menu, item);
    });

    if (!onRoute) {
      item.active = !item.active;
    }
  }

  //==================================================
  //==== ACTIVE MENU RECURSIVE
  //==================================================

  activeMenuRecursive(menu: ISidebar, url: string, item?: ISidebar) {
    const normalizedUrl = url.charAt(0) !== '/' ? `/${url}` : url;

    if (menu?.path && menu.path === normalizedUrl) {
      if (item) {
        item.active = true;

        this.onItemSelected(item, true);
      }

      menu.active = true;
    }

    if (menu?.children?.length) {
      menu.children.forEach((child) => {
        this.activeMenuRecursive(child, normalizedUrl, menu);
      });
    }
  }

  //==================================================
  //==== DEACTIVATE MENU
  //==================================================

  deActiveAllMenu(menu: ISidebar, item: ISidebar) {
    if (menu && menu.active && menu.id !== item.id) {
      menu.active = false;
    }

    if (menu?.children?.length) {
      menu.children.forEach((child) => {
        this.deActiveAllMenu(child, item);
      });
    }
  }

  //==================================================
  //==== CLOSE SIDEBAR
  //==================================================

  closeSidebar() {
    if (isPlatformBrowser(this.platformId)) {
      if (window.innerWidth < 992) {
        this.navServices.collapseSidebar = false;
      }
    }
  }
}
