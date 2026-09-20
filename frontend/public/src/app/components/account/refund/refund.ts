import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { Params } from '../../../shared/interface/core.interface';
import { RefundModel } from '../../../shared/interface/refund.interface';
import { GetRefund } from '../../../shared/store/action/refund.action';
import { RefundState } from '../../../shared/store/state/refund.state';

@Component({
  selector: 'app-refund',
  imports: [AsyncPipe, NoData, TitleCasePipe, DatePipe, PaginationComponent, TranslateModule],
  templateUrl: './refund.html',
  styleUrl: './refund.scss',
})
export class Refund {
  private store = inject(Store);
  refund$: Observable<RefundModel> = this.store.select(RefundState.refund);

  public filter: Params = {
    page: 1, // Current page number
    paginate: 10, // Display per page,
  };

  constructor() {
    this.store.dispatch(new GetRefund(this.filter));
  }

  setPaginate(page: number) {
    this.filter['page'] = page;
    this.store.dispatch(new GetRefund(this.filter));
  }
}
