import { Params } from '../../interface/core.interface';

export class GetOrderStatusAction {
  static readonly type = '[Order Status] Get';
  constructor(public payload?: Params) {}
}
