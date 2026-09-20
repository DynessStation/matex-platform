import {
  Component,
  ElementRef,
  Inject,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { combineLatest, map, Observable } from 'rxjs';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { ProductBox } from '../../../../../../shared/components/product-box/product-box';
import { Product } from '../../../../../../shared/interface/product.interface';
import { ProductState } from '../../../../../../shared/store/state/product.state';

@Component({
  selector: 'app-related-product',
  imports: [ProductBox, TranslateModule, AsyncPipe],
  templateUrl: './related-product.html',
  styleUrl: './related-product.scss',
})
export class RelatedProduct {
  product = input<Product>();

  private store = inject(Store);
  relatedProduct$: Observable<Product[]> = this.store.select(ProductState.relatedProducts);

  public matchedRelatedProducts$: Observable<Product[]> = combineLatest([
    toObservable(this.product),
    this.relatedProduct$
  ]).pipe(
    map(([product, products]) => {
      if (product?.related_products && Array.isArray(product.related_products)) {
        return products.filter((p) => product.related_products?.includes(p?.id)) || [];
      }
      return [];
    })
  );

  readonly relatedProductSwiperContainer = viewChild<ElementRef>('relatedProductSwiperContainer');

  public swiperOption: SwiperOptions = {
    slidesPerView: 6,
    spaceBetween: 20,
    loop: true,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      767: {
        slidesPerView: 3,
        spaceBetween: 15,
      },
      1000: {
        slidesPerView: 4,
        spaceBetween: 15,
        autoplay: false,
      },
      1370: {
        slidesPerView: 5,
        spaceBetween: 20,
        autoplay: false,
      },
      1632: {
        slidesPerView: 6,
        autoplay: false,
      },
    },
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  // Removed manual subscription in ngOnChanges

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        new Swiper(this.relatedProductSwiperContainer()?.nativeElement, this.swiperOption);
      }, 100);
    }
  }
}
