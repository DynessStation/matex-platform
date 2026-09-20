import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import { IChairDetail, IChairModel } from '../../interface/chair.interface';

import { ChairService } from '../../services/chair.service';

import { NotificationService } from '../../services/notification.service';

import { ApiMessageService } from '../../services/api-message.service';

import {
  CreateChairAction,
  DeleteChairAction,
  GetChairDetailAction,
  GetChairsAction,
  UpdateChairAction,
  UpdateChairStatusAction,
} from '../action/chair.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface ChairStateModel {
  chairs: IChairModel;

  selectedChair: IChairDetail | null;
}

//==================================================
//==== STATE
//==================================================

@State<ChairStateModel>({
  name: 'chair',

  defaults: {
    chairs: {
      success: false,

      data: [],

      pagination: {
        page: 1,

        limit: 15,

        total: 0,

        length: 0,

        pagerows: 0,

        total_pages: 0,

        has_more: false,
      },
    },

    selectedChair: null,
  },
})
@Injectable()
export class ChairState {
  private chairService = inject(ChairService);

  private notificationService = inject(NotificationService);

  private apiMessageService = inject(ApiMessageService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static chairs(state: ChairStateModel) {
    return state.chairs;
  }

  @Selector()
  static selectedChair(state: ChairStateModel) {
    return state.selectedChair;
  }

  //==================================================
  //==== GET LIST
  //==================================================

  @Action(GetChairsAction)
  getChairs(
    ctx: StateContext<ChairStateModel>,

    action: GetChairsAction,
  ) {
    return this.chairService.getChairs(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          chairs: result,
        });
      }),
    );
  }

  //==================================================
  //==== GET DETAIL
  //==================================================

  @Action(GetChairDetailAction)
  getChairDetail(
    ctx: StateContext<ChairStateModel>,

    action: GetChairDetailAction,
  ) {
    //==================================================
    //==== CLEAR PREVIOUS DETAIL
    //==================================================

    ctx.patchState({
      selectedChair: null,
    });

    //==================================================
    //==== GET DETAIL
    //==================================================

    return this.chairService.getChairDetail(action.id).pipe(
      tap((result) => {
        ctx.patchState({
          selectedChair: result.data,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE
  //==================================================

  @Action(CreateChairAction)
  createChair(
    _ctx: StateContext<ChairStateModel>,

    action: CreateChairAction,
  ) {
    return this.chairService.createChair(action.payload).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== UPDATE
  //==================================================

  @Action(UpdateChairAction)
  updateChair(
    _ctx: StateContext<ChairStateModel>,

    action: UpdateChairAction,
  ) {
    return this.chairService.updateChair(action.id, action.payload).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== STATUS
  //==================================================

  @Action(UpdateChairStatusAction)
  updateStatus(
    _ctx: StateContext<ChairStateModel>,

    action: UpdateChairStatusAction,
  ) {
    return this.chairService.updateChairStatus(action.id, action.payload).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== DELETE
  //==================================================

  @Action(DeleteChairAction)
  deleteChair(
    _ctx: StateContext<ChairStateModel>,

    action: DeleteChairAction,
  ) {
    return this.chairService.deleteChair(action.id).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }
}
