import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IPage } from '../../interface/page.interface';
import { NotificationService } from '../../services/notification.service';
import { PageService } from '../../services/page.service';
import {
  GetPagesAction,
  CreatePageAction,
  EditPageAction,
  UpdatePageAction,
  UpdatePageStatusAction,
  DeletePageAction,
  DeleteAllPageAction,
} from '../action/page.action';

export class PageStateModel {
  page = {
    data: [] as IPage[],
    total: 0,
  };
  selectedPage: IPage | null;
}

@State<PageStateModel>({
  name: 'page',
  defaults: {
    page: {
      data: [],
      total: 0,
    },
    selectedPage: null,
  },
})
@Injectable()
export class PageState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private pageService = inject(PageService);

  @Selector()
  static page(state: PageStateModel) {
    return state.page;
  }

  @Selector()
  static pages(state: PageStateModel) {
    return state.page.data.map(res => {
      return { label: res?.title, value: res?.slug };
    });
  }

  @Selector()
  static selectedPage(state: PageStateModel) {
    return state.selectedPage;
  }

  @Action(GetPagesAction)
  getPages(ctx: StateContext<PageStateModel>, action: GetPagesAction) {
    return this.pageService.getPages(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            page: {
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

  @Action(CreatePageAction)
  create(_ctx: StateContext<PageStateModel>, _action: CreatePageAction) {
    // Create Page Logic Here
  }

  @Action(EditPageAction)
  edit(ctx: StateContext<PageStateModel>, { id }: EditPageAction) {
    return this.pageService.getPages().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(page => page.id == id);

          ctx.patchState({
            ...state,
            selectedPage: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdatePageAction)
  update(_ctx: StateContext<PageStateModel>, { payload: _payload, id: _id }: UpdatePageAction) {
    // Update Page Logic Here
  }

  @Action(UpdatePageStatusAction)
  updateStatus(
    _ctx: StateContext<PageStateModel>,
    { id: _id, status: _status }: UpdatePageStatusAction,
  ) {
    // Update Page Status Logic Here
  }

  @Action(DeletePageAction)
  delete(_ctx: StateContext<PageStateModel>, { id: _id }: DeletePageAction) {
    // Delate Page Logic Here
  }

  @Action(DeleteAllPageAction)
  deleteAll(_ctx: StateContext<PageStateModel>, { ids: _ids }: DeleteAllPageAction) {
    // Delete All Page Logic Here
  }
}
