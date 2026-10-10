import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import Swiper from 'swiper';
import { Navigation } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { ProductBox } from '../../../../../shared/components/product-box/product-box';
import { Product } from '../../../../../shared/interface/product.interface';
import { RecentProductService } from '../../../../../shared/services/recent-product.service';

@Component({
  selector: 'app-collection-categories',
  imports: [ProductBox],
  templateUrl: './collection-categories.html',
  styleUrl: './collection-categories.scss',
})
export class CollectionCategories {
  private recentProductService = inject(RecentProductService);
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);
  private swiper?: Swiper;

  readonly swiperContainer = viewChild<ElementRef<HTMLElement>>('swiperContainer');
  readonly previousButton = viewChild<ElementRef<HTMLElement>>('previousButton');
  readonly nextButton = viewChild<ElementRef<HTMLElement>>('nextButton');

  products: Product[] = [];

  constructor() {
    afterNextRender(() => {
      this.products = this.recentProductService.get();
      this.changeDetector.detectChanges();
      this.initializeSwiper();
    });
  }

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }

  private readonly swiperOptions: SwiperOptions = {
    modules: [Navigation],
    slidesPerView: 6,
    spaceBetween: 20,
    watchOverflow: true,
    breakpoints: {
      0: { slidesPerView: 2, spaceBetween: 12 },
      576: { slidesPerView: 3, spaceBetween: 15 },
      768: { slidesPerView: 4, spaceBetween: 15 },
      1200: { slidesPerView: 5 },
      1500: { slidesPerView: 6 },
    },
  };

  private initializeSwiper() {
    const container = this.swiperContainer()?.nativeElement;
    if (!container || this.products.length === 0) return;

    this.swiper?.destroy(true, true);
    this.swiper = new Swiper(container, {
      ...this.swiperOptions,
      navigation: {
        prevEl: this.previousButton()?.nativeElement,
        nextEl: this.nextButton()?.nativeElement,
      },
    });
  }

  ngOnDestroy() {
    this.swiper?.destroy(true, true);
  }
}
