import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { Params } from '../../../shared/interface/core.interface';
import { OrderModel } from '../../../shared/interface/order.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { GetOrders } from '../../../shared/store/action/order.action';
import { OrderState } from '../../../shared/store/state/order.state';

@Component({
  selector: 'app-order',
  imports: [
    AsyncPipe,
    CurrencySymbolPipe,
    TitleCasePipe,
    RouterLink,
    DatePipe,
    NoData,
    TranslateModule,
  ],
  templateUrl: './order.html',
  styleUrl: './order.scss',
})
export class Order {
  private store = inject(Store);
  order$: Observable<OrderModel> = this.store.select(OrderState.order);

  public filter: Params = {
    page: 1, // Current page number
    paginate: 10, // Display per page,
  };

  constructor() {
    this.store.dispatch(new GetOrders(this.filter));
  }

  setPaginate(page: number) {
    this.filter['page'] = page;
    this.store.dispatch(new GetOrders(this.filter));
  }
}
