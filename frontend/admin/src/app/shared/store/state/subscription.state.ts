import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ISubscription } from '../../interface/subscription.interface';
import { SubscriptionService } from '../../services/subscription.service';
import { GetSubscriptionListAction } from '../action/subscription.action';

export class SubscriptionStateModel {
  subscription = {
    data: [] as ISubscription[],
    total: 0,
  };
}

@State<SubscriptionStateModel>({
  name: 'subscription',
  defaults: {
    subscription: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class SubscriptionState {
  private subscriptionService = inject(SubscriptionService);

  @Selector()
  static subscribeList(state: SubscriptionStateModel) {
    return state.subscription;
  }

  @Action(GetSubscriptionListAction)
  getSubscribeList(ctx: StateContext<SubscriptionStateModel>, action: GetSubscriptionListAction) {
    return this.subscriptionService.getSubscribeList(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            subscription: {
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
