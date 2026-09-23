import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { forkJoin, switchMap, tap } from 'rxjs';

import {
  IWebNavigationDetail,
  IWebNavigationSummary,
} from '../../interface/web-navigation.interface';

import { ApiMessageService } from '../../services/api-message.service';

import { NotificationService } from '../../services/notification.service';

import { WebNavigationService } from '../../services/web-navigation.service';

import {
  ClearWebNavigationDetailAction,
  CreateWebNavigationAction,
  CreateWebNavigationItemAction,
  DeleteWebNavigationAction,
  DeleteWebNavigationItemAction,
  GetWebNavigationDetailAction,
  GetWebNavigationsAction,
  ReorderWebNavigationItemsAction,
  UpdateWebNavigationAction,
  UpdateWebNavigationItemAction,
  UpdateWebNavigationStatusAction,
} from '../action/web-navigation.action';

export interface WebNavigationStateModel {
  navigations: IWebNavigationSummary[];

  selectedNavigation: IWebNavigationDetail | null;

  lastCreatedNavigationId: string | null;

  lastCreatedItemId: string | null;
}

@State<WebNavigationStateModel>({
  name: 'webNavigation',

  defaults: {
    navigations: [],

    selectedNavigation: null,

    lastCreatedNavigationId: null,

    lastCreatedItemId: null,
  },
})
@Injectable()
export class WebNavigationState {
  private service = inject(WebNavigationService);

  private notificationService = inject(NotificationService);

  private apiMessageService = inject(ApiMessageService);

  @Selector()
  static navigations(state: WebNavigationStateModel) {
    return state.navigations;
  }

  @Selector()
  static selectedNavigation(state: WebNavigationStateModel) {
    return state.selectedNavigation;
  }

  @Selector()
  static lastCreatedNavigationId(state: WebNavigationStateModel) {
    return state.lastCreatedNavigationId;
  }

  @Selector()
  static lastCreatedItemId(state: WebNavigationStateModel) {
    return state.lastCreatedItemId;
  }

  @Action(GetWebNavigationsAction)
  getList(ctx: StateContext<WebNavigationStateModel>) {
    return this.service.getNavigations().pipe(
      tap((response) => {
        ctx.patchState({
          navigations: response.data.navigations,
        });
      }),
    );
  }

  @Action(GetWebNavigationDetailAction)
  getDetail(
    ctx: StateContext<WebNavigationStateModel>,
    action: GetWebNavigationDetailAction,
  ) {
    ctx.patchState({
      selectedNavigation: null,
    });

    return this.service.getNavigationDetail(action.id).pipe(
      tap((response) => {
        ctx.patchState({
          selectedNavigation: response.data,
        });
      }),
    );
  }

  @Action(ClearWebNavigationDetailAction)
  clearDetail(ctx: StateContext<WebNavigationStateModel>) {
    ctx.patchState({
      selectedNavigation: null,
      lastCreatedItemId: null,
    });
  }

  @Action(CreateWebNavigationAction)
  createNavigation(
    ctx: StateContext<WebNavigationStateModel>,
    action: CreateWebNavigationAction,
  ) {
    ctx.patchState({
      lastCreatedNavigationId: null,
    });

    return this.service.createNavigation(action.payload).pipe(
      tap((response) => {
        ctx.patchState({
          lastCreatedNavigationId: response.data?.id_web_navigation ?? null,
        });

        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() => this.service.getNavigations()),

      tap((response) => {
        ctx.patchState({
          navigations: response.data.navigations,
        });
      }),
    );
  }

  @Action(UpdateWebNavigationAction)
  updateNavigation(
    ctx: StateContext<WebNavigationStateModel>,
    action: UpdateWebNavigationAction,
  ) {
    return this.service.updateNavigation(action.id, action.payload).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() =>
        forkJoin({
          list: this.service.getNavigations(),

          detail: this.service.getNavigationDetail(action.id),
        }),
      ),

      tap(({ list, detail }) => {
        ctx.patchState({
          navigations: list.data.navigations,

          selectedNavigation: detail.data,
        });
      }),
    );
  }

  @Action(UpdateWebNavigationStatusAction)
  updateStatus(
    ctx: StateContext<WebNavigationStateModel>,
    action: UpdateWebNavigationStatusAction,
  ) {
    return this.service.updateNavigationStatus(action.id, action.payload).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() =>
        forkJoin({
          list: this.service.getNavigations(),

          detail: this.service.getNavigationDetail(action.id),
        }),
      ),

      tap(({ list, detail }) => {
        ctx.patchState({
          navigations: list.data.navigations,

          selectedNavigation: detail.data,
        });
      }),
    );
  }

  @Action(DeleteWebNavigationAction)
  deleteNavigation(
    ctx: StateContext<WebNavigationStateModel>,
    action: DeleteWebNavigationAction,
  ) {
    return this.service.deleteNavigation(action.id).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() => this.service.getNavigations()),

      tap((response) => {
        const state = ctx.getState();

        ctx.patchState({
          navigations: response.data.navigations,

          selectedNavigation:
            state.selectedNavigation?.id_web_navigation === action.id
              ? null
              : state.selectedNavigation,
        });
      }),
    );
  }

  @Action(CreateWebNavigationItemAction)
  createItem(
    ctx: StateContext<WebNavigationStateModel>,
    action: CreateWebNavigationItemAction,
  ) {
    ctx.patchState({
      lastCreatedItemId: null,
    });

    return this.service.createItem(action.navigationId, action.payload).pipe(
      tap((response) => {
        ctx.patchState({
          lastCreatedItemId: response.data?.id_web_navigation_item ?? null,
        });

        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() => this.service.getNavigationDetail(action.navigationId)),

      tap((response) => {
        ctx.patchState({
          selectedNavigation: response.data,
        });
      }),
    );
  }

  @Action(UpdateWebNavigationItemAction)
  updateItem(
    ctx: StateContext<WebNavigationStateModel>,
    action: UpdateWebNavigationItemAction,
  ) {
    return this.service
      .updateItem(action.navigationId, action.itemId, action.payload)
      .pipe(
        tap((response) => {
          this.notificationService.showSuccess(
            this.apiMessageService.resolveResponse(response),
          );
        }),

        switchMap(() => this.service.getNavigationDetail(action.navigationId)),

        tap((response) => {
          ctx.patchState({
            selectedNavigation: response.data,
          });
        }),
      );
  }

  @Action(DeleteWebNavigationItemAction)
  deleteItem(
    ctx: StateContext<WebNavigationStateModel>,
    action: DeleteWebNavigationItemAction,
  ) {
    return this.service.deleteItem(action.navigationId, action.itemId).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() => this.service.getNavigationDetail(action.navigationId)),

      tap((response) => {
        ctx.patchState({
          selectedNavigation: response.data,
        });
      }),
    );
  }

  @Action(ReorderWebNavigationItemsAction)
  reorderItems(
    ctx: StateContext<WebNavigationStateModel>,
    action: ReorderWebNavigationItemsAction,
  ) {
    return this.service.reorderItems(action.navigationId, action.payload).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),

      switchMap(() => this.service.getNavigationDetail(action.navigationId)),

      tap((response) => {
        ctx.patchState({
          selectedNavigation: response.data,
        });
      }),
    );
  }
}
