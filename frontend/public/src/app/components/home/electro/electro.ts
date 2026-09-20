import { isPlatformBrowser, NgClass } from '@angular/common';
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
import { ElectroTheme } from '../../../shared/interface/theme.interface';
import { LayoutService } from '../../../shared/services/layout.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { GetCategories } from '../../../shared/store/action/category.action';
import { GetProductByIds } from '../../../shared/store/action/product.action';
import { GetTags } from '../../../shared/store/action/tag.action';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeCategory } from '../widgets/home-category/home-category';
import { HomeDealProducts } from '../widgets/home-deal-products/home-deal-products';
import { HomeNewsletter } from '../widgets/home-newsletter/home-newsletter';
import { HomeProduct } from '../widgets/home-product/home-product';
import { HomeTabsProducts } from '../widgets/home-tabs-products/home-tabs-products';
import { HomeTags } from '../widgets/home-tags/home-tags';

@Component({
  selector: 'app-electro',
  imports: [
    HomeCategory,
    HomeBanner,
    HomeDealProducts,
    HomeTabsProducts,
    HomeProduct,
    HomeTags,
    HomeNewsletter,
    Button,
    NgClass,
  ],
  templateUrl: './electro.html',
  styleUrl: './electro.scss',
})
export class Electro {
  data = input<ElectroTheme>();
  slug = input<string>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
    private store: Store,
    private cdr: ChangeDetectorRef,
  ) {}

  public categorySliderOption: SwiperOptions = {
    slidesPerView: 7,
    spaceBetween: 10,
    grabCursor: true,
    autoplay: {
      delay: 3000,
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
      },
      422: {
        slidesPerView: 3,
      },
      582: {
        slidesPerView: 4,
      },
      830: {
        slidesPerView: 5,
      },
      1000: {
        slidesPerView: 6,
      },
      1200: {
        slidesPerView: 7,
      },
    },
  };

  public browserCategoryOption: SwiperOptions = {
    slidesPerView: 8,
    spaceBetween: 15,
    navigation: {
      nextEl: '.electronic-category-next',
      prevEl: '.electronic-category-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
      },
      400: {
        slidesPerView: 3,
      },
      550: {
        slidesPerView: 4,
      },
      685: {
        slidesPerView: 5,
      },
      830: {
        slidesPerView: 6,
      },
      975: {
        slidesPerView: 7,
      },
      1130: {
        slidesPerView: 8,
      },
      1399: {
        slidesPerView: 9,
      },
      1400: {
        slidesPerView: 6,
      },
      1590: {
        slidesPerView: 7,
      },
      1770: {
        slidesPerView: 8,
      },
    },
  };

  public bestSellerSwiperOption: SwiperOptions = {
    slidesPerView: 1,
    navigation: {
      nextEl: '.best-seller-next',
      prevEl: '.best-seller-prev',
    },
  };

  public featureBannerSwiperOption: SwiperOptions = {
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

  public optionNewTrendingSwiper: SwiperOptions = {
    slidesPerView: 4,
    spaceBetween: 20,
    navigation: {
      nextEl: '.banner-two-next',
      prevEl: '.banner-two-prev',
    },
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
      },
    },
  };

  readonly featureBannerSwiperContainer = viewChild<ElementRef>('featureBannerSwiperContainer');
  readonly newTrendingSwiperContainer = viewChild<ElementRef>('newTrendingSwiperContainer');

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
      if (
        (this.data()?.categories?.category_ids && this.data()?.categories?.status) ||
        (this.data()?.browse_by_categories?.category_ids &&
          this.data()?.browse_by_categories?.status)
      ) {
        const allIds = Array.from(
          new Set([
            ...(this.data()?.categories?.category_ids ?? []),
            ...(this.data()?.browse_by_categories?.category_ids ?? []),
          ]),
        );
        getCategory$ = this.store.dispatch(
          new GetCategories({
            status: 1,
            ids: allIds?.join(','),
          }),
        );
      } else {
        getCategory$ = of(null);
      }
      // Get Tags
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

      // Skeleton Loader
      forkJoin([getProducts$, getCategory$, getTag$]).subscribe({
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
        const container1 = this.featureBannerSwiperContainer()?.nativeElement;
        if (container1) {
          new Swiper(container1, this.featureBannerSwiperOption);
        }

        const container2 = this.newTrendingSwiperContainer()?.nativeElement;
        if (container2) {
          new Swiper(container2, this.optionNewTrendingSwiper);
        }
      }, 100);
    }
  }
}
