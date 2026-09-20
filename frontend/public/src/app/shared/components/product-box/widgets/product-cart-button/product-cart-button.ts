import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { CartAddOrUpdate, ICart } from '../../../../interface/cart.interface';
import { Product } from '../../../../interface/product.interface';
import { AddToCart } from '../../../../store/action/cart.action';
import { CartState } from '../../../../store/state/cart.state';

@Component({
  selector: 'app-product-cart-button',
  imports: [],
  templateUrl: './product-cart-button.html',
  styleUrl: './product-cart-button.scss',
})
export class ProductCartButton {
  private store = inject(Store);
  class = input<string>('btn cart-button');

  readonly product = input<Product>();
  readonly type = input<string>();

  cartItem$: Observable<ICart[]> = inject(Store).select(CartState.cartItems);

  public cartItem: ICart | null;

  ngOnInit() {
    this.cartItem$.subscribe((items) => {
      this.cartItem = items?.find((item) => item.product.id == this.product()?.id) || null;
    });
  }

  addToCart(product: Product, qty: number) {
    const params: CartAddOrUpdate = {
      id: this.cartItem ? this.cartItem.id : null,
      product: product,
      product_id: product?.id,
      variation_id: this.cartItem ? this.cartItem?.variation_id : null,
      variation: this.cartItem ? this.cartItem?.variation : null,
      quantity: qty,
    };
    this.store.dispatch(new AddToCart(params));
  }
}
