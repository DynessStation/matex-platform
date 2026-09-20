import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import {
  IAdminPermissionDetailResponse,
  IAdminPermissionModel,
} from '../../interface/admin-permission.interface';

import { AdminPermissionService } from '../../services/admin-permission.service';

import { NotificationService } from '../../services/notification.service';

import { ApiMessageService } from '../../services/api-message.service';

import {
  CreateAdminPermissionAction,
  DeleteAdminPermissionAction,
  EditAdminPermissionAction,
  GetAdminPermissionsAction,
  UpdateAdminPermissionAction,
  UpdateAdminPermissionStatusAction,
} from '../action/admin-permission.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface AdminPermissionStateModel {
  adminPermissions: IAdminPermissionModel;

  selectedAdminPermission: IAdminPermissionDetailResponse['data'] | null;
}

//==================================================
//==== STATE
//==================================================

@State<AdminPermissionStateModel>({
  name: 'adminPermission',

  defaults: {
    adminPermissions: {
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

    selectedAdminPermission: null,
  },
})
@Injectable()
export class AdminPermissionState {
  private adminPermissionService = inject(AdminPermissionService);

  private notificationService = inject(NotificationService);

  private apiMessageService = inject(ApiMessageService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static adminPermissions(state: AdminPermissionStateModel) {
    return state.adminPermissions;
  }

  @Selector()
  static selectedAdminPermission(state: AdminPermissionStateModel) {
    return state.selectedAdminPermission;
  }

  //==================================================
  //==== GET
  //==================================================

  @Action(GetAdminPermissionsAction)
  getAdminPermissions(
    ctx: StateContext<AdminPermissionStateModel>,

    action: GetAdminPermissionsAction,
  ) {
    return this.adminPermissionService.getAdminPermissions(action.payload).pipe(
      tap((response) => {
        ctx.patchState({
          adminPermissions: response,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE
  //==================================================

  @Action(CreateAdminPermissionAction)
  createAdminPermission(
    _ctx: StateContext<AdminPermissionStateModel>,

    action: CreateAdminPermissionAction,
  ) {
    return this.adminPermissionService
      .createAdminPermission(action.payload)
      .pipe(
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

  @Action(EditAdminPermissionAction)
  editAdminPermission(
    ctx: StateContext<AdminPermissionStateModel>,

    action: EditAdminPermissionAction,
  ) {
    //==================================================
    //==== CLEAR PREVIOUS DETAIL
    //==================================================

    ctx.patchState({
      selectedAdminPermission: null,
    });

    //==================================================
    //==== GET DETAIL
    //==================================================

    return this.adminPermissionService.getAdminPermissionDetail(action.id).pipe(
      tap((response) => {
        ctx.patchState({
          selectedAdminPermission: response.data,
        });
      }),
    );
  }

  //==================================================
  //==== UPDATE
  //==================================================

  @Action(UpdateAdminPermissionAction)
  updateAdminPermission(
    _ctx: StateContext<AdminPermissionStateModel>,

    action: UpdateAdminPermissionAction,
  ) {
    return this.adminPermissionService
      .updateAdminPermission(action.id, action.payload)
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

  @Action(UpdateAdminPermissionStatusAction)
  updateAdminPermissionStatus(
    _ctx: StateContext<AdminPermissionStateModel>,

    action: UpdateAdminPermissionStatusAction,
  ) {
    return this.adminPermissionService
      .updateAdminPermissionStatus(action.id, action.payload)
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

  @Action(DeleteAdminPermissionAction)
  deleteAdminPermission(
    _ctx: StateContext<AdminPermissionStateModel>,

    action: DeleteAdminPermissionAction,
  ) {
    return this.adminPermissionService.deleteAdminPermission(action.id).pipe(
      tap((response) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(response),
        );
      }),
    );
  }
}
