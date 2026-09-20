import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { SwiperOptions } from 'swiper/types';

import { HomeCategory } from '../../../../../shared/components/categories/categories';
import { Option } from '../../../../../shared/interface/theme-option.interface';
import { ThemeOptionState } from '../../../../../shared/store/state/theme-option.state';

@Component({
  selector: 'app-collection-categories',
  imports: [HomeCategory, AsyncPipe],
  templateUrl: './collection-categories.html',
  styleUrl: './collection-categories.scss',
})
export class CollectionCategories {
  private store = inject(Store);
  themeOption$: Observable<Option> = this.store.select(ThemeOptionState.themeOptions);

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
      1388: { slidesPerView: 10 },
    },
  };

  swiperOptions = input<SwiperOptions>(this.shopCategorySwiperOptions);
}
