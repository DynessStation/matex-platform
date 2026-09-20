import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Product, Variation } from '../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency.pipe';
import { Compare } from '../widgets/compare/compare';
import { QuickView } from '../widgets/quick-view/quick-view';
import { Wishlist } from '../widgets/wishlist/wishlist';

@Component({
  selector: 'app-product-box-five',
  imports: [CurrencySymbolPipe, RouterLink, Wishlist, Compare, QuickView],
  templateUrl: './product-box-five.html',
  styleUrl: './product-box-five.scss',
})
export class ProductBoxFive {
  product = input<Product>();

  public selectedVariation: Variation;

  selectedVariant(variation: Variation) {
    if (variation) {
      this.selectedVariation = variation;
    }
  }
}
