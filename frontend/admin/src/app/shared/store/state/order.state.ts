import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IOrder, IOrderCheckout } from '../../interface/order.interface';
import { IUser } from '../../interface/user.interface';
import { OrderService } from '../../services/order.service';
import { UserService } from '../../services/user.service';
import {
  GetOrdersAction,
  SelectUserAction,
  ViewOrderAction,
  CheckoutAction,
  PlaceOrderAction,
  UpdateOrderStatusAction,
  ClearAction,
  DownloadInvoiceAction,
} from '../action/order.action';

export class OrderStateModel {
  order = {
    data: [] as IOrder[],
    total: 0,
  };
  selectedOrder: IOrder | null;
  selectedUser: IUser | null;
  checkout: IOrderCheckout | null;
}

@State<OrderStateModel>({
  name: 'order',
  defaults: {
    order: {
      data: [],
      total: 0,
    },
    selectedOrder: null,
    selectedUser: null,
    checkout: null,
  },
})
@Injectable()
export class OrderState {
  private router = inject(Router);
  private orderService = inject(OrderService);
  private userService = inject(UserService);

  @Selector()
  static order(state: OrderStateModel) {
    return state.order;
  }

  @Selector()
  static selectedUser(state: OrderStateModel) {
    return state.selectedUser;
  }

  @Selector()
  static selectedOrder(state: OrderStateModel) {
    return state.selectedOrder;
  }

  @Selector()
  static checkout(state: OrderStateModel) {
    return state.checkout;
  }

  @Action(GetOrdersAction)
  getOrders(ctx: StateContext<OrderStateModel>, action: GetOrdersAction) {
    return this.orderService.getOrders(action?.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            order: {
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

  @Action(SelectUserAction)
  selectUser(ctx: StateContext<OrderStateModel>, { id }: SelectUserAction) {
    return this.userService.getUsers().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(order => order.id == id);
          ctx.patchState({
            ...state,
            selectedUser: result,
            checkout: null,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(ViewOrderAction)
  viewOrder(ctx: StateContext<OrderStateModel>, { id }: ViewOrderAction) {
    return this.orderService.getOrders().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(order => Number(order.order_number) == id);
          ctx.patchState({
            ...state,
            selectedOrder: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CheckoutAction)
  checkout(_ctx: StateContext<OrderStateModel>, _action: CheckoutAction) {
    // Checkout Logic Here
  }

  @Action(PlaceOrderAction)
  placeOrder(_ctx: StateContext<OrderStateModel>, _action: PlaceOrderAction) {
    // Place Order Logic Here
  }

  @Action(UpdateOrderStatusAction)
  updateOrderStatus(
    _ctx: StateContext<OrderStateModel>,
    { id: _id, payload: _payload }: UpdateOrderStatusAction,
  ) {
    // Update Order Status Logic Here
  }

  @Action(DownloadInvoiceAction)
  downloadInvoice(_ctx: StateContext<OrderStateModel>, _action: DownloadInvoiceAction) {
    // Download Invoice Logic Here
  }

  @Action(ClearAction)
  clear(ctx: StateContext<OrderStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      ...state,
      selectedUser: null,
      checkout: null,
    });
  }
}
