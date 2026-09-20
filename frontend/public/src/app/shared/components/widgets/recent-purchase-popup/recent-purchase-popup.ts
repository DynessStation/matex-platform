import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable, take } from 'rxjs';

import { Product, ProductModel } from '../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency.pipe';
import { ProductState } from '../../../store/state/product.state';

@Component({
  selector: 'app-recent-purchase-popup',
  templateUrl: './recent-purchase-popup.html',
  styleUrls: ['./recent-purchase-popup.scss'],
  imports: [RouterModule, CurrencySymbolPipe],
})
export class RecentPurchasePopup implements OnDestroy {
  private platformId = inject<Object>(PLATFORM_ID);

  relatesProduct$: Observable<Product[]> = inject(Store).select(ProductState.relatedProducts);
  product$: Observable<ProductModel> = inject(Store).select(ProductState.product);

  public product: Product | null;
  public show: boolean = false;
  public min: number = 10;

  private intervalId: any;
  private productsCache: Product[] = [];
  public popup_enable = true;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Combine sources to get a pool of products to show
      this.product$.subscribe(productModel => {
        if (productModel?.data?.length) {
          this.productsCache = [...this.productsCache, ...productModel.data];
        } else {
          // Fallback to related products if main product list is empty
          this.relatesProduct$.pipe(take(1)).subscribe(related => {
            this.productsCache = [...this.productsCache, ...related];
          });
        }
      });

      this.startPopupInterval();
    }
  }

  startPopupInterval() {
    this.intervalId = setInterval(() => {
      if (!this.popup_enable) return;

      this.min = Math.floor(Math.random() * 60) + 1;
      this.randomlySelectProduct();
      this.show = true;

      setTimeout(() => {
        if (this.popup_enable) {
          this.show = false;
        }
      }, 5000);
    }, 20000);
  }

  randomlySelectProduct() {
    if (this.productsCache.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.productsCache.length);
      this.product = this.productsCache[randomIndex];
    }
  }

  closePopup() {
    this.show = false;
    this.popup_enable = false; // Stop further popups
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  ngOnDestroy() {
    this.popup_enable = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
