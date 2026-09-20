import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { Params } from '../../../shared/interface/core.interface';
import { IWallet } from '../../../shared/interface/wallet.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { GetUserTransaction } from '../../../shared/store/action/wallet.action';
import { WalletState } from '../../../shared/store/state/wallet.state';

@Component({
  selector: 'app-wallet',
  imports: [
    AsyncPipe,
    CurrencySymbolPipe,
    NoData,
    TitleCasePipe,
    DatePipe,
    TranslateModule,
    PaginationComponent,
  ],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss',
})
export class Wallet {
  private store = inject(Store);

  wallet$: Observable<IWallet | any> = this.store.select(WalletState.wallet);

  public filter: Params = {
    page: 1, // Current page number
    paginate: 10, // Display per page,
  };

  constructor() {
    this.store.dispatch(new GetUserTransaction(this.filter));
  }

  setPaginate(page: number) {
    this.filter['page'] = page;
    this.store.dispatch(new GetUserTransaction(this.filter));
  }
}
