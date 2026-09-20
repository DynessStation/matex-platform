import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { Params } from '../../../shared/interface/core.interface';
import { IPoint } from '../../../shared/interface/point.interface';
import { Values } from '../../../shared/interface/setting.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { GetUserTransaction } from '../../../shared/store/action/wallet.action';
import { PointState } from '../../../shared/store/state/point.state';
import { SettingState } from '../../../shared/store/state/setting.state';

@Component({
  selector: 'app-point',
  imports: [
    AsyncPipe,
    CurrencySymbolPipe,
    PaginationComponent,
    NoData,
    TitleCasePipe,
    DatePipe,
    TranslateModule,
  ],
  templateUrl: './point.html',
  styleUrl: './point.scss',
})
export class Point {
  private store = inject(Store);

  setting$: Observable<Values | null> = this.store.select(SettingState.setting);

  point$: Observable<IPoint | any> = this.store.select(PointState.point);

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
