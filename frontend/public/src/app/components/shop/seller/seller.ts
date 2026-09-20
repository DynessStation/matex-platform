import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, inject, PLATFORM_ID, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import SwiperCore, { Swiper } from 'swiper';
import { EffectCards, Navigation } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

SwiperCore.use([Navigation, EffectCards]);

@Component({
  selector: 'app-seller',
  imports: [RouterModule, HomeNewsletter, Breadcrumb],
  templateUrl: './seller.html',
  styleUrl: './seller.scss',
})
export class Seller {
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: 'Become Seller',
    items: [{ label: 'Become Seller', active: true }],
  };

  public data?: Option;

  public optionReviewSwiper: SwiperOptions = {
    navigation: {
      prevEl: '.slidePrev-btn',
      nextEl: '.slideNext-btn',
    },
    direction: 'vertical',
    effect: 'cards',
    grabCursor: true,
  };

  public optionSellingSteps: SwiperOptions = {
    slidesPerView: 4,
    loop: true,
    spaceBetween: 0,
    breakpoints: {
      0: {
        slidesPerView: 1,
      },
      700: {
        slidesPerView: 2,
      },
      1150: {
        slidesPerView: 3,
      },
      1530: {
        slidesPerView: 4,
      },
    },
  };

  readonly swiperContainer = viewChild<ElementRef>('swiperContainer');
  readonly sellingStepsSwiperContainer = viewChild<ElementRef>('sellingStepsSwiperContainer');

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.themeOption$.subscribe((data) => (this.data = data));
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const container1 = this.swiperContainer()?.nativeElement;
        if (container1) {
          new Swiper(container1, this.optionReviewSwiper);
        }

        const container2 = this.sellingStepsSwiperContainer()?.nativeElement;
        if (container2) {
          new Swiper(container2, this.optionSellingSteps);
        }
      }, 100);
    }
  }
}
