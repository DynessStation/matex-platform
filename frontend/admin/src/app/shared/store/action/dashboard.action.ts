import { Params } from '../../interface/core.interface';

export class GetStatisticsCountAction {
  static readonly type = '[Dashboard] Statistics Count Get';
  constructor(public payload?: Params) {}
}

export class GetRevenueChartAction {
  static readonly type = '[Dashboard] Revenue Get';
}
