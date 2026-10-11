import { Component, input, signal, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { Option } from '../../../../../../shared/interface/theme-option.interface';
import { ProductPricePipe } from '../../../../../../shared/pipe/product-price.pipe';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.html',
  imports: [ProductPricePipe],
  styleUrl: './product-details.scss',
})
export class ProductDetails {
  product = input<Product | null>(null);
  option = input<Option | null>();
  selectedVariation = input<Variation | Product | null>(null);

  activeVariation = signal<Variation | Product | null>(null);

  private router = inject(Router);

  constructor() {
    effect(() => {
      this.activeVariation.set(this.selectedVariation() ?? this.product());
    });
  }
  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
}
