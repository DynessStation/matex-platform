import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { of, tap } from 'rxjs';

import { ICart } from '../../interface/cart.interface';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import {
  AddToCartAction,
  ClearCartAction,
  DeleteCartAction,
  GetCartItemsAction,
  UpdateCartAction,
} from '../action/cart.action';

export interface CartStateModel {
  is_digital_only: boolean | number | null;
  items: ICart[];
  total: number;
}

@State<CartStateModel>({
  name: 'cart',
  defaults: {
    is_digital_only: null,
    items: [],
    total: 0,
  },
})
@Injectable()
export class CartState {
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private store = inject(Store);

  @Selector()
  static cartItems(state: CartStateModel) {
    return state.items;
  }

  @Selector()
  static cartTotal(state: CartStateModel) {
    return state.total;
  }

  @Selector()
  static cartHasDigital(state: CartStateModel) {
    return state.is_digital_only;
  }

  @Action(GetCartItemsAction)
  getCartItems(ctx: StateContext<CartStateModel>) {
    return this.cartService.getCartItems().pipe(
      tap({
        next: result => {
          ctx.patchState(result);
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(AddToCartAction)
  add(ctx: StateContext<CartStateModel>, action: AddToCartAction) {
    if (action.payload.id) {
      this.store.dispatch(new UpdateCartAction(action.payload));
    } else {
      let salePrice = action.payload.variation
        ? action.payload.variation.sale_price
        : action.payload.product?.sale_price;
      let result: any = {
        items: [
          {
            id: Number(
              Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, '0'),
            ), // Generate Random Id
            quantity: action.payload.quantity,
            sub_total: salePrice ? salePrice * action.payload.quantity : 0,
            product: action.payload.product!,
            product_id: action.payload.product_id,
            variation: action.payload.variation!,
            variation_id: action.payload ? action.payload.variation_id : null,
          },
        ],
      };

      const state = ctx.getState();
      const cart = [...state.items];
      const index = cart.findIndex(item => item.id === result.items[0].id);

      let output = { ...state };

      if (index == -1) {
        output.items = [...state.items, ...result.items];
      }

      // Calculate Total
      output.total = output.items.reduce((prev, curr: ICart) => {
        return prev + Number(curr.sub_total);
      }, 0);

      ctx.patchState(output);
    }
  }

  @Action(UpdateCartAction)
  update(ctx: StateContext<CartStateModel>, action: UpdateCartAction) {
    const state = ctx.getState();
    const cart = [...state.items];
    const index = cart.findIndex(item => item.id === action.payload.id);
    const productQty = cart[index]?.variation
      ? cart[index]?.variation?.quantity
      : cart[index]?.product?.quantity;

    if (productQty < cart[index]?.quantity + action?.payload.quantity) {
      this.notificationService.showError(
        `You cannot add more than ${productQty} items available in stock.`,
      );
      return false;
    }

    cart[index].quantity = cart[index]?.quantity + action?.payload.quantity;

    if (cart[index].product?.wholesales?.length) {
      let wholesale =
        cart[index].product.wholesales.find(
          value => value.min_qty <= cart[index].quantity && value.max_qty >= cart[index].quantity,
        ) || null;
      if (wholesale && cart[index].product.wholesale_price_type == 'fixed') {
        cart[index].sub_total = cart[index].quantity * wholesale.value;
        cart[index].wholesale_price = cart[index].sub_total / cart[index].quantity;
      } else if (wholesale && cart[index].product.wholesale_price_type == 'percentage') {
        cart[index].sub_total =
          cart[index].quantity *
          (cart[index]?.variation
            ? cart[index]?.variation?.sale_price
            : cart[index].product.sale_price);
        cart[index].sub_total =
          cart[index].sub_total - cart[index].sub_total * (wholesale.value / 100);
        cart[index].wholesale_price = cart[index].sub_total / cart[index].quantity;
      } else {
        cart[index].sub_total =
          cart[index]?.quantity *
          (cart[index]?.variation
            ? cart[index]?.variation?.sale_price
            : cart[index].product.sale_price);
        cart[index].wholesale_price = null;
      }
    } else {
      cart[index].sub_total =
        cart[index]?.quantity *
        (cart[index]?.variation
          ? cart[index]?.variation?.sale_price
          : cart[index].product.sale_price);
      cart[index].wholesale_price = null;
    }

    if (cart[index].quantity < 1) {
      this.store.dispatch(new DeleteCartAction(action.payload.id!));
      return of();
    }

    let total = state.items.reduce((prev, curr: ICart) => {
      return prev + Number(curr.sub_total);
    }, 0);

    ctx.patchState({
      ...state,
      total: total,
    });

    return true;
  }

  @Action(DeleteCartAction)
  delete(ctx: StateContext<CartStateModel>, { id }: DeleteCartAction) {
    const state = ctx.getState();
    let cart = state.items.filter(value => value.id !== id);
    let total = state.items.reduce((prev, curr: ICart) => {
      return prev + Number(curr.sub_total);
    }, 0);
    ctx.patchState({
      items: cart,
      total: total,
    });
    return true;
  }

  @Action(ClearCartAction)
  clearCart(ctx: StateContext<CartStateModel>) {
    ctx.patchState({
      items: [],
      total: 0,
    });
  }
}
