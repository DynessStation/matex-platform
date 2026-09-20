import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ITransactionsData } from '../../interface/wallet.interface';
import { NotificationService } from '../../services/notification.service';
import { WalletService } from '../../services/wallet.service';
import {
  GetUserTransactionAction,
  CreditWalletAction,
  DebitWalletAction,
} from '../action/wallet.action';

export class WalletStateModel {
  wallet = {
    consumer_id: null as number | null,
    balance: 0 as number,
    transactions: {
      data: [] as ITransactionsData[],
      total: 0,
    },
  };
}

@State<WalletStateModel>({
  name: 'wallet',
  defaults: {
    wallet: {
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
export class WalletState {
  private notificationService = inject(NotificationService);
  private walletService = inject(WalletService);

  @Selector()
  static wallet(state: WalletStateModel) {
    return state.wallet;
  }

  @Action(GetUserTransactionAction)
  getUserTransations(ctx: StateContext<WalletStateModel>, { payload }: GetUserTransactionAction) {
    return this.walletService.getUserTransaction(payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            wallet: {
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
            wallet: {
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

  @Action(CreditWalletAction)
  credit(_ctx: StateContext<WalletStateModel>, _action: CreditWalletAction) {
    // Credit Logic Here
  }

  @Action(DebitWalletAction)
  debit(_ctx: StateContext<WalletStateModel>, _action: DebitWalletAction) {
    // Debit Logic Here
  }
}
