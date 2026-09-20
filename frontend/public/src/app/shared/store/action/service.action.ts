import { Params } from '../../interface/core.interface';

export class GetServices {
  static readonly type = '[Service] Get';
  constructor(public payload?: Params) {}
}
