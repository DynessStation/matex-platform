import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Button } from '../../../../../../shared/components/button/button';
import { Cart, CartAddOrUpdate } from '../../../../../../shared/interface/cart.interface';
import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { Values } from '../../../../../../shared/interface/setting.interface';
import { CurrencySymbolPipe } from '../../../../../../shared/pipe/currency.pipe';
import { AddToCart } from '../../../../../../shared/store/action/cart.action';
import { SettingState } from '../../../../../../shared/store/state/setting.state';

@Component({
  selector: 'app-product-buy-button',
  imports: [Button, CurrencySymbolPipe, TranslateModule],
  templateUrl: './product-buy-button.html',
  styleUrl: './product-buy-button.scss',
})
export class ProductBuyButton {
  product = input<Product | null>(null);
  selectedVariation = input<Variation | null>(null);

  public productQty: number = 1;
  public shippingFreeAmt: number = 0;
  public totalPrice: number = 0;
  public cartItem: Cart | null;

  private store = inject(Store);
  setting$: Observable<Values | null> = this.store.select(SettingState.setting);

  constructor(
    private router: Router,
    private modal: NgbModal,
  ) {
    this.setting$.subscribe(
      (setting) => (this.shippingFreeAmt = setting?.general?.min_order_free_shipping!),
    );
  }
  updateQuantity(qty: number) {
    if (1 > this.productQty + qty) return;
    this.productQty = this.productQty + qty;

    this.wholesalePriceCal();
  }

  addToCart(product: Product, buyNow?: boolean) {
    if (product) {
      const params: CartAddOrUpdate = {
        id:
          this.cartItem &&
          this.selectedVariation() &&
          this.cartItem?.variation &&
          this.selectedVariation()?.id == this.cartItem?.variation?.id
            ? this.cartItem.id
            : null,
        product_id: product?.id,
        product: product ? product : null,
        variation: this.selectedVariation() ? (this.selectedVariation() as Variation) : null,
        variation_id: this.selectedVariation()?.id ? this.selectedVariation()?.id! : null,
        quantity: this.productQty,
      };

      this.store.dispatch(new AddToCart(params)).subscribe({
        complete: () => {
          if (buyNow) {
            void this.router.navigate(['/checkout']);
          }
        },
      });
    }
  }

  contactSales() {
    const english = this.router.url === '/en' || this.router.url.startsWith('/en/');
    void this.router.navigate([english ? '/en/contact-us' : '/contact-us']);
  }

  wholesalePriceCal() {
    const product = this.product();
    const selectedVariation = this.selectedVariation();

    if (!product) return;

    const wholesale =
      product.wholesales?.find(
        (value) => value.min_qty <= this.productQty && value.max_qty >= this.productQty,
      ) || null;

    const basePrice = selectedVariation ? selectedVariation.sale_price : product.sale_price;

    if (wholesale) {
      if (product.wholesale_price_type === 'fixed') {
        this.totalPrice = this.productQty * wholesale.value;
      } else if (product.wholesale_price_type === 'percentage') {
        this.totalPrice = this.productQty * basePrice;
        this.totalPrice -= this.totalPrice * (wholesale.value / 100);
      }
    } else {
      this.totalPrice = this.productQty * basePrice;
    }
  }

  externalProductLink(link: string) {
    if (link) {
      window.open(link, '_blank');
    }
  }
}
