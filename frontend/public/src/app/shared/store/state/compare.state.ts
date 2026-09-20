import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { ToastrService } from 'ngx-toastr';
import { tap } from 'rxjs';

import { Product } from '../../interface/product.interface';
import { AuthService } from '../../services/auth.service';
import { CompareService } from '../../services/compare.service';
import { NotificationService } from '../../services/notification.service';
import { AddToCompare, DeleteCompare, GetCompare } from '../action/compare.action';

export class CompareStateModel {
  items: Product[];
  total: number;
  comparIds: number[];
}

@State<CompareStateModel>({
  name: 'compare',
  defaults: {
    items: [],
    total: 0,
    comparIds: [],
  },
})
@Injectable()
export class CompareState {
  private store = inject(Store);
  router = inject(Router);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);
  private compareService = inject(CompareService);
  private toast = inject(ToastrService);

  @Selector()
  static compareItems(state: CompareStateModel) {
    return state.items;
  }

  @Selector()
  static compareIds(state: CompareStateModel) {
    return state.comparIds;
  }

  @Selector()
  static compareTotal(state: CompareStateModel) {
    return state.total;
  }

  @Action(GetCompare)
  getCompareItems(ctx: StateContext<CompareStateModel>) {
    const state = ctx.getState().items;

    return this.compareService.getComparItems().pipe(
      tap((result) => {
        const productId = result.data.filter((p) => !state.some((pi) => pi.id === p.id));
        const productItem = [...state, ...productId];

        ctx.patchState({
          items: productItem,
          total: productItem.length,
          comparIds: productItem.map((p) => p.id),
        });
      }),
    );
  }

  @Action(AddToCompare)
  add(ctx: StateContext<CompareStateModel>, action: AddToCompare) {
    const state = ctx.getState();
    const product: Product = action.payload['product'];

    // Prevent duplicates
    const alreadyExists = state.items.some((item) => item.id === product.id);
    if (alreadyExists) {
      this.toast.info(
        `
          <i class="ri-information-line"></i>
          This item is already in Compare List!
        `,
        '',
        {
          enableHtml: true,
          toastClass: 'ngx-toastr my-toast',
        },
      );

      return;
    }

    // Merge new product with existing items
    const updatedItems = [...state.items, product];
    const updatedIds = updatedItems.map((p) => p.id);

    ctx.patchState({
      items: updatedItems,
      comparIds: updatedIds,
      total: updatedItems.length,
    });

    this.toast.success(
      `
        <i class="ri-check-line"></i>
        Added to Compare List!
      `,
      '',
      {
        enableHtml: true,
        toastClass: 'ngx-toastr my-toast',
      },
    );
  }

  @Action(DeleteCompare)
  delete(ctx: StateContext<CompareStateModel>, action: DeleteCompare) {
    const state = ctx.getState();

    const updatedItems = state.items.filter((item) => item.id !== action.id);
    const updatedIds = updatedItems.map((p) => p.id);

    ctx.patchState({
      items: updatedItems,
      comparIds: updatedIds,
      total: updatedItems.length,
    });

    this.toast.error(
      `
        <i class="ri-error-warning-line"></i>
        Removed from Compare List!
      `,
      '',
      {
        enableHtml: true,
        toastClass: 'ngx-toastr my-toast',
      },
    );
  }
}
