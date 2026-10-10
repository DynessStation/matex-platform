import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  Inject,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import SwiperCore, { Swiper } from 'swiper';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Category } from '../../interface/category.interface';
import { CategoryState } from '../../store/state/category.state';

SwiperCore.use([Navigation, Pagination, Autoplay, EffectFade]);

@Component({
  selector: 'app-categories',
  imports: [RouterModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class HomeCategory {
  categoryIds = input<number[] | null>(null);
  type = input<string>('default');

  readonly categorySwiperContainer = viewChild<ElementRef>('categorySwiperContainer');

  public options: SwiperOptions = {
    slidesPerView: 10,
    spaceBetween: 24,
    breakpoints: {
      0: { slidesPerView: 2, spaceBetween: 8 },
      380: { slidesPerView: 3, spaceBetween: 8 },
      500: { slidesPerView: 4, spaceBetween: 8 },
      660: { slidesPerView: 5, spaceBetween: 8 },
      850: { slidesPerView: 6 },
      991: { slidesPerView: 7 },
      1242: { slidesPerView: 8 },
      1288: { slidesPerView: 9 },
      1388: { slidesPerView: 10 },
    },
  };

  swiperOptions = input<SwiperOptions>(this.options);

  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private readonly categoryState = this.store.selectSignal(CategoryState.category);
  private swiper?: Swiper;

  public categories: Category[] = [];
  public selectedCategorySlug: string[] = [];

  constructor(
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.selectedCategorySlug = params['category'] ? params['category'].split(',') : [];
    });

    effect(() => {
      const result = this.categoryState();
      const ids = this.categoryIds();
      this.categories = ids?.length
        ? this.getCategoriesByIds(result.data, ids)
        : result.data.map((category) => category);
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const container = this.categorySwiperContainer()?.nativeElement;
        if (container) this.swiper = new Swiper(container, this.swiperOptions());
      }, 100);
    }
  }

  ngOnDestroy() {
    this.swiper?.destroy(true, true);
  }

  getCategoriesByIds(categories: Category[], ids: number[]): Category[] {
    let matchedCategories: Category[] = [];

    categories.forEach((category) => {
      if (ids.includes(category.id)) {
        matchedCategories.push(category);
      }
      if (category.subcategories?.length) {
        matchedCategories.push(...this.getCategoriesByIds(category.subcategories, ids));
      }
    });

    return matchedCategories;
  }
}
