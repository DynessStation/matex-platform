import { Component, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Product } from '../../../interface/product.interface';
import { ProductPricePipe } from '../../../pipe/product-price.pipe';

@Component({
  selector: 'app-product-box-one',
  imports: [RouterModule, ProductPricePipe],
  templateUrl: './product-box-one.html',
  styleUrl: './product-box-one.scss',
})
export class ProductBoxOne {
  product = input<Product>();
  private router = inject(Router);

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
  get productLink() {
    return [this.isEnglish ? '/en/product' : '/produk', this.product()?.slug];
  }
}
