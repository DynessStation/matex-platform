import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, input, PLATFORM_ID, viewChild } from '@angular/core';

import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { Button } from '../../../shared/components/button/button';
import { BabyShopTheme } from '../../../shared/interface/theme.interface';
import { BodyService } from '../../../shared/services/body.service';
import { LayoutService } from '../../../shared/services/layout.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { GetBrands } from '../../../shared/store/action/brand.action';
import { GetCategories } from '../../../shared/store/action/category.action';
import { GetProductByIds } from '../../../shared/store/action/product.action';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeBrand } from '../widgets/home-brand/home-brand';
import { HomeCategory } from '../widgets/home-category/home-category';
import { HomeProduct } from '../widgets/home-product/home-product';
import { HomeTabsProducts } from '../widgets/home-tabs-products/home-tabs-products';

@Component({
  selector: 'app-baby-shop',
  imports: [HomeBanner, HomeProduct, HomeCategory, HomeTabsProducts, HomeBrand, Button],
  templateUrl: './baby-shop.html',
  styleUrl: './baby-shop.scss',
})
export class BabyShop {
  data = input<BabyShopTheme>();
  slug = input<string>();

  readonly bannerSwiperContainer = viewChild<ElementRef>('bannerSwiperContainer');

  public categorySliderOption: SwiperOptions = {
    slidesPerView: 8,
    spaceBetween: 25,
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
        spaceBetween: 25,
      },
      1115: {
        slidesPerView: 6,
        spaceBetween: 25,
      },
      1360: {
        slidesPerView: 7,
        spaceBetween: 25,
      },
      1650: {
        slidesPerView: 8,
        spaceBetween: 25,
      },
    },
  };

  public bannerSwiperOption: SwiperOptions = {
    slidesPerView: 5,
    spaceBetween: 25,
    autoplay: {
      delay: 3000,
    },
    breakpoints: {
      0: {
        slidesPerView: 1,
        spaceBetween: 15,
      },
      440: {
        spaceBetween: 15,
        slidesPerView: 2,
      },
      710: {
        slidesPerView: 3,
      },
      1035: {
        slidesPerView: 4,
      },
      1390: {
        slidesPerView: 5,
      },
    },
  };

  constructor(
    private store: Store,
    public themeOptionService: ThemeOptionService,
    @Inject(PLATFORM_ID) private platformId: Object,
    public bodyService: BodyService,
    public layoutService: LayoutService,
  ) {}

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
        (this.data()?.category_section?.category_ids && this.data()?.category_section?.status) ||
        (this.data()?.category_section_two?.category_ids &&
          this.data()?.category_section_two?.status)
      ) {
        const allIds = Array.from(
          new Set([
            ...(this.data()?.category_section?.category_ids ?? []),
            ...(this.data()?.category_section_two?.category_ids ?? []),
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

      // Get Brand
      let getBrands$;
      if (this.data()?.brand?.brand_ids?.length && this.data()?.brand?.status) {
        getBrands$ = this.store.dispatch(
          new GetBrands({
            status: 1,
            ids: this.data()?.brand?.brand_ids?.join(','),
          }),
        );
      } else {
        getBrands$ = of(null);
      }

      // Skeleton Loader
      forkJoin([getProducts$, getBrands$, getCategory$]).subscribe({
        complete: () => {
          this.themeOptionService.preloader.set(false);
        },
      });
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        new Swiper(this.bannerSwiperContainer()?.nativeElement, this.bannerSwiperOption);
      }, 100);
    }
  }
}
