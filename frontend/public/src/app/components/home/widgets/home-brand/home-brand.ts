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
import { RouterLink } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import Swiper from 'swiper';

import { Brand, BrandModel } from '../../../../shared/interface/brand.interface';
import { BrandState } from '../../../../shared/store/state/brand.state';

@Component({
  selector: 'app-home-brand',
  imports: [RouterLink],
  templateUrl: './home-brand.html',
  styleUrl: './home-brand.scss',
})
export class HomeBrand {
  brandIds = input<number[]>();
  className = input<string>('brand-box');

  private store = inject(Store);

  readonly brandSwiperContainer = viewChild<ElementRef>('brandSwiperContainer');
  brand$: Observable<BrandModel> = this.store.select(BrandState.brand);

  public brands: Brand[];

  public swiperOption = {
    spaceBetween: 15,
    slidesPerView: 6,
    freeMode: true,
    loop: true,

    navigation: {
      nextEl: '.brand-next',
      prevEl: '.brand-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 8,
      },
      480: {
        slidesPerView: 3,
        spaceBetween: 8,
      },
      620: {
        slidesPerView: 4,
      },
      810: {
        slidesPerView: 5,
      },
      1199: {
        slidesPerView: 6,
      },
      1200: {
        slidesPerView: 5,
      },
      1600: {
        slidesPerView: 6,
      },
    },
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnChanges() {
    if (this.brandIds() && this.brandIds()?.length) {
      this.brand$.subscribe(
        (res) => (this.brands = res.data.filter((brand) => this.brandIds()?.includes(brand.id))),
      );
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        new Swiper(this.brandSwiperContainer()?.nativeElement, this.swiperOption);
      }, 100);
    }
  }
}
