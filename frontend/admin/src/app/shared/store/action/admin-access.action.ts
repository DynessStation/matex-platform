import { Params } from '../../interface/core.interface';

import {
  IAdminAccessPayload,
  IUpdateAdminAccessStatus,
} from '../../interface/admin-access.interface';

//==================================================
//==== GET LIST
//==================================================

export class GetAdminAccessesAction {
  static readonly type = '[Admin Access] Get List';

  constructor(public payload?: Params) {}
}

//==================================================
//==== GET PERMISSION MATRIX
//==================================================

export class GetAdminAccessPermissionMatrixAction {
  static readonly type = '[Admin Access] Get Permission Matrix';
}

//==================================================
//==== GET DETAIL
//==================================================

export class GetAdminAccessDetailAction {
  static readonly type = '[Admin Access] Get Detail';

  constructor(public id: string) {}
}

//==================================================
//==== CREATE
//==================================================

export class CreateAdminAccessAction {
  static readonly type = '[Admin Access] Create';

  constructor(public payload: IAdminAccessPayload) {}
}

//==================================================
//==== UPDATE
//==================================================

export class UpdateAdminAccessAction {
  static readonly type = '[Admin Access] Update';

  constructor(
    public id: string,

    public payload: IAdminAccessPayload,
  ) {}
}

//==================================================
//==== UPDATE STATUS
//==================================================

export class UpdateAdminAccessStatusAction {
  static readonly type = '[Admin Access] Update Status';

  constructor(
    public id: string,

    public payload: IUpdateAdminAccessStatus,
  ) {}
}

//==================================================
//==== DELETE
//==================================================

export class DeleteAdminAccessAction {
  static readonly type = '[Admin Access] Delete';

  constructor(public id: string) {}
}
