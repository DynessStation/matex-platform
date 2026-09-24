import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { Option } from '../../../../../../shared/interface/theme-option.interface';
import { ProductBuyButton } from '../product-buy-button/product-buy-button';

@Component({
  selector: 'app-product-selected-variant',
  imports: [ProductBuyButton],
  templateUrl: './product-selected-variant.html',
  styleUrl: './product-selected-variant.scss',
})
export class ProductSelectedVariant {
  product = input<Product | null>(null);
  option = input<Option | null>();
  selectedVariation = input<Variation | null>(null);

  private router = inject(Router);

  isVariation(obj: Variation | Product | null): obj is Variation {
    return obj !== null && 'variation_image' in obj;
  }

  get isEnglish() { return this.router.url === '/en' || this.router.url.startsWith('/en/'); }
}
