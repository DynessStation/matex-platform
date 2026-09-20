import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ITransactionsData } from '../../interface/point.interface';
import { NotificationService } from '../../services/notification.service';
import { PointService } from '../../services/point.service';
import {
  GetUserTransactionAction,
  CreditPointAction,
  DebitPointAction,
} from '../action/point.action';

export class PointStateModel {
  point = {
    consumer_id: null as number | null,
    balance: 0 as number,
    transactions: {
      data: [] as ITransactionsData[],
      total: 0,
    },
  };
}

@State<PointStateModel>({
  name: 'point',
  defaults: {
    point: {
      consumer_id: null,
      balance: 0 as number,
      transactions: {
        data: [],
        total: 0,
      },
    },
  },
})
@Injectable()
export class PointState {
  private notificationService = inject(NotificationService);
  private pointService = inject(PointService);

  @Selector()
  static point(state: PointStateModel) {
    return state.point;
  }

  @Action(GetUserTransactionAction)
  getUserTransaction(ctx: StateContext<PointStateModel>, { payload }: GetUserTransactionAction) {
    return this.pointService.getUserTransaction(payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            point: {
              consumer_id: result?.consumer_id,
              balance: result?.balance,
              transactions: {
                data: result?.transactions?.data,
                total: result?.transactions?.total
                  ? result?.transactions?.total
                  : result?.transactions?.data?.length,
              },
            },
          });
        },
        error: err => {
          ctx.patchState({
            point: {
              consumer_id: null,
              balance: 0,
              transactions: {
                data: [],
                total: 0,
              },
            },
          });
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreditPointAction)
  credit(_ctx: StateContext<PointStateModel>, _action: CreditPointAction) {
    // Credit Point Logic Here
  }

  @Action(DebitPointAction)
  debit(_ctx: StateContext<PointStateModel>, _action: DebitPointAction) {
    // Debit Point Logic Here
  }
}
