import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

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
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
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
  ],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private store = inject(Store);
  public navigation = inject(PublicNavigationContextService);
  @Input() type: string = '';

  wishlistItems$: Observable<WishlistModel> = inject(Store).select(WishlistState.wishlistItems);
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public wishlistItems: Product[] = [];

  public skeletonItems = Array.from({ length: 12 }, (_, index) => index);

  get isEnglish(): boolean {
    return this.navigation.locale() === 'en-US';
  }

  get breadcrumb(): breadcrumb {
    const title = this.isEnglish ? 'Wishlist' : 'Favorit';
    return { title, items: [{ label: title, active: true }] };
  }

  get wishlistPath(): string {
    return this.isEnglish ? '/en/wishlist' : '/wishlist';
  }

  get emptyTitle(): string {
    return this.isEnglish ? 'No items added' : 'Belum ada produk favorit';
  }

  get emptyDescription(): string {
    return this.isEnglish
      ? 'Products you save will appear here.'
      : 'Produk yang Anda simpan akan tampil di sini.';
  }

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
