import { Component, inject, input } from '@angular/core';

import { SwiperOptions } from 'swiper/types';

import { Params } from '../../../../shared/interface/core.interface';
import { LayoutService } from '../../../../shared/services/layout.service';
import { CollectionCategories } from '../widgets/collection-categories/collection-categories';
import { CollectionProducts } from '../widgets/collection-products/collection-products';
import { Sidebar } from '../widgets/sidebar/sidebar';

@Component({
  selector: 'app-collection-shop-list-infinite',
  imports: [CollectionCategories, CollectionProducts, Sidebar],
  templateUrl: './collection-shop-list-infinite.html',
  styleUrl: './collection-shop-list-infinite.scss',
})
export class CollectionShopListInfinite {
  filter = input<Params>();
  layoutService = inject(LayoutService);

  shopCategorySwiperOptions: SwiperOptions = {
    slidesPerView: 10,
    spaceBetween: 24,
    breakpoints: {
      0: { slidesPerView: 2, spaceBetween: 8 },
      380: { slidesPerView: 3, spaceBetween: 8 },
      500: { slidesPerView: 4, spaceBetween: 8 },
      660: { slidesPerView: 5, spaceBetween: 8 },
      850: { slidesPerView: 6 },
      991: { slidesPerView: 7 },
      1242: { slidesPerView: 8 },
      1288: { slidesPerView: 9 },
      1388: { slidesPerView: 8 },
    },
  };
}
