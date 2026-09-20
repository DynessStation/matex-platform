import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { ProductBox } from '../../../../../shared/components/product-box/product-box';
import { Product } from '../../../../../shared/interface/product.interface';
import { ProductState } from '../../../../../shared/store/state/product.state';

@Component({
  selector: 'app-collection-recent-product',
  imports: [AsyncPipe, ProductBox],
  templateUrl: './collection-recent-product.html',
  styleUrl: './collection-recent-product.scss',
})
export class CollectionRelatedProduct {
  productIds = input<number[] | null>(null);

  readonly relatedProductSwiperContainer = viewChild<ElementRef>('relatedProductSwiperContainer');

  private store = inject(Store);
  product$: Observable<Product[]> = this.store.select(ProductState.productByIds);

  public swiperOption: SwiperOptions = {
    slidesPerView: 6,
    spaceBetween: 20,
    loop: true,

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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        new Swiper(this.relatedProductSwiperContainer()?.nativeElement, this.swiperOption);
      }, 100);
    }
  }
}
