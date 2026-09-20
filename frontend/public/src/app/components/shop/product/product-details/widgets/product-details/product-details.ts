import {
  Component,
  input,
  signal,
  SimpleChanges,
  OnChanges,
  OnDestroy,
  effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { Option } from '../../../../../../shared/interface/theme-option.interface';
import { CurrencySymbolPipe } from '../../../../../../shared/pipe/currency.pipe';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.html',
  imports: [CurrencySymbolPipe, RouterLink],
  styleUrl: './product-details.scss',
})
export class ProductDetails implements OnChanges, OnDestroy {
  product = input<Product | null>(null);
  option = input<Option | null>();
  selectedVariation = input<Variation | Product | null>(null);

  activeVariation = signal<Variation | Product | null>(null);

  viewsCount = signal<number>(30);
  ordersCount = signal<number>(10);

  private viewsIntervalId: any;
  private ordersIntervalId: any;

  constructor() {
    // Sync selectedVariation input with local activeVariation
    effect(() => {
      this.activeVariation.set(this.selectedVariation() ?? this.product());
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product']?.currentValue) {
      // Reset variation when product changes
      this.activeVariation.set(this.product());
    }

    // clear old intervals
    clearInterval(this.viewsIntervalId);
    clearInterval(this.ordersIntervalId);

    const encourageMaxViewCount = this.option()?.product?.encourage_max_view_count ?? 100;
    const encourageMaxOrderCount = this.option()?.product?.encourage_max_order_count ?? 100;

    // Set random counts at intervals
    this.viewsIntervalId = setInterval(() => {
      this.viewsCount.set(Math.floor(Math.random() * encourageMaxViewCount) + 1);
    }, 50000);

    this.ordersIntervalId = setInterval(() => {
      this.ordersCount.set(Math.floor(Math.random() * encourageMaxOrderCount) + 1);
    }, 60000);
  }

  ngOnDestroy() {
    clearInterval(this.viewsIntervalId);
    clearInterval(this.ordersIntervalId);
  }
}
