import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Button } from '../../../shared/components/button/button';
import { NoData } from '../../../shared/components/no-data/no-data';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { Timer } from '../../../shared/components/widgets/timer/timer';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { CartAddOrUpdate, ICart } from '../../../shared/interface/cart.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { ClearCart, DeleteCart, UpdateCart } from '../../../shared/store/action/cart.action';
import { CartState } from '../../../shared/store/state/cart.state';

@Component({
  selector: 'app-cart',
  imports: [
    AsyncPipe,
    NoData,
    RouterLink,
    Button,
    CurrencySymbolPipe,
    Timer,
    Breadcrumb,
    TranslateModule,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private store = inject(Store);

  cartItem$: Observable<ICart[]> = this.store.select(CartState.cartItems);
  cartTotal$: Observable<number> = this.store.select(CartState.cartTotal);
  cartDigital$: Observable<boolean | number | null> = this.store.select(CartState.cartHasDigital);

  public breadcrumb: breadcrumb = {
    title: 'Cart',
    items: [{ label: 'Cart', active: true }],
  };

  updateQuantity(item: ICart, qty: number) {
    const params: CartAddOrUpdate = {
      id: item?.id,
      product: item?.product,
      product_id: item?.product?.id,
      variation: item?.variation,
      variation_id: item?.variation_id ? item?.variation_id : null,
      quantity: qty,
    };
    this.store.dispatch(new UpdateCart(params));
  }

  delete(id: number) {
    this.store.dispatch(new DeleteCart(id));
  }

  clearCart() {
    this.store.dispatch(new ClearCart());
  }
}
