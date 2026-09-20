import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, inject, PLATFORM_ID, viewChild } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import SwiperCore, { Swiper } from 'swiper';
import { EffectCards, Navigation } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { IAboutUs, Option } from '../../../shared/interface/theme-option.interface';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

SwiperCore.use([Navigation, EffectCards]);

@Component({
  selector: 'app-about-us',
  imports: [HomeNewsletter, Breadcrumb],
  templateUrl: './about-us.html',
  styleUrl: './about-us.scss',
})
export class AboutUs {
  themeOptions$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  readonly teamSwiperContainer = viewChild<ElementRef>('teamSwiperContainer');
  readonly testimonialSwiperContainer = viewChild<ElementRef>('testimonialSwiperContainer');

  public optionTeamSwiper: SwiperOptions = {
    slidesPerView: 5,
    spaceBetween: 46,
    loop: true,
    breakpoints: {
      0: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      575: {
        slidesPerView: 3,
        spaceBetween: 15,
      },
      858: {
        slidesPerView: 3,
        spaceBetween: 30,
      },
      1320: {
        slidesPerView: 4,
        spaceBetween: 30,
      },
      1600: {
        slidesPerView: 5,
      },
    },
  };

  public optionTestimonialSwiper: SwiperOptions = {
    navigation: {
      prevEl: '.slidePrev-btn',
      nextEl: '.slideNext-btn',
    },
    direction: 'vertical',
    effect: 'cards',
    grabCursor: true,
  };

  public aboutUs?: IAboutUs;

  public breadcrumb: breadcrumb = {
    title: 'About us',
    items: [{ label: 'About us', active: true }],
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.themeOptions$.subscribe((option) => {
      this.aboutUs = option?.about_us;
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const container1 = this.teamSwiperContainer()?.nativeElement;
        if (container1) {
          new Swiper(container1, this.optionTeamSwiper);
        }

        const container2 = this.testimonialSwiperContainer()?.nativeElement;
        if (container2) {
          new Swiper(container2, this.optionTestimonialSwiper);
        }
      }, 100);
    }
  }
}
