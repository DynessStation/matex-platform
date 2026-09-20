import { Component, input } from '@angular/core';

import { CategoryProduct } from '../../../../shared/interface/theme.interface';
import { HomeProduct } from '../home-product/home-product';

@Component({
  selector: 'app-home-top-category-product',
  imports: [HomeProduct],
  templateUrl: './home-top-category-product.html',
  styleUrl: './home-top-category-product.scss',
})
export class HomeTopCategoryProduct {
  categoryProducts = input<CategoryProduct[]>();
}
