import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ICoupon } from '../../interface/coupon.interface';
import { CouponService } from '../../services/coupon.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetCouponsAction,
  CreateCouponAction,
  EditCouponAction,
  UpdateCouponAction,
  UpdateCouponStatusAction,
  DeleteCouponAction,
  DeleteAllCouponAction,
} from '../action/coupon.action';

export class CouponStateModel {
  coupon = {
    data: [] as ICoupon[],
    total: 0,
  };
  selectedCoupon: ICoupon | null;
}

@State<CouponStateModel>({
  name: 'coupon',
  defaults: {
    coupon: {
      data: [],
      total: 0,
    },
    selectedCoupon: null,
  },
})
@Injectable()
export class CouponState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private couponService = inject(CouponService);

  @Selector()
  static coupon(state: CouponStateModel) {
    return state.coupon;
  }

  @Selector()
  static selectedCoupon(state: CouponStateModel) {
    return state.selectedCoupon;
  }

  @Selector()
  static coupons(state: CouponStateModel) {
    return state.coupon.data.map(coupon => {
      return { label: coupon?.title, value: coupon?.id };
    });
  }

  @Action(GetCouponsAction)
  getCoupons(ctx: StateContext<CouponStateModel>, action: GetCouponsAction) {
    return this.couponService.getCoupons(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            coupon: {
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

  @Action(CreateCouponAction)
  create(_ctx: StateContext<CouponStateModel>, _action: CreateCouponAction) {
    // Create coupon logic here
  }

  @Action(EditCouponAction)
  edit(ctx: StateContext<CouponStateModel>, { id }: EditCouponAction) {
    return this.couponService.getCoupons().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(coupon => coupon.id == id);
          ctx.patchState({
            ...state,
            selectedCoupon: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateCouponAction)
  update(_ctx: StateContext<CouponStateModel>, { payload: _payload, id: _id }: UpdateCouponAction) {
    // Update coupon logic here
  }

  @Action(UpdateCouponStatusAction)
  updateStatus(
    _ctx: StateContext<CouponStateModel>,
    { id: _id, status: _status }: UpdateCouponStatusAction,
  ) {
    // Update coupon status logic here
  }

  @Action(DeleteCouponAction)
  delete(_ctx: StateContext<CouponStateModel>, { id: _id }: DeleteCouponAction) {
    // Delete coupon logic here
  }

  @Action(DeleteAllCouponAction)
  deleteAll(_ctx: StateContext<CouponStateModel>, { ids: _ids }: DeleteAllCouponAction) {
    // Delete all coupon logic here
  }
}
