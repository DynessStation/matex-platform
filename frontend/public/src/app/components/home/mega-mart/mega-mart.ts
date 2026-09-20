import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';

import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { Button } from '../../../shared/components/button/button';
import { MegaMartTheme } from '../../../shared/interface/theme.interface';
import { LayoutService } from '../../../shared/services/layout.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { GetCategories } from '../../../shared/store/action/category.action';
import { GetProductByIds } from '../../../shared/store/action/product.action';
import { GetServices } from '../../../shared/store/action/service.action';
import { GetTags } from '../../../shared/store/action/tag.action';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeCategory } from '../widgets/home-category/home-category';
import { HomeDealProducts } from '../widgets/home-deal-products/home-deal-products';
import { HomeNewsletter } from '../widgets/home-newsletter/home-newsletter';
import { HomeProduct } from '../widgets/home-product/home-product';
import { HomeService } from '../widgets/home-service/home-service';
import { HomeTags } from '../widgets/home-tags/home-tags';

@Component({
  selector: 'app-mega-mart',
  imports: [
    HomeCategory,
    HomeBanner,
    HomeProduct,
    HomeDealProducts,
    HomeTags,
    HomeNewsletter,
    HomeService,
    Button,
  ],
  templateUrl: './mega-mart.html',
  styleUrl: './mega-mart.scss',
})
export class MegaMart {
  data = input<MegaMartTheme>();
  slug = input<string>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
    private store: Store,
    private cdr: ChangeDetectorRef,
  ) {}

  public swiperOption: SwiperOptions = {
    slidesPerView: 14,
    spaceBetween: 10,
    freeMode: true,
    breakpoints: {
      0: {
        slidesPerView: 2.6,
      },
      370: {
        slidesPerView: 3,
      },
      480: {
        slidesPerView: 4,
      },
      600: {
        slidesPerView: 5,
      },
      750: {
        slidesPerView: 6,
      },
      960: {
        slidesPerView: 8,
      },
      1260: {
        slidesPerView: 10,
      },
      1490: {
        slidesPerView: 12,
      },
      1650: {
        slidesPerView: 13,
      },
    },
  };

  public browsingSwiperOption: SwiperOptions = {
    slidesPerView: 12,
    spaceBetween: 10,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 5,
      },
      380: {
        slidesPerView: 3,
        spaceBetween: 5,
      },
      480: {
        spaceBetween: 4,
        slidesPerView: 5,
      },
      650: {
        spaceBetween: 6,
        slidesPerView: 5,
      },
      930: {
        slidesPerView: 7,
      },
      1145: {
        slidesPerView: 9,
      },
      1210: {
        slidesPerView: 10,
      },
      1400: {
        slidesPerView: 11,
      },
      1695: {
        slidesPerView: 12,
      },
    },
  };

  public bannerSwiperOption: SwiperOptions = {
    loop: true,
    slidesPerView: 4,
    spaceBetween: 20,
    breakpoints: {
      0: {
        slidesPerView: 1,
        spaceBetween: 6,
      },
      590: {
        slidesPerView: 2,
        spaceBetween: 10,
      },
      992: {
        slidesPerView: 3,
        spaceBetween: 10,
      },
      1356: {
        slidesPerView: 4,
        spaceBetween: 20,
      },
    },
  };

  public bannerSectionSwiperOptions: SwiperOptions = {
    slidesPerView: 4,
    spaceBetween: 20,
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    breakpoints: {
      0: {
        slidesPerView: 1,
        spaceBetween: 8,
      },
      576: {
        slidesPerView: 2,
      },
      991: {
        slidesPerView: 3,
      },
      1400: {
        slidesPerView: 4,
      },
    },
  };

  readonly bannerSwiperContainer = viewChild<ElementRef>('bannerSwiperContainer');
  readonly bannerSectionSwiperContainer = viewChild<ElementRef>('bannerSectionSwiperContainer');

  ngOnInit() {
    if (this.data()?.slug === this.slug()) {
      // Get Products
      let getProducts$;
      if (this.data()?.products_ids?.length) {
        getProducts$ = this.store.dispatch(
          new GetProductByIds({
            status: 1,
            approve: 1,
            ids: this.data()?.products_ids?.join(','),
            paginate: this.data()?.products_ids?.length,
          }),
        );
      } else {
        getProducts$ = of(null);
      }

      // Get Category
      let getCategory$;
      if (this.data()?.categories?.category_ids?.length && this.data()?.categories?.status) {
        getCategory$ = this.store.dispatch(
          new GetCategories({
            status: 1,
            ids: this.data()?.categories?.category_ids?.join(','),
          }),
        );
      } else {
        getCategory$ = of(null);
      }

      // Get Tag
      let getTag$;
      if (this.data()?.tags?.tags_ids?.length && this.data()?.tags?.status) {
        getTag$ = this.store.dispatch(
          new GetTags({
            status: 1,
            ids: this.data()?.tags?.tags_ids?.join(','),
          }),
        );
      } else {
        getTag$ = of(null);
      }

      // Get Services
      let getService$;
      if (this.data()?.services?.service_ids?.length && this.data()?.services?.status) {
        getService$ = this.store.dispatch(
          new GetServices({
            status: 1,
            ids: this.data()?.services?.service_ids?.join(','),
          }),
        );
      } else {
        getService$ = of(null);
      }

      // Skeleton Loader
      forkJoin([getProducts$, getCategory$, getTag$, getService$]).subscribe({
        complete: () => {
          this.themeOptionService.preloader.set(false);
          this.cdr.markForCheck();
        },
      });
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const container1 = this.bannerSwiperContainer()?.nativeElement;
        if (container1) {
          new Swiper(container1, this.bannerSwiperOption);
        }

        const container2 = this.bannerSectionSwiperContainer()?.nativeElement;
        if (container2) {
          new Swiper(container2, this.bannerSectionSwiperOptions);
        }
      }, 100);
    }
  }
}
