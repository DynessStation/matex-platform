import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { ClickOutsideDirective } from '../../../../directive/out-side-directive';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';
import { BlogState } from '../../../../store/state/blog.state';
import { CategoryState } from '../../../../store/state/category.state';
import { ProductState } from '../../../../store/state/product.state';

@Component({
  selector: 'app-language',
  imports: [ClickOutsideDirective],
  templateUrl: './language.html',
  styleUrl: './language.scss',
})
export class Language {
  private router = inject(Router);
  private store = inject(Store);
  public navigation = inject(PublicNavigationContextService);
  public active = false;

  openDropDown(): void {
    this.active = !this.active;
  }

  hideDropdown(): void {
    this.active = false;
  }

  selectLocale(locale: 'id-ID' | 'en-US'): void {
    this.active = false;
    void this.router.navigateByUrl(this.localizedPath(locale));
  }

  private localizedPath(locale: 'id-ID' | 'en-US'): string {
    const current = this.router.url.split('?')[0].split('#')[0];
    const mappings: Array<[RegExp, (match: RegExpMatchArray) => string]> =
      locale === 'en-US'
        ? [
            [/^\/$|^\/home$/, () => '/en'],
            [/^\/katalog$/, () => '/en/catalog'],
            [
              /^\/kategori\/([^/]+)$/,
              (match) => `/en/category/${this.categorySlug(match[1], locale)}`,
            ],
            [/^\/produk\/([^/]+)$/, (match) => `/en/product/${this.productSlug(match[1], locale)}`],
            [/^\/artikel$/, () => '/en/articles'],
            [
              /^\/artikel\/([^/]+)$/,
              (match) => `/en/article/${this.articleSlug(match[1], locale)}`,
            ],
            [/^\/kontak$/, () => '/en/contact-us'],
            [/^\/tentang-matex$/, () => '/en/about-matex'],
            [/^\/faq$/, () => '/en/faq'],
            [/^\/search$/, () => '/en/search'],
          ]
        : [
            [/^\/en$/, () => '/'],
            [/^\/en\/catalog$/, () => '/katalog'],
            [
              /^\/en\/category\/([^/]+)$/,
              (match) => `/kategori/${this.categorySlug(match[1], locale)}`,
            ],
            [
              /^\/en\/product\/([^/]+)$/,
              (match) => `/produk/${this.productSlug(match[1], locale)}`,
            ],
            [/^\/en\/articles$/, () => '/artikel'],
            [
              /^\/en\/article\/([^/]+)$/,
              (match) => `/artikel/${this.articleSlug(match[1], locale)}`,
            ],
            [/^\/en\/contact-us$/, () => '/kontak'],
            [/^\/en\/about-matex$/, () => '/tentang-matex'],
            [/^\/en\/faq$/, () => '/faq'],
            [/^\/en\/search$/, () => '/search'],
          ];

    for (const [pattern, destination] of mappings) {
      const match = current.match(pattern);
      if (match) return destination(match);
    }

    if (locale === 'en-US') return current.startsWith('/en/') ? current : `/en${current}`;
    return current.replace(/^\/en(?=\/|$)/, '') || '/';
  }

  private productSlug(currentSlug: string, locale: 'id-ID' | 'en-US'): string {
    const product = this.store.selectSnapshot(ProductState.selectedProduct);
    return product?.slug === currentSlug
      ? product.localized_slugs?.[locale] || currentSlug
      : currentSlug;
  }

  private categorySlug(currentSlug: string, locale: 'id-ID' | 'en-US'): string {
    const category = this.store.selectSnapshot(CategoryState.selectedCategory);
    return category?.slug === currentSlug
      ? category.localized_slugs?.[locale] || currentSlug
      : currentSlug;
  }

  private articleSlug(currentSlug: string, locale: 'id-ID' | 'en-US'): string {
    const article = this.store.selectSnapshot(BlogState.selectedBlog);
    return article?.slug === currentSlug
      ? article.localized_slugs?.[locale] || currentSlug
      : currentSlug;
  }
}
