import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IRefund } from '../../interface/refund.interface';
import { NotificationService } from '../../services/notification.service';
import { RefundService } from '../../services/refund.service';
import { GetRefundAction, UpdateRefundStatusAction } from '../action/refund.action';

export class RefundStateModel {
  refund = {
    data: [] as IRefund[],
    total: 0,
  };
}

@State<RefundStateModel>({
  name: 'refund',
  defaults: {
    refund: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class RefundState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private refundService = inject(RefundService);

  @Selector()
  static refund(state: RefundStateModel) {
    return state.refund;
  }

  @Action(GetRefundAction)
  getRefund(ctx: StateContext<RefundStateModel>, action: GetRefundAction) {
    return this.refundService.getRefunds(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            refund: {
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

  @Action(UpdateRefundStatusAction)
  updateRefundStatus(
    _ctx: StateContext<RefundStateModel>,
    { id: _id, status: _status }: UpdateRefundStatusAction,
  ) {
    // Update Refund Status Logic Here
  }
}
