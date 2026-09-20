import { Params } from '../../interface/core.interface';

import {
  ICreateAdminAccount,
  IUpdateAdminAccount,
  IUpdateAdminAccountStatus,
} from '../../interface/admin-account.interface';

//==================================================
//==== GET ADMIN ACCOUNTS
//==================================================

export class GetAdminAccountsAction {
  static readonly type = '[Admin Account] Get';

  constructor(public payload?: Params) {}
}

//==================================================
//==== CREATE ADMIN ACCOUNT
//==================================================

export class CreateAdminAccountAction {
  static readonly type = '[Admin Account] Create';

  constructor(public payload: ICreateAdminAccount) {}
}

//==================================================
//==== EDIT ADMIN ACCOUNT
//==================================================

export class EditAdminAccountAction {
  static readonly type = '[Admin Account] Edit';

  constructor(public id: string) {}
}

//==================================================
//==== UPDATE ADMIN ACCOUNT
//==================================================

export class UpdateAdminAccountAction {
  static readonly type = '[Admin Account] Update';

  constructor(
    public payload: IUpdateAdminAccount,
    public id: string,
  ) {}
}

//==================================================
//==== UPDATE ADMIN ACCOUNT STATUS
//==================================================

export class UpdateAdminAccountStatusAction {
  static readonly type = '[Admin Account] Update Status';

  constructor(
    public id: string,

    public payload: IUpdateAdminAccountStatus,
  ) {}
}

//==================================================
//==== DELETE ADMIN ACCOUNT
//==================================================

export class DeleteAdminAccountAction {
  static readonly type = '[Admin Account] Delete';

  constructor(public id: string) {}
}
