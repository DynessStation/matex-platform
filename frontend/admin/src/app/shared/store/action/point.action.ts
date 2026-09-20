import { Params } from '../../interface/core.interface';
import { IPoint } from '../../interface/point.interface';

export class GetUserTransactionAction {
  static readonly type = '[Point] Transaction Get';
  constructor(public payload?: Params) {}
}

export class CreditPointAction {
  static readonly type = '[Point] Credit';
  constructor(public payload: IPoint) {}
}

export class DebitPointAction {
  static readonly type = '[Point] Debit';
  constructor(public payload: IPoint) {}
}
