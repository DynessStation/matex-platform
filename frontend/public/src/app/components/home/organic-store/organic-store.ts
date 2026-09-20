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
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { Timer } from '../../../shared/components/widgets/timer/timer';
import { OrganicTheme } from '../../../shared/interface/theme.interface';
import { BodyService } from '../../../shared/services/body.service';
import { LayoutService } from '../../../shared/services/layout.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { GetBrands } from '../../../shared/store/action/brand.action';
import { GetCategories } from '../../../shared/store/action/category.action';
import { GetProductByIds } from '../../../shared/store/action/product.action';
import { GetServices } from '../../../shared/store/action/service.action';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeBrand } from '../widgets/home-brand/home-brand';
import { HomeCategory } from '../widgets/home-category/home-category';
import { HomeProduct } from '../widgets/home-product/home-product';
import { HomeService } from '../widgets/home-service/home-service';

@Component({
  selector: 'app-organic-store',
  imports: [HomeBanner, HomeProduct, HomeCategory, HomeBrand, HomeService, Timer, RouterModule],
  templateUrl: './organic-store.html',
  styleUrl: './organic-store.scss',
})
export class OrganicStore {
  data = input<OrganicTheme>();
  slug = input<string>();

  public swiperOption: SwiperOptions = {
    spaceBetween: 15,
    slidesPerView: 6,
    freeMode: true,
    navigation: {
      nextEl: '.product-six-next',
      prevEl: '.product-six-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 12,
      },
      720: {
        slidesPerView: 3,
        spaceBetween: 15,
      },
      1050: {
        slidesPerView: 4,
      },
      1199: {
        slidesPerView: 5,
      },
      1200: {
        slidesPerView: 3,
      },
      1350: {
        slidesPerView: 4,
      },
      1400: {
        slidesPerView: 5,
      },
      1610: {
        slidesPerView: 6,
      },
    },
  };

  public columnSwiperOption: SwiperOptions = {
    slidesPerView: 3,
    spaceBetween: 30,
    freeMode: true,
    navigation: {
      nextEl: '.product-three-slider-next',
      prevEl: '.product-three-slider-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 1,
      },
      670: {
        spaceBetween: 15,
        slidesPerView: 2,
      },
      1199: {
        slidesPerView: 3,
      },
      1200: {
        slidesPerView: 2,
      },
      1740: {
        slidesPerView: 3,
      },
    },
  };

  public twoColumnSwiperOption: SwiperOptions = {
    spaceBetween: 15,
    slidesPerView: 2,
    navigation: {
      nextEl: '.product-two-slider-next',
      prevEl: '.product-two-slider-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 1,
      },
      768: {
        slidesPerView: 2,
      },
    },
  };

  readonly columnSwiperContainer = viewChild<ElementRef>('columnSwiperContainer');
  readonly twoColumnSwiperContainer = viewChild<ElementRef>('twoColumnSwiperContainer');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
    private store: Store,
    private cdr: ChangeDetectorRef,
    private bodyService: BodyService,
  ) {
    this.bodyService.setClasses(['demo-3']);
  }

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
        this.data()?.main_content?.left_banner_section?.categories?.category_ids?.length &&
        this.data()?.main_content?.left_banner_section?.categories?.status
      ) {
        getCategory$ = this.store.dispatch(
          new GetCategories({
            status: 1,
            ids: this.data()?.main_content?.left_banner_section?.categories?.category_ids?.join(
              ',',
            ),
          }),
        );
      } else {
        getCategory$ = of(null);
      }

      // Get Brand
      let getBrands$;
      if (
        this.data()?.main_content?.right_product_section?.brand?.brand_ids?.length &&
        this.data()?.main_content?.right_product_section?.brand?.status
      ) {
        getBrands$ = this.store.dispatch(
          new GetBrands({
            status: 1,
            ids: this.data()?.main_content?.right_product_section?.brand?.brand_ids?.join(','),
          }),
        );
      } else {
        getBrands$ = of(null);
      }

      // Get Services
      let getService$;
      if (
        this.data()?.main_content.right_product_section.services.service_ids &&
        this.data()?.main_content.right_product_section.services?.status
      ) {
        getService$ = this.store.dispatch(
          new GetServices({
            status: 1,
            ids: this.data()?.main_content.right_product_section.services.service_ids?.join(','),
          }),
        );
      } else {
        getService$ = of(null);
      }

      // Skeleton Loader
      forkJoin([getProducts$, getBrands$, getCategory$, getService$]).subscribe({
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
        new Swiper(this.columnSwiperContainer()?.nativeElement, this.columnSwiperOption);
        new Swiper(this.twoColumnSwiperContainer()?.nativeElement, this.twoColumnSwiperOption);
      }, 100);
    }
  }
}
