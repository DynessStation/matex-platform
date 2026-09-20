import { Component, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';

import { Product, Variation } from '../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency.pipe';
import { DeleteWishlist } from '../../../store/action/wishlist.action';
import { VariantAttributes } from '../../variant-attributes/variant-attributes';
import { CartButton } from '../widgets/cart-button/cart-button';
import { Compare } from '../widgets/compare/compare';
import { QuickView } from '../widgets/quick-view/quick-view';
import { Wishlist } from '../widgets/wishlist/wishlist';

@Component({
  selector: 'app-product-box-one',
  imports: [
    RouterModule,
    NgbRatingModule,
    CartButton,
    VariantAttributes,
    Wishlist,
    Compare,
    CurrencySymbolPipe,
    QuickView,
  ],
  templateUrl: './product-box-one.html',
  styleUrl: './product-box-one.scss',
})
export class ProductBoxOne {
  product = input<Product>();
  private store = inject(Store);

  public selectedVariation: Variation;
  public show: boolean = false;

  swipe(event: boolean) {
    this.show = event;
  }

  closeSwipe() {
    this.show = false;
  }

  selectedVariant(variation: Variation) {
    if (variation) {
      this.selectedVariation = variation;
    }
  }

  removeWishlist(id: number) {
    this.store.dispatch(new DeleteWishlist(id));
  }
}
