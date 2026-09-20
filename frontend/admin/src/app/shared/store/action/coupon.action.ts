import { Params } from '../../interface/core.interface';
import { ICoupon } from '../../interface/coupon.interface';

export class GetCouponsAction {
  static readonly type = '[Coupon] Get';
  constructor(public payload?: Params) {}
}

export class CreateCouponAction {
  static readonly type = '[Coupon] Create';
  constructor(public payload: ICoupon) {}
}

export class EditCouponAction {
  static readonly type = '[Coupon] Edit';
  constructor(public id: number) {}
}

export class UpdateCouponAction {
  static readonly type = '[Coupon] Update';
  constructor(
    public payload: ICoupon,
    public id: number,
  ) {}
}

export class UpdateCouponStatusAction {
  static readonly type = '[Coupon] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteCouponAction {
  static readonly type = '[Coupon] Delete';
  constructor(public id: number) {}
}

export class DeleteAllCouponAction {
  static readonly type = '[Coupon] Delete All';
  constructor(public ids: number[]) {}
}
