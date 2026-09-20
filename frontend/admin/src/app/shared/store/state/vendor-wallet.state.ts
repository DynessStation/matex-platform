import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ITransactionsData } from '../../interface/vendor-wallet.interface';
import { NotificationService } from '../../services/notification.service';
import { VendorWalletService } from '../../services/vendor-wallet.service';
import {
  GetVendorTransactionAction,
  CreditVendorWalletAction,
  DebitVendorWalletAction,
} from '../action/vendor-wallet.action';

export class VendorWalletStateModel {
  vendorWallet = {
    consumer_id: null as number | null,
    balance: 0,
    transactions: {
      data: [] as ITransactionsData[],
      total: 0,
    },
  };
}

@State<VendorWalletStateModel>({
  name: 'vendorWallet',
  defaults: {
    vendorWallet: {
      consumer_id: null,
      balance: 0,
      transactions: {
        data: [],
        total: 0,
      },
    },
  },
})
@Injectable()
export class VendorWalletState {
  private notificationService = inject(NotificationService);
  private vendorWalletService = inject(VendorWalletService);

  @Selector()
  static vendorWallet(state: VendorWalletStateModel) {
    return state.vendorWallet;
  }

  @Action(GetVendorTransactionAction)
  getVendorTransaction(
    ctx: StateContext<VendorWalletStateModel>,
    { payload }: GetVendorTransactionAction,
  ) {
    return this.vendorWalletService.getVendorTransaction(payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            vendorWallet: {
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
            vendorWallet: {
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

  @Action(CreditVendorWalletAction)
  credit(_ctx: StateContext<VendorWalletStateModel>, _action: CreditVendorWalletAction) {
    // Credit Logic Here
  }

  @Action(DebitVendorWalletAction)
  debit(_ctx: StateContext<VendorWalletStateModel>, _action: DebitVendorWalletAction) {
    // Debit Logic Here
  }
}
