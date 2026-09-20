import { Component, inject } from '@angular/core';
import { Params } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { ISubscription, ISubscriptionModel } from '../../shared/interface/subscription.interface';
import { ITableConfig } from '../../shared/interface/table.interface';
import { GetSubscriptionListAction } from '../../shared/store/action/subscription.action';
import { SubscriptionState } from '../../shared/store/state/subscription.state';

@Component({
  selector: 'app-subscription',
  imports: [PageWrapper, Table],
  templateUrl: './subscription.html',
  styleUrl: './subscription.scss',
})
export class Subscription {
  private store = inject(Store);

  subscribe$: Observable<ISubscriptionModel> = inject(Store).select(
    SubscriptionState.subscribeList,
  );

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'email', dataField: 'email', sortable: true, sort_direction: 'desc' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
    ],
    data: [] as ISubscription[],
    total: 0,
  };

  ngOnInit() {
    this.subscribe$.subscribe(subscribe => {
      this.tableConfig.data = subscribe ? subscribe?.data : [];
      this.tableConfig.total = subscribe ? subscribe?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetSubscriptionListAction(data!));
  }
}
