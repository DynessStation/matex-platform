import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IOrderStatus } from '../../interface/order-status.interface';
import { OrderStatusService } from '../../services/order-status.service';
import { GetOrderStatusAction } from '../action/order-status.action';

export class OrderStatusStateModel {
  orderStatus = {
    data: [] as IOrderStatus[],
    total: 0,
  };
  selectedOrderStatus: IOrderStatus | null;
}

@State<OrderStatusStateModel>({
  name: 'orderStatus',
  defaults: {
    orderStatus: {
      data: [],
      total: 0,
    },
    selectedOrderStatus: null,
  },
})
@Injectable()
export class OrderStatusState {
  private orderStatusService = inject(OrderStatusService);

  @Selector()
  static orderStatus(state: OrderStatusStateModel) {
    return state.orderStatus;
  }

  @Selector()
  static orderStatuses(state: OrderStatusStateModel) {
    return state.orderStatus.data.map(res => {
      return { label: res?.name.replaceAll('_', ' '), value: res?.id };
    });
  }

  @Selector()
  static selectedOrderStatus(state: OrderStatusStateModel) {
    return state.selectedOrderStatus;
  }

  @Action(GetOrderStatusAction)
  getOrderStatus(ctx: StateContext<OrderStatusStateModel>, action: GetOrderStatusAction) {
    return this.orderStatusService.getOrderStatus(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            orderStatus: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
