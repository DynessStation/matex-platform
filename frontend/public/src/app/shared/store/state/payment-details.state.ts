import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { PaymentDetails } from '../../interface/payment-details.interface';
import { PaymentDetailsService } from '../../services/payment-details.service';
import { GetPaymentDetails, UpdatePaymentDetails } from '../action/payment-details.action';

export class PaymentDetailsStateModel {
  paymentDetails: PaymentDetails | null;
}

@State<PaymentDetailsStateModel>({
  name: 'paymentDetails',
  defaults: {
    paymentDetails: null,
  },
})
@Injectable()
export class PaymentDetailsState {
  constructor(private PaymentDetailsService: PaymentDetailsService) {}

  @Selector()
  static paymentDetails(state: PaymentDetailsStateModel) {
    return state.paymentDetails;
  }

  @Action(GetPaymentDetails)
  getPaymentDetails(ctx: StateContext<PaymentDetailsStateModel>) {
    return this.PaymentDetailsService.getPaymentAccount().pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            paymentDetails: result,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdatePaymentDetails)
  updatePaymentDetails(
    _ctx: StateContext<PaymentDetailsStateModel>,
    _action: UpdatePaymentDetails,
  ) {
    // Update Payment Details Logic Here
  }
}
