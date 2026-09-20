import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { ProductBoxOne } from '../../../shared/components/product-box/product-box-one/product-box-one';
import { ProductCartButton } from '../../../shared/components/product-box/widgets/product-cart-button/product-cart-button';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Product } from '../../../shared/interface/product.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { WishlistModel } from '../../../shared/interface/wishlist.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { WishlistService } from '../../../shared/services/wishlist.service';
import { DeleteWishlist, GetWishlist } from '../../../shared/store/action/wishlist.action';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { WishlistState } from '../../../shared/store/state/wishlist.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-wishlist',
  imports: [
    RouterModule,
    HomeNewsletter,
    CurrencySymbolPipe,
    ProductCartButton,
    NoData,
    Breadcrumb,
    AsyncPipe,
    ProductBoxOne,
    TranslateModule,
  ],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private store = inject(Store);
  public wishlistService = inject(WishlistService);
  @Input() type: string = '';

  wishlistItems$: Observable<WishlistModel> = inject(Store).select(WishlistState.wishlistItems);
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public wishlistItems: Product[];

  public breadcrumb: breadcrumb = {
    title: 'Wishlist',
    items: [{ label: 'Wishlist', active: true }],
  };

  public skeletonItems = Array.from({ length: 12 }, (_, index) => index);

  ngOnInit() {
    this.store.dispatch(new GetWishlist());

    this.wishlistItems$.subscribe((items) => {
      if (items) {
        this.wishlistItems = items.data;
      }
    });
  }

  removeWishlist(id: number) {
    this.store.dispatch(new DeleteWishlist(id));
  }
}
