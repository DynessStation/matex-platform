import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { DashboardService } from '../../services/dashboard.service';
import { GetStatisticsCountAction, GetRevenueChartAction } from '../action/dashboard.action';
import { IStatisticsCount, IRevenueChart } from './../../interface/dashboard.interface';

export class DashboardStateModel {
  statistics: IStatisticsCount | null;
  revenueChart: IRevenueChart | null;
}

@State<DashboardStateModel>({
  name: 'dashboard',
  defaults: {
    statistics: null,
    revenueChart: null,
  },
})
@Injectable()
export class DashboardState {
  private dashboardService = inject(DashboardService);

  @Selector()
  static statistics(state: DashboardStateModel) {
    return state.statistics;
  }

  @Selector()
  static revenueChart(state: DashboardStateModel) {
    return state.revenueChart;
  }

  @Action(GetStatisticsCountAction)
  getStatisticsCount(ctx: StateContext<DashboardStateModel>, action: GetStatisticsCountAction) {
    return this.dashboardService.getStatisticsCount(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            statistics: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetRevenueChartAction)
  getRevenueChart(ctx: StateContext<DashboardStateModel>) {
    return this.dashboardService.getRevenueChart().pipe(
      tap({
        next: result => {
          ctx.patchState({
            revenueChart: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
