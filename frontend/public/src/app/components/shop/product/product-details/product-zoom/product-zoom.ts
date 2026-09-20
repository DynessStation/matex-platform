import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, input, PLATFORM_ID, viewChild } from '@angular/core';

import { NgxImageZoomModule } from 'ngx-image-zoom';
import Swiper from 'swiper';
import { EffectFade, FreeMode, Thumbs } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Product, Variation } from '../../../../../shared/interface/product.interface';
import { Option } from '../../../../../shared/interface/theme-option.interface';
import { PaymentOption } from '../widgets/payment-option/payment-option';
import { ProductBundle } from '../widgets/product-bundle/product-bundle';
import { ProductContent } from '../widgets/product-content/product-content';
import { ProductDeliveryInformation } from '../widgets/product-delivery-information/product-delivery-information';
import { ProductDetails } from '../widgets/product-details/product-details';
import { ProductDetailsTab } from '../widgets/product-details-tab/product-details-tab';
import { ProductInformation } from '../widgets/product-information/product-information';
import { ProductSelectedVariant } from '../widgets/product-selected-variant/product-selected-variant';
import { ProductSocialShare } from '../widgets/product-social-share/product-social-share';

Swiper.use([FreeMode, Thumbs, EffectFade]);

@Component({
  selector: 'app-product-zoom',
  imports: [
    ProductDetails,
    ProductContent,
    ProductInformation,
    ProductDeliveryInformation,
    PaymentOption,
    ProductSocialShare,
    ProductDetailsTab,
    ProductSelectedVariant,
    ProductBundle,
    NgxImageZoomModule,
  ],
  templateUrl: './product-zoom.html',
  styleUrl: './product-zoom.scss',
})
export class ProductZoom {
  product = input<Product | null>(null);
  option = input<Option | null>();
  layout = input<string>();

  public selectedVariation!: Variation;

  readonly mainSwiperRef = viewChild<ElementRef>('mainSwiper');
  readonly thumbSwiperRef = viewChild<ElementRef>('thumbSwiper');

  public lensWidth: number = 176;
  public lensHeight: number = 176;

  updateLensSize() {
    const vw = window.innerWidth;

    const minW = 176;
    const maxW = 300;
    const calcW = minW + (maxW - minW) * ((vw - 320) / (1920 - 320));
    this.lensWidth = Math.max(minW, Math.min(maxW, calcW));

    const minH = 176;
    const maxH = 300;
    const calcH = minH + (maxH - minH) * ((vw - 320) / (1920 - 320));
    this.lensHeight = Math.max(minH, Math.min(maxH, calcH));
  }

  public thumbSwiperConfig: SwiperOptions = {
    slidesPerView: 4,
    spaceBetween: 15,
    freeMode: true,
    watchSlidesProgress: true,
    autoplay: { delay: 3500, disableOnInteraction: false },
    breakpoints: {
      0: { slidesPerView: 2 },
      361: { slidesPerView: 3 },
      450: { slidesPerView: 4 },
      992: { slidesPerView: 3 },
      1040: { slidesPerView: 4 },
      1399: { slidesPerView: 3 },
      1470: { slidesPerView: 4 },
    },
  };

  public mainSwiperConfig: SwiperOptions = {
    loop: true,
    effect: 'fade',
    autoplay: { delay: 3500, disableOnInteraction: false },
  };

  public thumbSwiper!: Swiper;
  public mainSwiper!: Swiper;
  public isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.updateLensSize();
      window.addEventListener('resize', () => this.updateLensSize());
    }
  }

  selectedVariant(variant: Variation) {
    this.selectedVariation = variant;
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      const thumbEl = this.thumbSwiperRef()?.nativeElement;
      const mainEl = this.mainSwiperRef()?.nativeElement;

      if (thumbEl) {
        this.thumbSwiper = new Swiper(thumbEl, this.thumbSwiperConfig);
      }

      if (mainEl) {
        this.mainSwiper = new Swiper(mainEl, {
          ...this.mainSwiperConfig,
          thumbs: { swiper: this.thumbSwiper },
        });
      }
    }, 100);
  }

  ngOnChanges() {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      this.thumbSwiper?.update();
      this.mainSwiper?.update();
    }, 300);
  }
}
