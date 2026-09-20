import { Params } from '../../interface/core.interface';

export class GetWithdrawRequestAction {
  static readonly type = '[Withdraw] Get';
  constructor(public payload?: Params) {}
}

export class UpdateWithdrawStatusAction {
  static readonly type = '[Withdraw] Update';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class WithdrawRequestAction {
  static readonly type = '[Withdraw] Request';
  constructor(public payload: Params) {}
}
