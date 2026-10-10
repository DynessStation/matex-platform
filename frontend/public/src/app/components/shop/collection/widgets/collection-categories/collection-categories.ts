import { afterNextRender, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ProductBox } from '../../../../../shared/components/product-box/product-box';
import { Product } from '../../../../../shared/interface/product.interface';
import { RecentProductService } from '../../../../../shared/services/recent-product.service';

@Component({
  selector: 'app-collection-categories',
  imports: [ProductBox],
  templateUrl: './collection-categories.html',
  styleUrl: './collection-categories.scss',
})
export class CollectionCategories {
  private recentProductService = inject(RecentProductService);
  private router = inject(Router);
  products: Product[] = [];

  constructor() {
    afterNextRender(() => (this.products = this.recentProductService.get()));
  }

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
}
