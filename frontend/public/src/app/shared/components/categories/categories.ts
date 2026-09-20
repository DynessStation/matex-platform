import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import SwiperCore, { Swiper } from 'swiper';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { Category, CategoryModel } from '../../interface/category.interface';
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
  category$: Observable<CategoryModel> = this.store.select(CategoryState.category);

  public categories: Category[];
  public selectedCategorySlug: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.route.queryParams.subscribe((params) => {
      this.selectedCategorySlug = params['category'] ? params['category'].split(',') : [];
    });

    this.category$.subscribe((res) => (this.categories = res.data.map((category) => category)));
  }

  ngOnChanges() {
    if (this.categoryIds() && this.categoryIds()?.length) {
      this.category$.subscribe(
        (res) => (this.categories = this.getCategoriesByIds(res.data, this.categoryIds()!)),
      );
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        new Swiper(this.categorySwiperContainer()?.nativeElement, this.swiperOptions());
      }, 100);
    }
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
