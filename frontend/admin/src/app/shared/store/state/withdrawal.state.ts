import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { tap } from 'rxjs';

import { IWithdrawal } from '../../interface/withdrawal.interface';
import { NotificationService } from '../../services/notification.service';
import { WithdrawalService } from '../../services/withdrawal.service';
import {
  GetWithdrawRequestAction,
  UpdateWithdrawStatusAction,
  WithdrawRequestAction,
} from '../action/withdrawal.action';

export class WithdrawalStateModel {
  withdrawal = {
    data: [] as IWithdrawal[],
    total: 0,
  };
}

@State<WithdrawalStateModel>({
  name: 'withdrawal',
  defaults: {
    withdrawal: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class WithdrawalState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private withdrawalService = inject(WithdrawalService);

  @Selector()
  static withdrawal(state: WithdrawalStateModel) {
    return state.withdrawal;
  }

  @Action(GetWithdrawRequestAction)
  getWithdrawal(ctx: StateContext<WithdrawalStateModel>, action: GetWithdrawRequestAction) {
    return this.withdrawalService.getWithdrawRequest(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            withdrawal: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(WithdrawRequestAction)
  createRequest(_ctx: StateContext<WithdrawalStateModel>, _action: WithdrawRequestAction) {
    // Create Withdrawal Logic Here
  }

  @Action(UpdateWithdrawStatusAction)
  updateWithdrawStatus(
    _ctx: StateContext<WithdrawalStateModel>,
    { id: _id, status: _status }: UpdateWithdrawStatusAction,
  ) {
    // Update Withdrawal Status Logic Here
  }
}
