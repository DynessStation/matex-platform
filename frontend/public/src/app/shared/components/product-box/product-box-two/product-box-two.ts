import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Product, Variation } from '../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency.pipe';
import { CartButton } from '../widgets/cart-button/cart-button';
import { Compare } from '../widgets/compare/compare';
import { QuickView } from '../widgets/quick-view/quick-view';
import { Wishlist } from '../widgets/wishlist/wishlist';

@Component({
  selector: 'app-product-box-two',
  imports: [CurrencySymbolPipe, NgbModule, RouterLink, CartButton, Wishlist, Compare, QuickView],
  templateUrl: './product-box-two.html',
  styleUrl: './product-box-two.scss',
})
export class ProductBoxTwo {
  product = input<Product>();

  public selectedVariation: Variation;

  selectedVariant(variation: Variation) {
    if (variation) {
      this.selectedVariation = variation;
    }
  }
}
