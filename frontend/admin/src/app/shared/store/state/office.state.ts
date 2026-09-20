import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import { IOfficeDetail, IOfficeModel } from '../../interface/office.interface';

import { OfficeService } from '../../services/office.service';

import { NotificationService } from '../../services/notification.service';
import { ApiMessageService } from '../../services/api-message.service';

import {
  CreateOfficeAction,
  DeleteOfficeAction,
  GetOfficeDetailAction,
  GetOfficesAction,
  UpdateOfficeAction,
  UpdateOfficeStatusAction,
} from '../action/office.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface OfficeStateModel {
  offices: IOfficeModel | null;

  selectedOffice: IOfficeDetail | null;
}

//==================================================
//==== STATE
//==================================================

@State<OfficeStateModel>({
  name: 'office',

  defaults: {
    offices: null,

    selectedOffice: null,
  },
})
@Injectable()
export class OfficeState {
  private officeService = inject(OfficeService);
  private apiMessageService = inject(ApiMessageService);
  private notificationService = inject(NotificationService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static offices(state: OfficeStateModel) {
    return state.offices;
  }

  @Selector()
  static selectedOffice(state: OfficeStateModel) {
    return state.selectedOffice;
  }

  //==================================================
  //==== LIST
  //==================================================

  @Action(GetOfficesAction)
  getOffices(ctx: StateContext<OfficeStateModel>, action: GetOfficesAction) {
    return this.officeService.getOffices(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          offices: result,
        });
      }),
    );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  @Action(GetOfficeDetailAction)
  getOfficeDetail(
    ctx: StateContext<OfficeStateModel>,
    action: GetOfficeDetailAction,
  ) {
    //==================================================
    //==== CLEAR PREVIOUS DETAIL
    //==================================================

    ctx.patchState({
      selectedOffice: null,
    });

    //==================================================
    //==== GET DETAIL
    //==================================================

    return this.officeService.getOfficeDetail(action.id).pipe(
      tap((result) => {
        ctx.patchState({
          selectedOffice: result.data,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE
  //==================================================

  @Action(CreateOfficeAction)
  createOffice(
    _ctx: StateContext<OfficeStateModel>,
    action: CreateOfficeAction,
  ) {
    return this.officeService.createOffice(action.payload).pipe(
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

  @Action(UpdateOfficeAction)
  updateOffice(
    _ctx: StateContext<OfficeStateModel>,
    action: UpdateOfficeAction,
  ) {
    return this.officeService.updateOffice(action.id, action.payload).pipe(
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

  @Action(UpdateOfficeStatusAction)
  updateOfficeStatus(
    _ctx: StateContext<OfficeStateModel>,
    action: UpdateOfficeStatusAction,
  ) {
    return this.officeService
      .updateOfficeStatus(action.id, action.payload)
      .pipe(
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

  @Action(DeleteOfficeAction)
  deleteOffice(
    _ctx: StateContext<OfficeStateModel>,
    action: DeleteOfficeAction,
  ) {
    return this.officeService.deleteOffice(action.id).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }
}
