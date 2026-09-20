import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  inject,
  Inject,
  input,
  PLATFORM_ID,
  QueryList,
  viewChild,
  ViewChildren,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgbRatingConfig, NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable, of, switchMap, map } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import SwiperCore, { Swiper } from 'swiper';
import { Autoplay, EffectFade, Navigation, Pagination, Thumbs } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Timer } from '../../../../shared/components/widgets/timer/timer';
import { Product } from '../../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../../shared/pipe/currency.pipe';
import { ProductState } from '../../../../shared/store/state/product.state';

SwiperCore.use([Navigation, Pagination, Autoplay, EffectFade, Thumbs]);

@Component({
  selector: 'app-home-deal-products',
  imports: [NgbRatingModule, CurrencySymbolPipe, Timer, RouterModule, AsyncPipe],
  providers: [NgbRatingConfig],
  templateUrl: './home-deal-products.html',
  styleUrl: './home-deal-products.scss',
})
export class HomeDealProducts {
  @ViewChildren('dealThumbSwiperContainer') dealThumbSwiper!: QueryList<ElementRef>;
  @ViewChildren('dealMainSwiperContainer') dealMainSwiper!: QueryList<ElementRef>;

  readonly dealSwiperContainer = viewChild<ElementRef>('dealSwiperContainer');
  readonly productGalleryMainSwiper = viewChild<ElementRef>('productGalleryMainSwiper');
  readonly productGalleryThumbSwiper = viewChild<ElementRef>('productGalleryThumbSwiper');
  readonly productOneSwiperContainer = viewChild<ElementRef>('productOneSwiperContainer');
  readonly productDealMainSwiper = viewChild<ElementRef>('productDealMainSwiper');
  readonly productDealThumbSwiper = viewChild<ElementRef>('productDealThumbSwiper');
  readonly dailyDealSwiperContainer = viewChild<ElementRef>('dailyDealSwiperContainer');

  private thumbSwiper!: SwiperCore;

  productIds = input<number[] | null>(null);
  type = input<string>();

  private store = inject(Store);
  products$: Observable<Product[]> = this.store.select(ProductState.productByIds);

  public dealsProduct$: Observable<Product[]> = toObservable(this.productIds).pipe(
    switchMap((ids) => {
      if (!ids || !ids.length) return of([]);
      return this.products$.pipe(
        map((products) => products.filter((p) => ids.includes(p.id)))
      );
    })
  );

  public targetProduct$: Observable<Product | undefined> = this.dealsProduct$.pipe(
    map((products) => (products.length ? products[0] : undefined))
  );

  public optionDealSwiperContainer: SwiperOptions = {
    loop: true,
    slidesPerView: 1,
    breakpoints: {
      0: {
        slidesPerView: 1,
        spaceBetween: 6,
      },
      767: {
        slidesPerView: 2,
        spaceBetween: 25,
      },
      1199: {
        slidesPerView: 1,
      },
    },
    navigation: {
      nextEl: '.swiper-btn-next',
      prevEl: '.swiper-btn-prev',
    },
  };

  public optionDealMainSwiperContainer: SwiperOptions = {
    loop: true,
    spaceBetween: 10,
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    speed: 1000,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  public optionsDealThumbSwiperContainer: SwiperOptions = {
    loop: true,
    spaceBetween: 10,
    slidesPerView: 3,
    freeMode: true,
    direction: 'vertical',
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    speed: 1000,
    watchSlidesProgress: true,
    breakpoints: {
      0: {
        direction: 'horizontal',
      },
      401: {
        direction: 'vertical',
      },
    },
  };

  public optionGalleryMain: SwiperOptions = {
    spaceBetween: 10,
    autoplay: {
      delay: 3000,
    },
  };

  public optionGalleryThumb: SwiperOptions = {
    spaceBetween: 10,
    slidesPerView: 4,
    direction: 'vertical',
    autoplay: {
      delay: 3000,
    },
    breakpoints: {
      0: {
        direction: 'horizontal',
      },
      376: {
        direction: 'vertical',
      },
    },
  };

  public optionsProductOneSwiper: SwiperOptions = {
    spaceBetween: 30,
    centeredSlides: true,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  public optionsDealMain: SwiperOptions = {
    spaceBetween: 10,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  public optionsDealThumb: SwiperOptions = {
    spaceBetween: 10,
    slidesPerView: 3,
    freeMode: true,
  };

  public optionDailyDeal: SwiperOptions = {
    slidesPerView: 1,
    navigation: {
      nextEl: '.daily-deal-next',
      prevEl: '.daily-deal-prev',
    },
  };
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    config: NgbRatingConfig,
  ) {
    config.max = 5;
    config.readonly = true;
  }

  private initParentDealSwiper() {
    const container = this.dealSwiperContainer()?.nativeElement;

    if (container) {
      new Swiper(container, this.optionDealSwiperContainer);
    }
  }
  private initInnerSwipers() {
    const thumbList = this.dealThumbSwiper.toArray();
    const mainList = this.dealMainSwiper.toArray();

    thumbList.forEach((thumbRef, i) => {
      const thumbSwiper = new SwiperCore(
        thumbRef.nativeElement,
        this.optionsDealThumbSwiperContainer,
      );

      new SwiperCore(mainList[i].nativeElement, {
        ...this.optionDealMainSwiperContainer,
        thumbs: {
          swiper: thumbSwiper,
        },
      });
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      if (this.type() === 'product-gallery') {
        const thumbEl = this.productGalleryThumbSwiper();
        if (thumbEl) {
          this.thumbSwiper = new SwiperCore(thumbEl.nativeElement, this.optionGalleryThumb);
        }

        const mainEl = this.productGalleryMainSwiper();
        if (mainEl) {
          new SwiperCore(mainEl.nativeElement, {
            ...this.optionGalleryMain,
            thumbs: {
              swiper: this.thumbSwiper,
            },
          });
        }
      }
      if (this.type() === 'product-deal') {
        const thumbEl = this.productDealThumbSwiper();
        if (thumbEl) {
          this.thumbSwiper = new SwiperCore(thumbEl.nativeElement, this.optionsDealThumb);
        }

        const mainEl = this.productDealMainSwiper();
        if (mainEl) {
          new SwiperCore(mainEl.nativeElement, {
            ...this.optionsDealMain,
            thumbs: {
              swiper: this.thumbSwiper,
            },
          });
        }
      }

      if (this.type() === 'single-product') {
        const container1 = this.productOneSwiperContainer()?.nativeElement;
        if (container1) {
          new Swiper(container1, this.optionsProductOneSwiper);
        }
      }
      if (this.type() === 'daily-deal') {
        const container2 = this.dailyDealSwiperContainer()?.nativeElement;
        if (container2) {
          new Swiper(container2, this.optionDailyDeal);
        }
      }
      if (this.type() === 'multi-product') {
        this.initParentDealSwiper();

        this.initInnerSwipers();
      }
    }, 500);
  }
}
