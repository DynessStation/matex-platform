import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import * as data from '../../data/menu';
import { ISidebar, IBadges } from '../../interface/sidebar.interface';
import { NavService } from '../../services/nav.service';
import {
  GetBadgesAction,
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
  private navService = inject(NavService);

  @Selector()
  static menu(state: SidebarStateModel) {
    return state.menu;
  }

  @Selector()
  static badges(state: SidebarStateModel) {
    return state.badges;
  }

  private updateBadgeValueRecursive(menuItems: ISidebar[], path: string, badgeValue: number) {
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

  @Action(GetBadgesAction)
  getBadges(ctx: StateContext<SidebarStateModel>, action: GetBadgesAction) {
    return this.navService.getBadges(action.payload).pipe(
      tap({
        next: result => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            badges: result,
          });
          this.store.dispatch(
            new UpdateBadgeValueAction('/product', result?.product?.total_in_approved_products),
          );
          this.store.dispatch(
            new UpdateBadgeValueAction('/store', result?.store?.total_in_approved_stores),
          );
          this.store.dispatch(
            new UpdateBadgeValueAction('/refund', result?.refund?.total_pending_refunds),
          );
          this.store.dispatch(
            new UpdateBadgeValueAction(
              '/withdrawal',
              result?.withdraw_request?.total_pending_withdraw_requests,
            ),
          );
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
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
