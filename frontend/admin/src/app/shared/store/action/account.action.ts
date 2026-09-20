import { IStores } from '../../interface/store.interface';
import { IAccountUser, IAccountUserUpdatePassword } from './../../interface/account.interface';

export class GetUserDetailsAction {
  static readonly type = '[Account] User Get';
}

export class UpdateUserProfileAction {
  static readonly type = '[Account] User Update';
  constructor(public payload: IAccountUser) {}
}

export class UpdateUserPasswordAction {
  static readonly type = '[Account] User Update Password';
  constructor(public payload: IAccountUserUpdatePassword) {}
}

export class UpdateStoreDetailsAction {
  static readonly type = '[Account] Update Store Profile';
  constructor(public payload: IStores) {}
}

export class AccountClearAction {
  static readonly type = '[Account] Clear';
  constructor() {}
}
