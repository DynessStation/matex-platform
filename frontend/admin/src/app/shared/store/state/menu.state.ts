import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { tap } from 'rxjs';

import { IMenu } from '../../interface/menu.interface';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateMenuAction,
  DeleteMenuAction,
  EditMenuAction,
  GetMenuAction,
  UpdateMenuAction,
  UpdateSortMenuAction,
} from '../action/menu.action';

export class MenuStateModel {
  menu = {
    data: [] as IMenu[],
    total: 0,
  };
  selectedMenu: IMenu | null;
}

@State<MenuStateModel>({
  name: 'menu',
  defaults: {
    menu: {
      data: [],
      total: 0,
    },
    selectedMenu: null,
  },
})
@Injectable()
export class MenuState {
  private notificationService = inject(NotificationService);
  private menuService = inject(MenuService);
  private store = inject(Store);
  private router = inject(Router);

  @Selector()
  static menu(state: MenuStateModel) {
    return state.menu;
  }

  @Selector()
  static selectedMenu(state: MenuStateModel) {
    return state.selectedMenu;
  }

  @Action(GetMenuAction)
  getMenu(ctx: StateContext<MenuStateModel>, action: GetMenuAction) {
    return this.menuService.getMenu(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            menu: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateMenuAction)
  create(_ctx: StateContext<MenuStateModel>, _action: CreateMenuAction) {
    // Create Menu Logic Here
  }

  @Action(EditMenuAction)
  edit(ctx: StateContext<MenuStateModel>, { id }: EditMenuAction) {
    return this.menuService.getMenu().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(menu => menu.id == id);
          ctx.patchState({
            ...state,
            selectedMenu: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateMenuAction)
  update(_ctx: StateContext<MenuStateModel>, { payload: _payload, id: _id }: UpdateMenuAction) {
    // Update Menu Logic Here
  }

  @Action(UpdateSortMenuAction)
  updateShort(_ctx: StateContext<MenuStateModel>, _action: UpdateSortMenuAction) {
    // Update Short Logic Here
  }

  @Action(DeleteMenuAction)
  delete(_ctx: StateContext<MenuStateModel>, { id: _id }: DeleteMenuAction) {
    // Delete Menu Logic Here
  }
}
