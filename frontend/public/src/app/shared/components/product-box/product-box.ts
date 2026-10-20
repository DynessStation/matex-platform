import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgbRatingConfig, NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';

import { ProductBoxOne } from './product-box-one/product-box-one';
import { Product } from '../../interface/product.interface';
import { Wishlist } from './widgets/wishlist/wishlist';
import { ProductPricePipe } from '../../pipe/product-price.pipe';
import { ProductCartButton } from './widgets/product-cart-button/product-cart-button';

@Component({
  selector: 'app-product-box',
  imports: [
    NgbRatingModule,
    RouterModule,
    ProductBoxOne,
    Wishlist,

    ProductPricePipe,
    ProductCartButton,
    RouterModule,
  ],
  providers: [NgbRatingConfig],
  templateUrl: './product-box.html',
  styleUrl: './product-box.scss',
})
export class ProductBox {
  product = input<Product>();
  productBoxStyle = input<string>('');

  constructor(config: NgbRatingConfig) {
    // customize default values of ratings used by this component tree
    config.max = 5;
    config.readonly = true;
  }
}
