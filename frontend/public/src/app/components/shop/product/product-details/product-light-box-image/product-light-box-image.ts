import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';

import {
  Gallery,
  GalleryItem,
  GalleryModule,
  ImageItem,
  ImageSize,
  ThumbnailsPosition,
} from 'ng-gallery';
import { Lightbox, LightboxModule } from 'ng-gallery/lightbox';
import Swiper from 'swiper';
import { EffectFade, FreeMode, Thumbs } from 'swiper/modules';

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
  selector: 'app-product-light-box-image',
  standalone: true,
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
    GalleryModule,
    LightboxModule,
  ],
  templateUrl: './product-light-box-image.html',
  styleUrl: './product-light-box-image.scss',
})
export class ProductLightBoxImage {
  product = input<Product | null>(null);
  option = input<Option | null>();
  layout = input<string>();
  private gallery = inject(Gallery);
  private lightbox = inject(Lightbox);

  public selectedVariation!: Variation;

  readonly mainSwiperRef = viewChild<ElementRef>('mainSwiper');
  readonly thumbSwiperRef = viewChild<ElementRef>('thumbSwiper');

  thumbSwiperConfig = {
    slidesPerView: 4,
    spaceBetween: 15,
    freeMode: true,
    watchSlidesProgress: true,
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

  mainSwiperConfig = {
    loop: true,
    effect: 'fade',
  };

  thumbSwiper!: Swiper;
  mainSwiper!: Swiper;
  public items: GalleryItem[] = [];
  public isBrowser: boolean;
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.items =
      this.product()?.product_galleries?.map(
        (gallery) => new ImageItem({ src: gallery.asset_url, thumb: gallery.asset_url }),
      ) ?? [];

    const lightboxRef = this.gallery.ref('lightbox');
    lightboxRef.setConfig({
      imageSize: ImageSize.Cover,
      thumbPosition: ThumbnailsPosition.Bottom,
    });

    lightboxRef.load(this.items);
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
    });
  }

  openLightbox(index: number) {
    this.lightbox.open(index, 'lightbox');
  }
}
