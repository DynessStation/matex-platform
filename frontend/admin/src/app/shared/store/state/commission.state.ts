import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ICommission } from '../../interface/commission.interface';
import { CommissionService } from '../../services/commission.service';
import { GetCommissionAction } from '../action/commission.action';

export class CommissionStateModel {
  commission = {
    data: [] as ICommission[],
    total: 0,
  };
}

@State<CommissionStateModel>({
  name: 'commission',
  defaults: {
    commission: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class CommissionState {
  private commissionService = inject(CommissionService);

  @Selector()
  static commission(state: CommissionStateModel) {
    return state.commission;
  }

  @Action(GetCommissionAction)
  getCommission(ctx: StateContext<CommissionStateModel>, action: GetCommissionAction) {
    return this.commissionService.getCommissionHistory(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            commission: {
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
}
