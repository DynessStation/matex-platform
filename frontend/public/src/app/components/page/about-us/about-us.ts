import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  Inject,
  inject,
  PLATFORM_ID,
  RESPONSE_INIT,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { catchError, of, timeout } from 'rxjs';
import SwiperCore, { Swiper } from 'swiper';
import { EffectCards, Navigation } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { IAboutUs } from '../../../shared/interface/theme-option.interface';
import { WebsitePageSeoService } from '../../../shared/services/website-page-seo.service';
import { WebsitePageService } from '../../../shared/services/website-page.service';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

SwiperCore.use([Navigation, EffectCards]);

@Component({
  selector: 'app-about-us',
  imports: [HomeNewsletter, Breadcrumb],
  templateUrl: './about-us.html',
  styleUrl: './about-us.scss',
})
export class AboutUs {
  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  private readonly websitePageService = inject(WebsitePageService);

  private readonly websiteSeo = inject(WebsitePageSeoService);

  private readonly document = inject(DOCUMENT);

  private readonly response = inject(RESPONSE_INIT, { optional: true });

  private readonly originalLang = this.document.documentElement.lang;

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

  public aboutImageAlt = '';

  readonly pageState = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');

  public breadcrumb: breadcrumb = this.createBreadcrumb();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const locale = this.route.snapshot.data['locale'] === 'en-US' ? 'en-US' : 'id-ID';
    const path = locale === 'en-US' ? 'about-matex' : 'tentang-matex';

    this.websiteSeo.prepare();

    if (this.response) {
      const headers = new Headers(this.response.headers);
      headers.set('Cache-Control', 'no-store');
      this.response.headers = headers;
    }

    this.websitePageService
      .getPage(locale, path)
      .pipe(
        timeout(15000),
        catchError((error: unknown) => {
          const missing = error instanceof HttpErrorResponse && error.status === 404;
          this.pageState.set(missing ? 'missing' : 'error');
          if (this.response) this.response.status = missing ? 404 : 503;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (!page) return;

        const contentImage = page.media.find((media) => media.slot === 'about_content');
        this.aboutImageAlt = contentImage?.alt_text || page.title;

        this.aboutUs = {
          about: {
            status: true,
            title: page.title,
            description: page.summary || '',
            futures: this.readAboutFeatures(page.content),
            content_bg_image_url:
              contentImage?.asset_url || 'assets/images/inner-page/about-us.jpg',
          },
          team: {
            status: false,
            sub_title: '',
            title: '',
            description: '',
            members: [],
          },
          testimonial: {
            status: false,
            sub_title: '',
            title: locale === 'en-US' ? 'Testimonials' : 'Testimoni',
            description: '',
            reviews: [],
          },
        };
        this.breadcrumb.title = page.title;
        this.breadcrumb.items = [{ label: page.title, active: true }];
        this.pageState.set('ready');
        this.websiteSeo.apply(page);
      });

    this.destroyRef.onDestroy(() => {
      this.websiteSeo.clear();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  pageMessage(indonesian: string, english: string): string {
    return this.route.snapshot.data['locale'] === 'en-US' ? english : indonesian;
  }

  private readAboutFeatures(content: unknown): IAboutUs['about']['futures'] {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return [];

    const source = content as Record<string, unknown>;
    const features =
      source['about_contract_version'] === 1 && Array.isArray(source['highlights'])
        ? source['highlights']
        : source['features'];
    if (!Array.isArray(features)) return [];

    return features
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
      .map((item) => ({
        icon: typeof item['icon'] === 'string' ? item['icon'] : '',
        title: typeof item['title'] === 'string' ? item['title'] : '',
        description: typeof item['description'] === 'string' ? item['description'] : '',
      }))
      .filter((item) => item.title && item.description)
      .slice(0, 3);
  }

  private createBreadcrumb(): breadcrumb {
    const english = this.route.snapshot.data['locale'] === 'en-US';
    const title = english ? 'About MATEX' : 'Tentang MATEX';

    return {
      title,
      items: [{ label: title, active: true }],
    };
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
