import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, viewChild, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { AddToCart } from './add-to-cart/add-to-cart';
import { ICartAddOrUpdate } from '../../../interface/cart.interface';
import { IProduct } from '../../../interface/product.interface';
import { IValues } from '../../../interface/setting.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency-symbol.pipe';
import { AddToCartAction } from '../../../store/action/cart.action';
import { SettingState } from '../../../store/state/setting.state';
import { Button } from '../button/button';

@Component({
  selector: 'app-product-box',
  imports: [TranslateModule, CurrencySymbolPipe, Button, AddToCart],
  templateUrl: './product-box.html',
  styleUrl: './product-box.scss',
})
export class ProductBox {
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID);

  readonly product = input<IProduct>(undefined);

  readonly addToCartModal = viewChild<AddToCartAction>('addToCartModal');

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public cartItems: ICartAddOrUpdate;
  public url: string;

  constructor() {
    this.setting$.subscribe(setting => {
      if (setting && setting.general) {
        this.url = setting.general.site_url;
      }
    });
  }

  addToCart(product: IProduct, qty: number) {
    const params: ICartAddOrUpdate = {
      product_id: product?.id,
      product: product,
      variation_id: '',
      variation: null,
      quantity: qty,
    };
    this.store.dispatch(new AddToCartAction(params));
  }

  externalProductLink(link: string) {
    if (isPlatformBrowser(this.platformId)) {
      if (link) {
        window.open(link, '_blank');
      }
    }
  }
}
