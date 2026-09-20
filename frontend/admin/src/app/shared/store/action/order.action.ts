import { Params } from '../../interface/core.interface';
import { ICheckoutPayload } from '../../interface/order.interface';

export class GetOrdersAction {
  static readonly type = '[Order] Get';
  constructor(public payload?: Params) {}
}

export class SelectUserAction {
  static readonly type = '[Order] User';
  constructor(public id: number) {}
}

export class ViewOrderAction {
  static readonly type = '[Order] View';
  constructor(public id: number) {}
}

export class CheckoutAction {
  static readonly type = '[Order] Checkout';
  constructor(public payload: ICheckoutPayload) {}
}

export class PlaceOrderAction {
  static readonly type = '[Order] Place';
  constructor(public payload: ICheckoutPayload) {}
}

export class UpdateOrderStatusAction {
  static readonly type = '[Order] Update Status';
  constructor(
    public id: number,
    public payload: { order_status_id: number; note: string; changed_at: string },
  ) {}
}

export class DownloadInvoiceAction {
  static readonly type = '[Order] Invoice';
  constructor(public payload: Params) {}
}

export class ClearAction {
  static readonly type = '[Order] Clear';
  constructor() {}
}
