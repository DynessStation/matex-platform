import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { INotice } from '../../interface/notice.interface';
import { NoticeService } from '../../services/notice.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateNoticeAction,
  DeleteNoticeAction,
  EditNoticeAction,
  GetNoticeAction,
  MarkAsReadNoticeAction,
  ResentNoticeAction,
  UpdateNoticeAction,
} from '../action/notice.action';

export class NoticeStateModel {
  notice = {
    data: [] as INotice[],
    total: 0,
  };
  selectedNotice: INotice | null;
  recentNotice: INotice | null;
}

@State<NoticeStateModel>({
  name: 'notice',
  defaults: {
    notice: {
      data: [],
      total: 0,
    },
    selectedNotice: null,
    recentNotice: null,
  },
})
@Injectable()
export class NoticeState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private noticeService = inject(NoticeService);

  @Selector()
  static notice(state: NoticeStateModel) {
    return state.notice;
  }

  @Selector()
  static selectedNotice(state: NoticeStateModel) {
    return state.selectedNotice;
  }

  @Selector()
  static recentNotice(state: NoticeStateModel) {
    return state.recentNotice;
  }

  @Action(GetNoticeAction)
  getNotices(ctx: StateContext<NoticeStateModel>, action: GetNoticeAction) {
    return this.noticeService.getNotice(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            notice: {
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

  @Action(CreateNoticeAction)
  create(_ctx: StateContext<NoticeStateModel>, _action: CreateNoticeAction) {
    // Create Notice Logic Here
  }

  @Action(EditNoticeAction)
  edit(ctx: StateContext<NoticeStateModel>, { id }: EditNoticeAction) {
    return this.noticeService.getNotice().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(notice => notice.id == id);
          ctx.patchState({
            ...state,
            selectedNotice: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(ResentNoticeAction)
  recentNotice(ctx: StateContext<NoticeStateModel>, { id: _id }: ResentNoticeAction) {
    return this.noticeService.getNotice().pipe(
      tap({
        next: result => {
          ctx.patchState({
            recentNotice: result.data.length ? result.data[0] : null,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateNoticeAction)
  update(_ctx: StateContext<NoticeStateModel>, { payload: _payload, id: _id }: UpdateNoticeAction) {
    // Update Notice Logic Here
  }

  @Action(MarkAsReadNoticeAction)
  markAsRead(_ctx: StateContext<NoticeStateModel>, { id: _id }: MarkAsReadNoticeAction) {
    // Mark As Read Logic Here
  }

  @Action(DeleteNoticeAction)
  delete(_ctx: StateContext<NoticeStateModel>, { id: _id }: DeleteNoticeAction) {
    // Delete Notice Logic Here
  }
}
