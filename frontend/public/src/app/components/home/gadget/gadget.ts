import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Attachment } from '../../../shared/interface/attachment.interface';
import { IBlog } from '../../../shared/interface/blog.interface';
import { Category } from '../../../shared/interface/category.interface';
import { Product } from '../../../shared/interface/product.interface';
import { GadgetTheme } from '../../../shared/interface/theme.interface';
import { BlogService } from '../../../shared/services/blog.service';
import { CategoryService } from '../../../shared/services/category.service';
import { ProductService } from '../../../shared/services/product.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeNewsletter } from '../widgets/home-newsletter/home-newsletter';

interface HomeContent {
  categories: Category[];
  products: Product[];
  articles: IBlog[];
}

@Component({
  selector: 'app-gadget',
  imports: [AsyncPipe, DatePipe, HomeBanner, HomeNewsletter, RouterLink],
  templateUrl: './gadget.html',
  styleUrl: './gadget.scss',
})
export class Gadget {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private blogService = inject(BlogService);
  private navigation = inject(PublicNavigationContextService);
  private themeOptionService = inject(ThemeOptionService);

  data = input<GadgetTheme>();
  slug = input<string>();

  readonly content$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      forkJoin({
        categories: this.categoryService
          .getCategories({ status: 1 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
        products: this.productService
          .getProducts({ status: 1 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
        articles: this.blogService
          .getBlogs(locale, { page: 1, paginate: 3 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
      }),
    ),
    map(({ categories, products, articles }): HomeContent => ({
      categories: [...categories.data]
        .sort(
          (a, b) =>
            Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
            Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        )
        .slice(0, 6),
      products: [...products.data]
        .sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
        .slice(0, 8),
      articles: [...articles.data]
        .sort(
          (a, b) =>
            Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
            Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''),
        )
        .slice(0, 3),
    })),
    tap(() => this.themeOptionService.preloader.set(false)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  get locale(): string {
    return this.navigation.locale();
  }

  get isEnglish(): boolean {
    return this.locale === 'en-US';
  }

  get catalogPath(): string {
    return this.isEnglish ? '/en/catalog' : '/katalog';
  }

  get articlesPath(): string {
    return this.isEnglish ? '/en/articles' : '/artikel';
  }

  categoryPath(slug: string): string {
    return this.isEnglish ? `/en/category/${slug}` : `/kategori/${slug}`;
  }

  productPath(slug: string): string {
    return this.isEnglish ? `/en/product/${slug}` : `/produk/${slug}`;
  }

  articlePath(slug: string): string {
    return this.isEnglish ? `/en/article/${slug}` : `/artikel/${slug}`;
  }

  imageUrl(attachment: Attachment | null | undefined, fallback: string): string {
    return attachment?.asset_url || attachment?.original_url || fallback;
  }

  displayPrice(product: Product): string | null {
    if (product.price_visibility !== 'displayed' || !product.sale_price) return null;

    return new Intl.NumberFormat(this.isEnglish ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: product.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(product.sale_price);
  }
}
