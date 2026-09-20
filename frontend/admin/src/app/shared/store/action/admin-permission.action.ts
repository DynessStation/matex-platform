import {
  ICreateAdminPermission,
  IUpdateAdminPermission,
  IUpdateAdminPermissionStatus,
} from '../../interface/admin-permission.interface';

import { Params } from '../../interface/core.interface';

//==================================================
//==== GET
//==================================================

export class GetAdminPermissionsAction {
  static readonly type = '[Admin Permission] Get';

  constructor(public payload?: Params) {}
}

//==================================================
//==== CREATE
//==================================================

export class CreateAdminPermissionAction {
  static readonly type = '[Admin Permission] Create';

  constructor(public payload: ICreateAdminPermission) {}
}

//==================================================
//==== DETAIL / EDIT
//==================================================

export class EditAdminPermissionAction {
  static readonly type = '[Admin Permission] Edit';

  constructor(public id: string) {}
}

//==================================================
//==== UPDATE
//==================================================

export class UpdateAdminPermissionAction {
  static readonly type = '[Admin Permission] Update';

  constructor(
    public id: string,

    public payload: IUpdateAdminPermission,
  ) {}
}

//==================================================
//==== STATUS
//==================================================

export class UpdateAdminPermissionStatusAction {
  static readonly type = '[Admin Permission] Status';

  constructor(
    public id: string,

    public payload: IUpdateAdminPermissionStatus,
  ) {}
}

//==================================================
//==== DELETE
//==================================================

export class DeleteAdminPermissionAction {
  static readonly type = '[Admin Permission] Delete';

  constructor(public id: string) {}
}
