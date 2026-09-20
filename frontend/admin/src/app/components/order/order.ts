import { CommonModule } from '@angular/common';
import { Component, inject, Renderer2, DOCUMENT } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IStatisticsCount } from '../../shared/interface/dashboard.interface';
import { IFilterPills, IOrder, IOrderModel } from '../../shared/interface/order.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { GetStatisticsCountAction } from '../../shared/store/action/dashboard.action';
import { GetOrdersAction } from '../../shared/store/action/order.action';
import { DashboardState } from '../../shared/store/state/dashboard.state';
import { OrderState } from '../../shared/store/state/order.state';

@Component({
  selector: 'app-order',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
  ],
  templateUrl: './order.html',
  styleUrl: './order.scss',
})
export class Order {
  private store = inject(Store);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject<Document>(DOCUMENT);

  order$: Observable<IOrderModel> = inject(Store).select(OrderState.order);
  statistics$: Observable<IStatisticsCount> = inject(Store).select(
    DashboardState.statistics,
  ) as Observable<IStatisticsCount>;

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'order_number', dataField: 'order_id' },
      {
        title: 'order_date',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'customer_name', dataField: 'consumer_name' },
      { title: 'total_amount', dataField: 'total', type: 'price' },
      { title: 'payment_status', dataField: 'order_payment_status' },
      { title: 'payment_method', dataField: 'payment_mode' },
    ],
    rowActions: [
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line', permission: 'order.edit' },
    ],
    data: [],
    total: 0,
  };
  public selectedStatus: string;
  public filterPills: IFilterPills[] = [
    {
      id: 1,
      value: 'pending',
      label: 'Pending',
      countKey: 'total_pending_orders',
      color: 'pending',
    },
    {
      id: 2,
      value: 'processing',
      label: 'Processing',
      countKey: 'total_processing_orders',
      color: 'processing',
    },
    {
      id: 3,
      value: 'cancelled',
      label: 'Cancelled',
      countKey: 'total_cancelled_orders',
      color: 'cancel',
    },
    {
      id: 4,
      value: 'shipped',
      label: 'Shipped',
      countKey: 'total_shipped_orders',
      color: 'shipped',
    },
    {
      id: 5,
      value: 'out_for_delivery',
      label: 'Out for delivery',
      countKey: 'total_out_of_delivery_orders',
      color: 'out-delivery',
    },
    {
      id: 6,
      value: 'delivered',
      label: 'Delivered',
      countKey: 'total_delivered_orders',
      color: 'completed',
    },
  ];

  public filter: Params = {};

  ngOnInit() {
    this.order$.subscribe(order => {
      let orders = order?.data?.filter((element: IOrder) => {
        element.order_id = `<span class="fw-bolder">#${element?.order_number}</span>`;
        element.order_payment_status = element?.payment_status
          ? `<div class="status-${element.payment_status.toLowerCase()}"><span>${element.payment_status.replace(/_/g, ' ')}</span></div>`
          : '-';
        element.payment_mode = element?.payment_method
          ? `<div class="payment-mode"><span>${element.payment_method.replace(/_/g, ' ').toUpperCase()}</span></div>`
          : '-';
        element.consumer_name = `<span class="text-capitalize">${element?.consumer?.name}</span>`;
        return element;
      });
      this.tableConfig.data = order ? orders : [];
      this.tableConfig.total = order ? order?.total : 0;
    });

    this.statistics$.subscribe((statistics: IStatisticsCount) => {
      this.filterPills.forEach((status, _index) => {
        const countKey = status.countKey;
        if (statistics && statistics.hasOwnProperty(countKey)) {
          status['count'] = statistics[countKey];
        }
      });
    });

    this.activatedRoute.queryParams.subscribe(params => {
      this.filter = { ...this.filter, status: params['status'] ? params['status'] : '' };
      this.selectedStatus = params['status'];
      this.store.dispatch(new GetOrdersAction(this.filter));
    });
  }

  onTableChange(data?: Params) {
    const startDate = data && data['start_date'] ? data['start_date'] : '';
    const endDate = data && data['end_date'] ? data['end_date'] : '';
    const status = this.selectedStatus ? this.selectedStatus : '';

    this.filter = { ...this.filter, ...data, start_date: startDate, end_date: endDate };
    this.filter['status'] = status;

    this.store.dispatch(new GetOrdersAction(this.filter));
    this.store.dispatch(
      new GetStatisticsCountAction({ start_date: startDate, end_date: endDate, status: status }),
    );
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'view') this.view(action.data);
  }

  view(data: IOrder) {
    void this.router.navigateByUrl(`/order/details/${data.order_number}`);
  }

  filterOrder(status: string) {
    this.renderer.addClass(this.document.body, 'loader-none');
    void this.router.navigate([], {
      queryParams: {
        status: status ? status : null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
