import { Component, inject, input, output } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Cart, CartAddOrUpdate } from '../../../../interface/cart.interface';
import { Product, Variation } from '../../../../interface/product.interface';
import { AddToCart, UpdateCart } from '../../../../store/action/cart.action';
import { CartState } from '../../../../store/state/cart.state';
import { Button } from '../../../button/button';

@Component({
  selector: 'app-cart-button',
  standalone: true,
  imports: [Button],
  templateUrl: './cart-button.html',
  styleUrl: './cart-button.scss',
})
export class CartButton {
  product = input<Product>();
  text = input<string>();
  class = input<string>('');
  iconClass = input<string>('');
  selectedVariation = input<Variation | null>();
  enableModal = input<boolean>(false);
  quantity = input<boolean>(false);

  swipeVariants = output<boolean>();

  private store = inject(Store);
  cartItem$: Observable<Cart[]> = this.store.select(CartState.cartItems);

  public cartItem: Cart | null;
  public currentDate: number | null;
  public saleStartDate: number | null;

  ngOnInit() {
    this.cartItem$.subscribe((items) => {
      this.cartItem = items?.find((item) => item.product.id == this.product()?.id)!;
    });
  }

  addToCart(product: Product, qty: number) {
    if (product) {
      const params: CartAddOrUpdate = {
        id:
          this.cartItem &&
          this.selectedVariation() &&
          this.cartItem?.variation &&
          this.selectedVariation()?.id == this.cartItem?.variation?.id
            ? this.cartItem.id
            : null,
        product_id: product?.id!,
        product: product ? product : null,
        variation: this.selectedVariation() ? this.selectedVariation()! : null,
        variation_id: this.selectedVariation()?.id ? this.selectedVariation()?.id! : null,
        quantity: qty,
      };
      this.swipeVariants.emit(false);
      this.store.dispatch(new AddToCart(params));
    }
  }

  updateQuantity(product: Product, qty: number) {
    const params: CartAddOrUpdate = {
      id: this.cartItem ? this.cartItem.id : null,
      product: product,
      product_id: product?.id,
      variation_id: this.cartItem ? this.cartItem?.variation_id : null,
      variation: this.cartItem ? this.cartItem?.variation : null,
      quantity: qty,
    };
    this.store.dispatch(new UpdateCart(params));
  }

  externalProductLink(link: string) {
    if (link) {
      window.open(link, '_blank');
    }
  }

  openModal(_product: Product) {
    this.swipeVariants.emit(true);
  }
}
