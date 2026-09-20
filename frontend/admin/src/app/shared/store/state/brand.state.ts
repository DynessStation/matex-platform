import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IBrand } from '../../interface/brand.interface';
import { BrandService } from '../../services/brand.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetBrandsAction,
  CreateBrandAction,
  EditBrandAction,
  UpdateBrandAction,
  UpdateBrandStatusAction,
  DeleteBrandAction,
  DeleteAllBrandAction,
  ExportBrandAction,
  ImportBrandAction,
} from '../action/brand.action';

export class BrandStateModel {
  brand = {
    data: [] as IBrand[],
    total: 0,
  };
  selectedBrand: IBrand | null;
}

@State<BrandStateModel>({
  name: 'brand',
  defaults: {
    brand: {
      data: [],
      total: 0,
    },
    selectedBrand: null,
  },
})
@Injectable()
export class BrandState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private brandService = inject(BrandService);

  @Selector()
  static brand(state: BrandStateModel) {
    return state.brand;
  }

  @Selector()
  static selectedBrand(state: BrandStateModel) {
    return state.selectedBrand;
  }

  @Selector()
  static brands(state: BrandStateModel) {
    return state.brand.data.map(res => {
      return { label: res?.name, value: res?.id };
    });
  }

  @Action(GetBrandsAction)
  getBrands(ctx: StateContext<BrandStateModel>, action: GetBrandsAction) {
    return this.brandService.getBrands(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            brand: {
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

  @Action(CreateBrandAction)
  create(_ctx: StateContext<BrandStateModel>, _action: CreateBrandAction) {
    // Create Brand Logic Here
  }

  @Action(EditBrandAction)
  edit(ctx: StateContext<BrandStateModel>, { id }: EditBrandAction) {
    return this.brandService.getBrands().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(brand => brand.id == id);
          ctx.patchState({
            ...state,
            selectedBrand: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateBrandAction)
  update(_ctx: StateContext<BrandStateModel>, { payload: _payload, id: _id }: UpdateBrandAction) {
    // Update Brand Logic Here
  }

  @Action(UpdateBrandStatusAction)
  updateStatus(
    _ctx: StateContext<BrandStateModel>,
    { id: _id, status: _status }: UpdateBrandStatusAction,
  ) {
    // Update Brand Status Logic Here
  }

  @Action(DeleteBrandAction)
  delete(_ctx: StateContext<BrandStateModel>, { id: _id }: DeleteBrandAction) {
    // Delete Brand Logic Here
  }

  @Action(DeleteAllBrandAction)
  deleteAll(_ctx: StateContext<BrandStateModel>, { ids: _ids }: DeleteAllBrandAction) {
    // Delete All Brand Logic Here
  }

  @Action(ImportBrandAction)
  import(_ctx: StateContext<BrandStateModel>, _action: ImportBrandAction) {
    // Import Brand Logic Here
  }

  @Action(ExportBrandAction)
  export(_ctx: StateContext<BrandStateModel>, _action: ExportBrandAction) {
    // Export Brand Logic Here
  }
}
