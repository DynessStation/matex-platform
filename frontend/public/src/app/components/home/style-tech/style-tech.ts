import { ChangeDetectorRef, Component, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';
import { SwiperOptions } from 'swiper/types';

import { Button } from '../../../shared/components/button/button';
import { StyleTechTheme } from '../../../shared/interface/theme.interface';
import { BodyService } from '../../../shared/services/body.service';
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
import { HomeTabsProducts } from '../widgets/home-tabs-products/home-tabs-products';
import { HomeTags } from '../widgets/home-tags/home-tags';

@Component({
  selector: 'app-style-tech',
  imports: [
    HomeBanner,
    HomeService,
    HomeCategory,
    HomeProduct,
    HomeDealProducts,
    HomeTabsProducts,
    HomeTags,
    HomeNewsletter,
    Button,
  ],
  templateUrl: './style-tech.html',
  styleUrl: './style-tech.scss',
})
export class StyleTech {
  data = input<StyleTechTheme>();
  slug = input<string>();

  constructor(
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
    private store: Store,
    private bodyService: BodyService,
    private cdr: ChangeDetectorRef,
  ) {}

  public swiperOption: SwiperOptions = {
    spaceBetween: 15,
    slidesPerView: 6,
    freeMode: true,
    navigation: {
      nextEl: '.category-three-next',
      prevEl: '.category-three-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 8,
      },
      730: {
        slidesPerView: 3,
      },
      992: {
        slidesPerView: 4,
      },
      1200: {
        slidesPerView: 5,
      },
      1410: {
        slidesPerView: 6,
      },
      1680: {
        slidesPerView: 7,
      },
    },
  };

  public todayDealSwiperOption: SwiperOptions = {
    slidesPerView: 5,
    spaceBetween: 25,
    navigation: {
      nextEl: '.product-five-slider-next',
      prevEl: '.product-five-slider-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 14,
      },
      660: {
        slidesPerView: 3,
      },
      980: {
        slidesPerView: 4,
      },
      1200: {
        slidesPerView: 3,
      },
      1320: {
        slidesPerView: 4,
      },
      1672: {
        slidesPerView: 5,
      },
    },
  };

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
        (this.data()?.category_with_banner?.category_ids &&
          this.data()?.category_with_banner?.status)
      ) {
        const allIds = Array.from(
          new Set([
            ...(this.data()?.category_section?.category_ids ?? []),
            ...(this.data()?.category_with_banner?.category_ids ?? []),
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

      // Get Services
      let getService$;
      if (
        this.data()?.service_with_banner?.service_ids?.length &&
        this.data()?.service_with_banner?.status
      ) {
        getService$ = this.store.dispatch(
          new GetServices({
            status: 1,
            ids: this.data()?.service_with_banner?.service_ids?.join(','),
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
}
