import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Product } from '../../../../../../shared/interface/product.interface';

@Component({
  selector: 'app-product-information',
  imports: [TranslateModule],
  templateUrl: './product-information.html',
  styleUrl: './product-information.scss',
})
export class ProductInformation {
  product = input<Product | null>(null);
  private router = inject(Router);

  get isEnglish() { return this.router.url === '/en' || this.router.url.startsWith('/en/'); }
  stockLabel(status?: string) {
    const labels: Record<string, [string, string]> = {
      in_stock: ['Tersedia', 'Available'], out_of_stock: ['Habis', 'Out of stock'],
      preorder: ['Pre-order', 'Pre-order'], made_to_order: ['Dibuat sesuai pesanan', 'Made to order'],
    };
    const label = labels[status ?? ''];
    return label ? label[this.isEnglish ? 1 : 0] : status;
  }
}
