import { CommonModule } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';
import { Params } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { WithdrawRequestModal } from './withdraw-request-modal/withdraw-request-modal';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { PayoutModal } from '../../shared/components/ui/modal/payout-modal/payout-modal';
import { Table } from '../../shared/components/ui/table/table';
import { IValues } from '../../shared/interface/setting.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { ITransactionsData } from '../../shared/interface/vendor-wallet.interface';
import { IWithdrawal, IWithdrawalModel } from '../../shared/interface/withdrawal.interface';
import { CurrencySymbolPipe } from '../../shared/pipe/currency-symbol.pipe';
import { GetVendorTransactionAction } from '../../shared/store/action/vendor-wallet.action';
import {
  GetWithdrawRequestAction,
  UpdateWithdrawStatusAction,
} from '../../shared/store/action/withdrawal.action';
import { AccountState } from '../../shared/store/state/account.state';
import { SettingState } from '../../shared/store/state/setting.state';
import { VendorWalletState } from '../../shared/store/state/vendor-wallet.state';
import { WithdrawalState } from '../../shared/store/state/withdrawal.state';

@Component({
  selector: 'app-withdrawal',
  imports: [
    CommonModule,
    TranslateModule,
    CurrencySymbolPipe,
    PageWrapper,
    Table,
    PayoutModal,
    WithdrawRequestModal,
  ],
  templateUrl: './withdrawal.html',
  styleUrl: './withdrawal.scss',
})
export class Withdrawal {
  private store = inject(Store);

  withdrawal$: Observable<IWithdrawalModel> = inject(Store).select(WithdrawalState.withdrawal);
  wallet$: Observable<{
    consumer_id: number | null;
    balance: number;
    transactions: { data: ITransactionsData[]; total: number };
  }> = inject(Store).select(VendorWalletState.vendorWallet);
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;
  roleName$: Observable<string> = inject(Store).select(
    AccountState.getRoleName,
  ) as Observable<string>;

  readonly PayoutModal = viewChild<PayoutModal>('payoutModal');
  readonly RequestModal = viewChild<WithdrawRequestModal>('requestModal');

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'name', dataField: 'vendor_name', sortable: true, sort_direction: 'desc' },
      { title: 'amount', dataField: 'amount', type: 'price' },
      { title: 'status', dataField: 'withdrawal_status' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
    ],
    rowActions: [{ label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' }],
    data: [] as IWithdrawal[],
    total: 0,
  };

  constructor() {
    if (this.store.selectSnapshot(state => state.account.roleName === 'vendor')) {
      this.store.dispatch(new GetVendorTransactionAction());
    }
  }

  ngOnInit() {
    this.withdrawal$.subscribe(withdrawal => {
      let withdrawals = withdrawal?.data?.filter((element: IWithdrawal) => {
        element.vendor_name = element?.user?.name;
        element.withdrawal_status = element.status
          ? `<div class="status-${element.status}"><span>${element.status.replace(/_/g, ' ')}</span></div>`
          : '-';
        return element;
      });
      this.tableConfig.data = withdrawal ? withdrawals : [];
      this.tableConfig.total = withdrawal ? withdrawal?.total : 0;
    });
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'view') void this.PayoutModal().openModal(action.data);
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetWithdrawRequestAction(data));
  }

  approved(event: any) {
    this.store.dispatch(new UpdateWithdrawStatusAction(event.data.id, event.status));
  }
}
