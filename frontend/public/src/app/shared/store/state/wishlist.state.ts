import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { Product } from '../../interface/product.interface';
import { WishlistService } from '../../services/wishlist.service';
import { AddToWishlist, DeleteWishlist, GetWishlist } from '../action/wishlist.action';

export class WishlistStateModel {
  wishlist = {
    data: [] as Product[],
    total: 0,
  };
  wishlistIds: number[];
}

@State<WishlistStateModel>({
  name: 'wishlist',
  defaults: {
    wishlist: {
      data: [] as Product[],
      total: 0,
    },
    wishlistIds: [],
  },
})
@Injectable()
export class WishlistState {
  router = inject(Router);
  private wishlistService = inject(WishlistService);

  @Selector()
  static wishlistItems(state: WishlistStateModel) {
    return state.wishlist;
  }

  @Selector()
  static wishlistIds(state: WishlistStateModel) {
    return state.wishlistIds;
  }

  @Action(GetWishlist)
  getWishlistItems(ctx: StateContext<WishlistStateModel>) {
    const state = ctx.getState();
    if (state.wishlist?.data?.length > 0) {
      return;
    }
    return this.wishlistService.getWishlistItems().pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            wishlist: {
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

  @Action(AddToWishlist)
  add(ctx: StateContext<WishlistStateModel>, action: AddToWishlist) {
    const state = ctx.getState();
    const product = action.payload['product'];

    const updatedProducts = [...(state.wishlist?.data || []), product];

    ctx.patchState({
      wishlist: {
        data: updatedProducts,
        total: updatedProducts.length,
      },
    });
  }

  @Action(DeleteWishlist)
  delete(ctx: StateContext<WishlistStateModel>, { id }: DeleteWishlist) {
    const state = ctx.getState();
    let item = state.wishlist.data.filter((value) => value.id !== id);
    ctx.patchState({
      wishlist: {
        data: item,
        total: state.wishlist.total - 1,
      },
    });
  }
}
