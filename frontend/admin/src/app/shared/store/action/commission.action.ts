import { Params } from '../../interface/core.interface';

export class GetCommissionAction {
  static readonly type = '[Commission] Get';
  constructor(public payload?: Params) {}
}
