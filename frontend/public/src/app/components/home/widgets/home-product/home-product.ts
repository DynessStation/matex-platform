import { isPlatformBrowser, NgClass, SlicePipe } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  Inject,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { ProductBox } from '../../../../shared/components/product-box/product-box';
import { Product } from '../../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../../shared/pipe/currency.pipe';
import { ProductState } from '../../../../shared/store/state/product.state';

@Component({
  selector: 'app-home-product',
  standalone: true,
  imports: [ProductBox, CurrencySymbolPipe, RouterLink, NgClass, SlicePipe],
  templateUrl: './home-product.html',
  styleUrls: ['./home-product.scss'],
})
export class HomeProduct {
  productIds = input<number[] | null>();
  type = input<string>('vertical');
  style = input<string>('default');
  col = input<string>('col-xxl-2 col-lg-3 col-md-4 col-sm-6');

  public swiperOption: SwiperOptions = {
    slidesPerView: 2,
    spaceBetween: 15,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      0: {
        slidesPerView: 1,
      },
      600: {
        slidesPerView: 2,
      },
      950: {
        slidesPerView: 3,
      },
      1200: {
        slidesPerView: 1,
      },
      1530: {
        slidesPerView: 2,
      },
    },
  };

  public swiperOption2: SwiperOptions = {
    slidesPerView: 6,
    spaceBetween: 20,
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 10,
      },
      460: {
        slidesPerView: 3,
        spaceBetween: 10,
      },
      712: {
        slidesPerView: 4,
      },
      845: {
        slidesPerView: 5,
      },
      1478: {
        slidesPerView: 6,
      },
    },
  };
  option = input<SwiperOptions>(this.swiperOption);

  public optionProductSlider: SwiperOptions = {
    slidesPerView: 10,
    spaceBetween: 24,
    freeMode: true,
    loop: true,
    navigation: {
      nextEl: '.recent-product-next',
      prevEl: '.recent-product-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      470: {
        spaceBetween: 15,
        slidesPerView: 3,
      },
      670: {
        slidesPerView: 4,
      },
      840: {
        slidesPerView: 5,
      },
      1040: {
        slidesPerView: 6,
      },
      1210: {
        slidesPerView: 7,
      },
      1380: {
        slidesPerView: 8,
      },
      1590: {
        slidesPerView: 9,
      },
      1776: {
        slidesPerView: 10,
      },
    },
  };

  public optionProductSliderTwo: SwiperOptions = {
    spaceBetween: 20,
    loop: true,
    slidesPerView: 8,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    navigation: {
      nextEl: '.discover-product-next',
      prevEl: '.discover-product-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      536: {
        slidesPerView: 3,
        spaceBetween: 15,
      },
      760: {
        slidesPerView: 4,
        spaceBetween: 15,
      },
      940: {
        slidesPerView: 5,
        spaceBetween: 20,
      },
      1115: {
        slidesPerView: 6,
        spaceBetween: 20,
      },
      1360: {
        slidesPerView: 7,
        spaceBetween: 20,
      },
      1650: {
        slidesPerView: 8,
        spaceBetween: 20,
      },
    },
  };

  public optionSwiperTrendingProduct: SwiperOptions = {
    slidesPerView: 6,
    loop: true,
    spaceBetween: 20,
    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      690: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      950: {
        slidesPerView: 4,
        spaceBetween: 20,
      },
      1290: {
        slidesPerView: 5,
      },
      1654: {
        slidesPerView: 6,
      },
    },
  };

  private store = inject(Store);
  product$: Observable<Product[]> = this.store.select(ProductState.productByIds);
  products: Product[] = [];

  readonly columnSwiperContainer = viewChild<ElementRef>('columnSwiperContainer');
  readonly categorySwiperContainer = viewChild<ElementRef>('categorySwiperContainer');
  readonly productSliderSwiperOption = viewChild<ElementRef>('productSliderSwiperOption');
  readonly productSliderTwoSwiperOption = viewChild<ElementRef>('productSliderTwoSwiperOption');
  readonly trendingProductSwiperContainer = viewChild<ElementRef>('trendingProductSwiperContainer');

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    effect(() => {
      const ids = this.productIds();
      if (Array.isArray(ids) && ids.length) {
        this.product$.subscribe((products) => {
          this.products = products.filter((p) => ids.includes(p.id));
        });
      } else {
        this.products = [];
      }
    });
  }

  chunkProducts(arr: any[] | null, groupSize = 2): any[][] {
    const safeArr = arr ?? [];
    const total = Math.min(safeArr.length, this.productIds()?.length!);
    const result: any[][] = [];

    for (let i = 0; i < total; i += groupSize) {
      result.push(safeArr.slice(i, i + groupSize));
    }

    return result;
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const container1 = this.columnSwiperContainer()?.nativeElement;
        if (container1) {
          new Swiper(container1, this.option());
        }

        const container2 = this.categorySwiperContainer()?.nativeElement;
        if (container2) {
          new Swiper(container2, this.swiperOption2);
        }

        const container3 = this.productSliderSwiperOption()?.nativeElement;
        if (container3) {
          new Swiper(container3, this.optionProductSlider);
        }

        const container4 = this.productSliderTwoSwiperOption()?.nativeElement;
        if (container4) {
          new Swiper(container4, this.optionProductSliderTwo);
        }

        const container5 = this.trendingProductSwiperContainer()?.nativeElement;
        if (container5) {
          new Swiper(container5, this.optionSwiperTrendingProduct);
        }
      }, 100);
    }
  }
}
