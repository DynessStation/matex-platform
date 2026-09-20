import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  input,
  PLATFORM_ID,
  signal,
  ViewChildren,
  QueryList,
} from '@angular/core';

import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { BannerWithTabsProduct } from '../../../../shared/interface/theme.interface';
import { HomeProduct } from '../home-product/home-product';

@Component({
  selector: 'app-home-tabs-products',
  imports: [HomeProduct],
  templateUrl: './home-tabs-products.html',
  styleUrl: './home-tabs-products.scss',
})
export class HomeTabsProducts {
  style = input('column');
  type = input('horizontal');
  class = input('');
  tabSelection = input<BannerWithTabsProduct | null>(null);
  activeIndex = signal(0);

  itemsPerSlide = input<number>(4);
  spaceBetween = input<number>(20);
  rows = input<number>(1);

  setActiveIndex(index: number) {
    this.activeIndex.set(index);
  }

  @ViewChildren('swiperContainer') swiperContainers!: QueryList<ElementRef>;

  public swiperOptions: SwiperOptions = {
    slidesPerView: 1,
    spaceBetween: 20,
    pagination: { clickable: true },
    navigation: true,
    breakpoints: {
      576: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      992: { slidesPerView: 3 },
    },
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  flattenProducts(arr: number[] | null, itemsPerSlide: number, rows: number): number[][] {
    const safeArr = Array.isArray(arr) ? arr : [];
    const result: number[][] = [];

    // Initialize empty columns
    for (let i = 0; i < itemsPerSlide; i++) {
      result.push([]);
    }

    // Fill columns vertically
    safeArr.forEach((item, index) => {
      const col = index % itemsPerSlide;
      result[col].push(item);
    });

    // Trim rows per column (ensure max rows)
    return result.map((col) => col.slice(0, rows));
  }

  getSwiperOptions(): SwiperOptions {
    const items = this.itemsPerSlide();
    const points: any = {
      2: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 2,
        },
        992: {
          slidesPerView: 2,
        },
      },

      3: {
        0: {
          slidesPerView: 1,
        },
        680: {
          slidesPerView: 2,
        },
        991: {
          slidesPerView: 3,
        },
        1200: {
          slidesPerView: 2,
        },
        1550: {
          slidesPerView: 3,
        },
      },

      4: {
        576: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 2,
        },
        992: {
          slidesPerView: 4,
        },
      },

      5: {
        0: {
          slidesPerView: 2,
        },
        600: {
          slidesPerView: 3,
        },
        890: {
          slidesPerView: 4,
        },
        1220: {
          slidesPerView: 5,
        },
        1399: {
          slidesPerView: 4,
        },
        1560: {
          slidesPerView: 5,
        },
      },
      6: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 2,
        },
        992: {
          slidesPerView: 6,
        },
      },
    };

    const breakpoints = points[items]!;
    const space = this.spaceBetween();
    return {
      slidesPerView: items,
      spaceBetween: space,
      // spaceBetween: space,
      pagination: { clickable: true },
      navigation: true,
      breakpoints: breakpoints,
    };
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const options = this.getSwiperOptions();

        this.swiperContainers.forEach((container) => {
          new Swiper(container.nativeElement, options);
        });
      });
    }
  }
}
