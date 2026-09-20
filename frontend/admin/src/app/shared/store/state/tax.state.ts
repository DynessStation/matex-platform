import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ITax } from '../../interface/tax.interface';
import { NotificationService } from '../../services/notification.service';
import { TaxService } from '../../services/tax.service';
import {
  GetTaxesAction,
  CreateTaxAction,
  EditTaxAction,
  UpdateTaxAction,
  UpdateTaxStatusAction,
  DeleteTaxAction,
  DeleteAllTaxAction,
} from '../action/tax.action';

export class TaxStateModel {
  tax = {
    data: [] as ITax[],
    total: 0,
  };
  selectedTax: ITax | null;
}

@State<TaxStateModel>({
  name: 'tax',
  defaults: {
    tax: {
      data: [],
      total: 0,
    },
    selectedTax: null,
  },
})
@Injectable()
export class TaxState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private taxService = inject(TaxService);

  @Selector()
  static tax(state: TaxStateModel) {
    return state.tax;
  }

  @Selector()
  static taxes(state: TaxStateModel) {
    return state.tax.data.map((tax: ITax) => {
      return { label: tax?.name, value: tax?.id };
    });
  }

  @Selector()
  static selectedTax(state: TaxStateModel) {
    return state.selectedTax;
  }

  @Action(GetTaxesAction)
  getTaxes(ctx: StateContext<TaxStateModel>, action: GetTaxesAction) {
    return this.taxService.getTaxes(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            tax: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateTaxAction)
  create(_ctx: StateContext<TaxStateModel>, _action: CreateTaxAction) {
    // Create Tax Logic Here
  }

  @Action(EditTaxAction)
  edit(ctx: StateContext<TaxStateModel>, { id }: EditTaxAction) {
    return this.taxService.getTaxes().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(tax => tax.id == id);
          ctx.patchState({
            ...state,
            selectedTax: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateTaxAction)
  update(_ctx: StateContext<TaxStateModel>, { payload: _payload, id: _id }: UpdateTaxAction) {
    // Update Tax Logic Here
  }

  @Action(UpdateTaxStatusAction)
  updateStatus(
    _ctx: StateContext<TaxStateModel>,
    { id: _id, status: _status }: UpdateTaxStatusAction,
  ) {
    // Update Tax Status Logic Here
  }

  @Action(DeleteTaxAction)
  delete(_ctx: StateContext<TaxStateModel>, { id: _id }: DeleteTaxAction) {
    // Delete Tax Logic Here
  }

  @Action(DeleteAllTaxAction)
  deleteAll(_ctx: StateContext<TaxStateModel>, { ids: _ids }: DeleteAllTaxAction) {
    // Delete All Tax Logic Here
  }
}
