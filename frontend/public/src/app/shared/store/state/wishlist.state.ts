import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { Product } from '../../interface/product.interface';
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
    const products = (state.wishlist?.data || []).filter(
      (product, index, items) => items.findIndex((item) => item.id === product.id) === index,
    );

    ctx.patchState({
      wishlist: {
        data: products,
        total: products.length,
      },
      wishlistIds: products.map((product) => product.id),
    });
  }

  @Action(AddToWishlist)
  add(ctx: StateContext<WishlistStateModel>, action: AddToWishlist) {
    const state = ctx.getState();
    const product = action.payload['product'];

    if (!product || (state.wishlistIds || []).includes(product.id)) {
      return;
    }

    const updatedProducts = [...(state.wishlist?.data || []), product];

    ctx.patchState({
      wishlist: {
        data: updatedProducts,
        total: updatedProducts.length,
      },
      wishlistIds: updatedProducts.map((item) => item.id),
    });
  }

  @Action(DeleteWishlist)
  delete(ctx: StateContext<WishlistStateModel>, { id }: DeleteWishlist) {
    const state = ctx.getState();
    const items = state.wishlist.data.filter((value) => value.id !== id);
    ctx.patchState({
      wishlist: {
        data: items,
        total: items.length,
      },
      wishlistIds: items.map((item) => item.id),
    });
  }
}
