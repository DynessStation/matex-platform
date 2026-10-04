import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  Inject,
  inject,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import { Store } from '@ngxs/store';
import { catchError, combineLatest, Observable, of } from 'rxjs';
import SwiperCore, { Swiper } from 'swiper';
import { EffectCards, Navigation } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { IAboutUs, Option } from '../../../shared/interface/theme-option.interface';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { WebsitePageService } from '../../../shared/services/website-page.service';
import { PublicPageContextService } from '../../../shared/services/public-page-context.service';
import { IPublicWebsitePage } from '../../../shared/interface/website-page.interface';
import { environment } from '../../../../environments/environment';

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

  private readonly publicPageContext = inject(PublicPageContextService);

  private readonly title = inject(Title);

  private readonly meta = inject(Meta);

  private readonly document = inject(DOCUMENT);

  private readonly originalLang = this.document.documentElement.lang;

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

  public breadcrumb: breadcrumb = this.createBreadcrumb();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const locale = this.route.snapshot.data['locale'] === 'en-US' ? 'en-US' : 'id-ID';
    const path = locale === 'en-US' ? 'about-matex' : 'tentang-matex';

    combineLatest([
      this.themeOptions$,
      this.websitePageService.getPage(locale, path).pipe(catchError(() => of(null))),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([option, page]) => {
        const template = option?.about_us;
        if (!template) return;

        const contentImage = page?.media.find((media) => media.slot === 'about_content');

        this.aboutUs = {
          ...template,
          about: {
            ...template.about,
            title: page?.title || this.breadcrumb.title,
            description: page?.summary || '',
            futures: this.readAboutFeatures(page?.content),
            content_bg_image_url: contentImage?.asset_url || template.about.content_bg_image_url,
          },
          team: {
            ...template.team,
            status: false,
            members: [],
          },
        };

        if (page) {
          this.publicPageContext.setPage(page);
          this.applySeo(page);
        }
      });

    this.destroyRef.onDestroy(() => {
      this.publicPageContext.clearPage();
      this.document.head.querySelectorAll('link[data-about-seo]').forEach((link) => link.remove());
      this.document.documentElement.lang = this.originalLang;
    });
  }

  private applySeo(page: IPublicWebsitePage): void {
    this.document.documentElement.lang = page.locale;
    this.title.setTitle(page.seo.title);

    for (const name of ['description', 'keywords', 'robots'] as const) {
      this.meta.updateTag({ name, content: page.seo[name] });
    }

    const site = environment.cmsSiteURL.replace(/\/$/, '');
    const fallbackUrl = `${site}${this.publicPageContext.pathFor(
      page.locale,
      page.path,
      page.key,
    )}`;
    let canonical = fallbackUrl;

    try {
      const candidate = new URL(page.seo.canonical_url || fallbackUrl);
      if (candidate.protocol === 'http:' || candidate.protocol === 'https:') {
        canonical = candidate.href;
      }
    } catch {
      /* Invalid custom canonical falls back to the fixed public route. */
    }

    this.addSeoLink('canonical', canonical);
    for (const translation of page.translations) {
      this.addSeoLink(
        'alternate',
        `${site}${this.publicPageContext.pathFor(translation.locale, translation.path, page.key)}`,
        translation.locale,
      );
    }

    const image =
      page.media.find((item) => item.slot === 'og') ||
      page.media.find((item) => item.slot === 'about_content');

    for (const [property, content] of Object.entries({
      'og:type': 'website',
      'og:url': canonical,
      'og:title': page.seo.social_title,
      'og:description': page.seo.social_description,
      'og:locale': page.locale.replace('-', '_'),
      'og:image': image?.asset_url || '',
    })) {
      this.meta.updateTag({ property, content });
    }
  }

  private addSeoLink(rel: string, href: string, locale?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-about-seo', '');
    link.rel = rel;
    link.href = href;
    if (locale) link.hreflang = locale;
    this.document.head.appendChild(link);
  }

  private readAboutFeatures(content: unknown): IAboutUs['about']['futures'] {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return [];

    const features = (content as Record<string, unknown>)['features'];
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
      .slice(0, 6);
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
