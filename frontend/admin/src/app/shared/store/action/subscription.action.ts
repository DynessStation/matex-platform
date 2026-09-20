import { Params } from '../../interface/core.interface';

export class GetSubscriptionListAction {
  static readonly type = '[Subscription] Get';
  constructor(public payload?: Params) {}
}
