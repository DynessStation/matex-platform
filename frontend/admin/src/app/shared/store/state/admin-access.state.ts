import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import {
  IAdminAccessDetail,
  IAdminAccessModel,
  IAdminAccessPermissionGroup,
} from '../../interface/admin-access.interface';

import { AdminAccessService } from '../../services/admin-access.service';

import { NotificationService } from '../../services/notification.service';

import { ApiMessageService } from '../../services/api-message.service';

import {
  CreateAdminAccessAction,
  DeleteAdminAccessAction,
  GetAdminAccessDetailAction,
  GetAdminAccessesAction,
  GetAdminAccessPermissionMatrixAction,
  UpdateAdminAccessAction,
  UpdateAdminAccessStatusAction,
} from '../action/admin-access.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface AdminAccessStateModel {
  adminAccesses: IAdminAccessModel;

  selectedAdminAccess: IAdminAccessDetail | null;

  permissionMatrix: IAdminAccessPermissionGroup[];
}

//==================================================
//==== STATE
//==================================================

@State<AdminAccessStateModel>({
  name: 'adminAccess',

  defaults: {
    adminAccesses: {
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

    selectedAdminAccess: null,

    permissionMatrix: [],
  },
})
@Injectable()
export class AdminAccessState {
  private adminAccessService = inject(AdminAccessService);

  private notificationService = inject(NotificationService);

  private apiMessageService = inject(ApiMessageService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static adminAccesses(state: AdminAccessStateModel) {
    return state.adminAccesses;
  }

  @Selector()
  static selectedAdminAccess(state: AdminAccessStateModel) {
    return state.selectedAdminAccess;
  }

  @Selector()
  static permissionMatrix(state: AdminAccessStateModel) {
    return state.permissionMatrix;
  }

  //==================================================
  //==== GET LIST
  //==================================================

  @Action(GetAdminAccessesAction)
  getAdminAccesses(
    ctx: StateContext<AdminAccessStateModel>,

    action: GetAdminAccessesAction,
  ) {
    return this.adminAccessService.getAdminAccesses(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          adminAccesses: result,
        });
      }),
    );
  }

  //==================================================
  //==== PERMISSION MATRIX
  //==================================================

  @Action(GetAdminAccessPermissionMatrixAction)
  getPermissionMatrix(ctx: StateContext<AdminAccessStateModel>) {
    return this.adminAccessService.getPermissionMatrix().pipe(
      tap((result) => {
        ctx.patchState({
          permissionMatrix: result.data,
        });
      }),
    );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  @Action(GetAdminAccessDetailAction)
  getAdminAccessDetail(
    ctx: StateContext<AdminAccessStateModel>,

    action: GetAdminAccessDetailAction,
  ) {
    //==================================================
    //==== CLEAR PREVIOUS DETAIL
    //==================================================

    ctx.patchState({
      selectedAdminAccess: null,
    });

    //==================================================
    //==== GET DETAIL
    //==================================================

    return this.adminAccessService.getAdminAccessDetail(action.id).pipe(
      tap((result) => {
        ctx.patchState({
          selectedAdminAccess: result.data,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE
  //==================================================

  @Action(CreateAdminAccessAction)
  createAdminAccess(
    _ctx: StateContext<AdminAccessStateModel>,

    action: CreateAdminAccessAction,
  ) {
    return this.adminAccessService.createAdminAccess(action.payload).pipe(
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

  @Action(UpdateAdminAccessAction)
  updateAdminAccess(
    _ctx: StateContext<AdminAccessStateModel>,

    action: UpdateAdminAccessAction,
  ) {
    return this.adminAccessService
      .updateAdminAccess(action.id, action.payload)
      .pipe(
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

  @Action(UpdateAdminAccessStatusAction)
  updateStatus(
    _ctx: StateContext<AdminAccessStateModel>,

    action: UpdateAdminAccessStatusAction,
  ) {
    return this.adminAccessService
      .updateAdminAccessStatus(action.id, action.payload)
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

  @Action(DeleteAdminAccessAction)
  deleteAdminAccess(
    _ctx: StateContext<AdminAccessStateModel>,

    action: DeleteAdminAccessAction,
  ) {
    return this.adminAccessService.deleteAdminAccess(action.id).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }
}
