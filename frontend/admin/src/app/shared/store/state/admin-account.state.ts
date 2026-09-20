import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import {
  IAdminAccountDetailResponse,
  IAdminAccountModel,
} from '../../interface/admin-account.interface';

import { AdminAccountService } from '../../services/admin-account.service';

import { ApiMessageService } from '../../services/api-message.service';

import { NotificationService } from '../../services/notification.service';

import {
  CreateAdminAccountAction,
  DeleteAdminAccountAction,
  EditAdminAccountAction,
  GetAdminAccountsAction,
  UpdateAdminAccountAction,
  UpdateAdminAccountStatusAction,
} from '../action/admin-account.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface AdminAccountStateModel {
  adminAccounts: IAdminAccountModel;

  selectedAdminAccount: IAdminAccountDetailResponse['data'] | null;
}

//==================================================
//==== STATE
//==================================================

@State<AdminAccountStateModel>({
  name: 'adminAccount',

  defaults: {
    adminAccounts: {
      success: false,

      data: [],

      pagination: {
        total: 0,

        page: 1,

        limit: 15,

        length: 0,

        pagerows: 0,
      },
    },

    selectedAdminAccount: null,
  },
})
@Injectable()
export class AdminAccountState {
  private adminAccountService = inject(AdminAccountService);

  private notificationService = inject(NotificationService);

  private apiMessageService = inject(ApiMessageService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static adminAccounts(state: AdminAccountStateModel) {
    return state.adminAccounts;
  }

  @Selector()
  static selectedAdminAccount(state: AdminAccountStateModel) {
    return state.selectedAdminAccount;
  }

  //==================================================
  //==== GET
  //==================================================

  @Action(GetAdminAccountsAction)
  getAdminAccounts(
    ctx: StateContext<AdminAccountStateModel>,

    action: GetAdminAccountsAction,
  ) {
    return this.adminAccountService.getAdminAccounts(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          adminAccounts: result,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE
  //==================================================

  @Action(CreateAdminAccountAction)
  createAdminAccount(
    _ctx: StateContext<AdminAccountStateModel>,

    action: CreateAdminAccountAction,
  ) {
    return this.adminAccountService.createAdminAccount(action.payload).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),
    );
  }

  //==================================================
  //==== EDIT
  //==================================================

  @Action(EditAdminAccountAction)
  editAdminAccount(
    ctx: StateContext<AdminAccountStateModel>,

    action: EditAdminAccountAction,
  ) {
    //==================================================
    //==== CLEAR PREVIOUS DETAIL
    //==================================================

    ctx.patchState({
      selectedAdminAccount: null,
    });

    //==================================================
    //==== GET DETAIL
    //==================================================

    return this.adminAccountService.getAdminAccountDetail(action.id).pipe(
      tap((response) => {
        ctx.patchState({
          selectedAdminAccount: response.data,
        });
      }),
    );
  }

  //==================================================
  //==== UPDATE
  //==================================================

  @Action(UpdateAdminAccountAction)
  updateAdminAccount(
    _ctx: StateContext<AdminAccountStateModel>,

    action: UpdateAdminAccountAction,
  ) {
    return this.adminAccountService
      .updateAdminAccount(action.id, action.payload)
      .pipe(
        tap((response) => {
          this.notificationService.showSuccess(
            this.apiMessageService.resolveResponse(response),
          );
        }),
      );
  }

  //==================================================
  //==== STATUS
  //==================================================

  @Action(UpdateAdminAccountStatusAction)
  updateAdminAccountStatus(
    _ctx: StateContext<AdminAccountStateModel>,

    action: UpdateAdminAccountStatusAction,
  ) {
    return this.adminAccountService
      .updateAdminAccountStatus(action.id, action.payload)
      .pipe(
        tap((response) => {
          this.notificationService.showSuccess(
            this.apiMessageService.resolveResponse(response),
          );
        }),
      );
  }

  //==================================================
  //==== DELETE
  //==================================================

  @Action(DeleteAdminAccountAction)
  deleteAdminAccount(
    _ctx: StateContext<AdminAccountStateModel>,

    action: DeleteAdminAccountAction,
  ) {
    return this.adminAccountService.deleteAdminAccount(action.id).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),
    );
  }
}
