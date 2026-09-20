import { Params } from '../../interface/core.interface';

export class GetRefundAction {
  static readonly type = '[Refund] Get';
  constructor(public payload?: Params) {}
}

export class UpdateRefundStatusAction {
  static readonly type = '[Refund] Put';
  constructor(
    public id: number,
    public status: string,
  ) {}
}
