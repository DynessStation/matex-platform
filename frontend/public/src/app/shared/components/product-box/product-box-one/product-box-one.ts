import { Component, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Product } from '../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency.pipe';

@Component({
  selector: 'app-product-box-one',
  imports: [
    RouterModule,
    CurrencySymbolPipe,
  ],
  templateUrl: './product-box-one.html',
  styleUrl: './product-box-one.scss',
})
export class ProductBoxOne {
  product = input<Product>();
  private router = inject(Router);

  get isEnglish() { return this.router.url === '/en' || this.router.url.startsWith('/en/'); }
  get productLink() { return [this.isEnglish ? '/en/product' : '/produk', this.product()?.slug]; }
  get priceCurrency() { return this.product()?.currency || this.product()?.prices?.[0]?.currency || 'IDR'; }
}
