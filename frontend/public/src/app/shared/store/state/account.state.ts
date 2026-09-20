import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { AccountUser, AccountUserUpdatePassword } from '../../interface/account.interface';
import { AccountService } from '../../services/account.service';
import {
  AccountClear,
  CreateAddress,
  DeleteAddress,
  GetUserDetails,
  UpdateAddress,
  UpdateUserPassword,
  UpdateUserProfile,
} from '../action/account.action';

export class AccountStateModel {
  user: AccountUser | null;
  permissions: [];
}

@State<AccountStateModel>({
  name: 'account',
  defaults: {
    user: null,
    permissions: [],
  },
})
@Injectable()
export class AccountState {
  constructor(private accountService: AccountService) {}

  @Selector()
  static user(state: AccountStateModel) {
    return state.user;
  }

  @Selector()
  static permissions(state: AccountStateModel) {
    return state.permissions;
  }

  @Action(GetUserDetails)
  getUserDetails(ctx: StateContext<AccountStateModel>) {
    return this.accountService.getUserDetails().pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            user: result,
            permissions: result.permission,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateUserProfile)
  updateProfile(_ctx: StateContext<AccountStateModel>) {
    // Update Profile Logic Here
  }

  @Action(UpdateUserPassword)
  updatePassword(_ctx: StateContext<AccountUserUpdatePassword>) {
    // Update Password Logic Here
  }

  @Action(CreateAddress)
  createAddress(_ctx: StateContext<AccountStateModel>, _action: CreateAddress) {
    // Create Address Logic Here
  }

  @Action(UpdateAddress)
  updateAddress(_ctx: StateContext<AccountStateModel>, _action: UpdateAddress) {
    // Update Address Logic Here
  }

  @Action(DeleteAddress)
  deleteAddress(_ctx: StateContext<AccountStateModel>, _action: DeleteAddress) {
    // Delete Address Logic Here
  }

  @Action(AccountClear)
  accountClear(ctx: StateContext<AccountStateModel>) {
    ctx.patchState({
      user: null,
      permissions: [],
    });
  }
}
