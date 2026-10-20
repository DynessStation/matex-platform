import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';

import * as data from '../../data/menu';
import { ISidebar, IBadges } from '../../interface/sidebar.interface';
import {
  GetSidebarAction,
  UpdateBadgeValueAction,
} from '../action/sidebar.action';

export class SidebarStateModel {
  menu = {
    data: [] as ISidebar[],
  };
  badges: IBadges | null;
}

@State<SidebarStateModel>({
  name: 'sidebar',
  defaults: {
    menu: {
      data: [],
    },
    badges: null,
  },
})
@Injectable()
export class SidebarState {
  private store = inject(Store);

  @Selector()
  static menu(state: SidebarStateModel) {
    return state.menu;
  }

  @Selector()
  static badges(state: SidebarStateModel) {
    return state.badges;
  }

  private updateBadgeValueRecursive(
    menuItems: ISidebar[],
    path: string,
    badgeValue: number,
  ) {
    for (const item of menuItems) {
      if (item.path && item.path.toString() == path.toString()) {
        item.badgeValue = badgeValue;
        break;
      }
      if (item.children) {
        this.updateBadgeValueRecursive(item.children, path, badgeValue);
      }
    }
  }

  @Action(GetSidebarAction)
  getMenu(ctx: StateContext<SidebarStateModel>) {
    ctx.patchState({
      menu: {
        data: data.menu,
      },
    });
  }

  @Action(UpdateBadgeValueAction)
  updateBadgeValue(
    ctx: StateContext<SidebarStateModel>,
    { path, badgeValue }: UpdateBadgeValueAction,
  ) {
    const state = ctx.getState();
    this.updateBadgeValueRecursive(state?.menu?.data, path, badgeValue);
    ctx.patchState({
      ...state,
    });
  }
}
