import { Component, inject, Input, SimpleChanges } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Button } from '../../../../../../shared/components/button/button';
import { VariantAttributes } from '../../../../../../shared/components/variant-attributes/variant-attributes';
import { Cart, CartAddOrUpdate } from '../../../../../../shared/interface/cart.interface';
import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../../../../shared/pipe/currency.pipe';
import { AddToCart } from '../../../../../../shared/store/action/cart.action';
import { CartState } from '../../../../../../shared/store/state/cart.state';

@Component({
  selector: 'app-sticky-checkout',
  templateUrl: './sticky-checkout.html',
  styleUrls: ['./sticky-checkout.scss'],
  providers: [CurrencySymbolPipe],
  imports: [VariantAttributes, Button, CurrencySymbolPipe, TranslateModule],
})
export class StickyCheckout {
  private store = inject(Store);

  @Input() product: Product;

  cartItem$: Observable<Cart[]> = inject(Store).select(CartState.cartItems);

  public cartItem: Cart | null;
  public productQty: number = 1;
  public selectedVariation: Variation | null;

  ngOnInit() {
    this.cartItem$.subscribe((items) => {
      if (!this.product) return;
      this.cartItem = items.find((item) => item.product.id === this.product.id) || null;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && changes['product'].currentValue) {
      this.product = changes['product']?.currentValue;
    }
  }

  selectVariation(variation: Variation) {
    this.selectedVariation = variation;
  }

  updateQuantity(qty: number) {
    if (1 > this.productQty + qty) return;
    this.productQty = this.productQty + qty;
    this.checkStockAvailable();
  }

  checkStockAvailable() {
    if (this.selectedVariation) {
      this.selectedVariation['stock_status'] =
        this.selectedVariation?.quantity < this.productQty ? 'out_of_stock' : 'in_stock';
    } else {
      this.product['stock_status'] =
        this.product.quantity < this.productQty ? 'out_of_stock' : 'in_stock';
    }
  }

  addToCart(product: Product) {
    if (product) {
      const params: CartAddOrUpdate = {
        id: this.cartItem ? this.cartItem.id : null,
        product_id: product?.id!,
        product: product ? product : null,
        variation: this.selectedVariation ? this.selectedVariation : null,
        variation_id: this.selectedVariation?.id ? this.selectedVariation?.id! : null,
        quantity: this.productQty,
      };
      this.store.dispatch(new AddToCart(params));
    }
  }
}
