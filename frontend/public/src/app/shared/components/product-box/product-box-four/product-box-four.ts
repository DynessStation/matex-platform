import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Product, Variation } from '../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency.pipe';
import { Compare } from '../widgets/compare/compare';
import { QuickView } from '../widgets/quick-view/quick-view';
import { Wishlist } from '../widgets/wishlist/wishlist';

@Component({
  selector: 'app-product-box-four',
  imports: [RouterLink, CurrencySymbolPipe, NgbModule, Wishlist, Compare, QuickView],
  templateUrl: './product-box-four.html',
  styleUrl: './product-box-four.scss',
})
export class ProductBoxFour {
  product = input<Product>();

  public selectedVariation: Variation;

  selectedVariant(variation: Variation) {
    if (variation) {
      this.selectedVariation = variation;
    }
  }
}
