import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { Service } from '../../interface/service.interface';
import { ServiceService } from '../../services/service.service';
import { GetServices } from '../action/service.action';

export class ServiceStateModel {
  service = {
    data: [] as Service[],
    total: 0,
  };
}

@State<ServiceStateModel>({
  name: 'service',
  defaults: {
    service: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class ServiceState {
  constructor(private serviceService: ServiceService) {}

  @Selector()
  static service(state: ServiceStateModel) {
    return state.service;
  }

  @Action(GetServices)
  getService(ctx: StateContext<ServiceStateModel>, action: GetServices) {
    return this.serviceService.getService(action.payload).pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            service: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
