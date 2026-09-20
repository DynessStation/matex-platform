import { Component, inject, input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, take } from 'rxjs';

import { Button } from '../../../../../../shared/components/button/button';
import { Cart, CartAddOrUpdate } from '../../../../../../shared/interface/cart.interface';
import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../../../../shared/pipe/currency.pipe';
import { AddToCart } from '../../../../../../shared/store/action/cart.action';
import { CartState } from '../../../../../../shared/store/state/cart.state';
import { ProductState } from '../../../../../../shared/store/state/product.state';

@Component({
  selector: 'app-product-bundle',
  imports: [RouterLink, Button, NgbModule, CurrencySymbolPipe, TranslateModule],
  templateUrl: './product-bundle.html',
  styleUrl: './product-bundle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBundle {
  product = input<Product | null>();

  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);

  crossSellProduct$: Observable<Product[]> = this.store.select(ProductState.relatedProducts);
  cartItem$: Observable<Cart[]> = this.store.select(CartState.cartItems);

  public cartItem: Cart | null;

  public crossSellProducts: Product[] = [];
  public crossSellProductsIds: number[] = [];
  public selectedProduct: any[] = [];
  public selectedProductIds: number[] = [];
  public selectedVariation: Variation;

  public total: number = 0;

  ngOnChanges() {
    if (this.product()?.cross_sell_products && Array.isArray(this.product()?.cross_sell_products)) {
      this.crossSellProduct$.subscribe((products) => {
        this.crossSellProducts = products.filter((product) =>
          this.product()?.cross_sell_products?.includes(product?.id!),
        );
        this.crossSellProductsIds = this.crossSellProducts.map((product) => {
          return product && product?.id;
        });
        this.cdr.markForCheck();
      });
    }
  }

  select(event: Event, productId: number) {
    const isChecked = (<HTMLInputElement>event.target).checked;
    if (isChecked) {
      this.selectedProductIds.push(productId);
    } else {
      const index = this.selectedProductIds.indexOf(productId);
      if (index !== -1) {
        this.selectedProductIds.splice(index, 1);
      }
    }

    this.crossSellProduct$.pipe(take(1)).subscribe((products) => {
      const dataProducts = [...products];
      if (this.selectedVariation) {
        dataProducts.push(this.selectedVariation as any);
      }
      this.selectedProduct = dataProducts.filter((product) =>
        this.selectedProductIds?.includes(product?.id!),
      );

      this.calculateTotal();
    });
  }

  calculateTotal() {
    this.total = this.selectedProduct.reduce(
      (sum, item) =>
        sum + (item.selected_variant ? item.selected_variant.sale_price : item.sale_price),
      0,
    );
  }

  isChecked(productId: any): boolean {
    return this.selectedProductIds.includes(productId);
  }

  addToCartAll() {
    this.selectedProduct.forEach((product) => {
      if (product) {
        this.cartItem$.pipe(take(1)).subscribe((items: Cart[]) => {
          this.cartItem = items.find((item) => item.product.id == product.id)!;

          const params: CartAddOrUpdate = {
            id:
              this.cartItem &&
                product.selected_variant &&
                this.cartItem?.variation &&
                product.selected_variant?.id == this.cartItem?.variation?.id
                ? this.cartItem.id
                : null,
            product_id: product?.id,
            product: product ? product : null,
            variation: product.selected_variant ? product.selected_variant : null,
            variation_id: product.selected_variant ? product?.selected_variant?.id : null,
            quantity: 1,
          };
          this.store.dispatch(new AddToCart(params));
        });
      }
    });
  }

  getSelectedVariant(option: Variation, products: Product) {
    if (option) {
      const index = this.crossSellProducts.findIndex((product) => product.id === products.id);
      products['selected_variant'] = option;
      this.crossSellProducts[index] = products; // This mutation might cause issues, ideally should be immutable
      this.selectedVariation = option;
      this.calculateTotal();
    }
  }
}
