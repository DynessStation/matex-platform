import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IPermission } from '../../interface/role.interface';
import { AccountService } from '../../services/account.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetUserDetailsAction,
  UpdateUserProfileAction,
  UpdateUserPasswordAction,
  AccountClearAction,
  UpdateStoreDetailsAction,
} from '../action/account.action';
import { IAccountUser } from './../../interface/account.interface';

export class AccountStateModel {
  user: IAccountUser | null;
  permissions: IPermission[];
  roleName: string | null;
}

@State<AccountStateModel>({
  name: 'account',
  defaults: {
    user: null,
    permissions: [],
    roleName: null,
  },
})
@Injectable()
export class AccountState {
  private accountService = inject(AccountService);
  private notificationService = inject(NotificationService);
  router = inject(Router);

  @Selector()
  static user(state: AccountStateModel) {
    return state.user;
  }

  @Selector()
  static permissions(state: AccountStateModel) {
    return state.permissions;
  }

  @Selector()
  static getRoleName(state: AccountStateModel) {
    return state.roleName;
  }

  @Action(GetUserDetailsAction)
  getUserDetails(ctx: StateContext<AccountStateModel>) {
    return this.accountService.getUserDetails().pipe(
      tap({
        next: result => {
          ctx.patchState({
            user: result,
            permissions: result.permission,
            roleName: result.role.name,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateUserProfileAction)
  updateProfile(
    _ctx: StateContext<AccountStateModel>,
    { payload: _payload }: UpdateUserProfileAction,
  ) {
    // Update profile logic hre
  }

  @Action(UpdateUserPasswordAction)
  updatePassword(
    _ctx: StateContext<AccountStateModel>,
    { payload: _payload }: UpdateUserPasswordAction,
  ) {
    // Update password logic hre
  }

  @Action(UpdateStoreDetailsAction)
  UpdateStoreDetailsAction(
    _ctx: StateContext<AccountStateModel>,
    { payload: _payload }: UpdateStoreDetailsAction,
  ) {
    // Update store details logic here
  }

  @Action(AccountClearAction)
  accountClear(ctx: StateContext<AccountStateModel>) {
    ctx.patchState({
      user: null,
      permissions: [],
      roleName: null,
    });
  }
}
