import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Button } from '../../../shared/components/button/button';
import { NoData } from '../../../shared/components/no-data/no-data';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { CartAddOrUpdate, ICart } from '../../../shared/interface/cart.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { ClearCart, DeleteCart, UpdateCart } from '../../../shared/store/action/cart.action';
import { CartState } from '../../../shared/store/state/cart.state';

@Component({
  selector: 'app-cart',
  imports: [AsyncPipe, NoData, RouterLink, Button, CurrencySymbolPipe, Breadcrumb],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private store = inject(Store);
  public navigation = inject(PublicNavigationContextService);

  cartItem$: Observable<ICart[]> = this.store.select(CartState.cartItems);
  cartTotal$: Observable<number> = this.store.select(CartState.cartTotal);
  get isEnglish(): boolean {
    return this.navigation.locale() === 'en-US';
  }

  get breadcrumb(): breadcrumb {
    const title = this.isEnglish ? 'Cart' : 'Keranjang';
    return { title, items: [{ label: title, active: true }] };
  }

  get catalogPath(): string {
    return this.isEnglish ? '/en/catalog' : '/katalog';
  }

  productPath(slug: string): string {
    return this.isEnglish ? `/en/product/${slug}` : `/produk/${slug}`;
  }

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
