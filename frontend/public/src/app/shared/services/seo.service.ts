import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { filter, Observable } from 'rxjs';

import { IBlog } from '../interface/blog.interface';
import { IBrand } from '../interface/brand.interface';
import { ICategory } from '../interface/category.interface';
import { Page } from '../interface/page.interface';
import { Product } from '../interface/product.interface';
import { Values } from '../interface/setting.interface';
import { Option } from '../interface/theme-option.interface';
import { BlogState } from '../store/state/blog.state';
import { BrandState } from '../store/state/brand.state';
import { CategoryState } from '../store/state/category.state';
import { PageState } from '../store/state/page.state';
import { ProductState } from '../store/state/product.state';
import { SettingState } from '../store/state/setting.state';
import { ThemeOptionState } from '../store/state/theme-option.state';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private meta = inject(Meta);
  private router = inject(Router);
  private titleService = inject(Title);
  private platformId = inject<Object>(PLATFORM_ID);
  private ngZone = inject(NgZone);

  setting$: Observable<Values> = inject(Store).select(SettingState.setting) as Observable<Values>;
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;
  product$: Observable<Product> = inject(Store).select(
    ProductState.selectedProduct,
  ) as Observable<Product>;
  blog$: Observable<IBlog> = inject(Store).select(BlogState.selectedBlog) as Observable<IBlog>;
  brand$: Observable<IBrand> = inject(Store).select(BrandState.selectedBrand) as Observable<IBrand>;
  page$: Observable<Page> = inject(Store).select(PageState.selectedPage) as Observable<Page>;
  category$: Observable<ICategory> = inject(Store).select(
    CategoryState.selectedCategory,
  ) as Observable<ICategory>;

  public path: string;
  public timeoutId: any;
  private currentMessageIndex = 0;
  private messages: string[];
  private currentMessage: string;
  private delay = 1000; // Delay between messages in milliseconds
  public isTabInFocus = true;
  public product: Product;
  public blog: IBlog;
  public page: Page;
  public brand: IBrand;
  public category: ICategory;
  public themeOption: Option;
  public scoContent: any = {};
  public setting: Values;
  public isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: any) => {
          this.path = event.url;
          document.addEventListener('visibilitychange', () => {
            this.messages = this.themeOption.general.taglines;
            this.ngZone.run(() => {
              this.updateSeo(this.path);
            });
          });
          this.updateSeo(this.path);
        });

      this.fetchData();
    }
  }

  fetchData() {
    this.setting$.subscribe((val) => (this.setting = val));
    this.product$.subscribe((product) => (this.product = product));
    this.blog$.subscribe((blog) => (this.blog = blog));
    this.page$.subscribe((page) => (this.page = page));
    this.brand$.subscribe((brand) => (this.brand = brand));
    this.category$.subscribe((blog) => (this.category = blog));
    this.themeOption$.subscribe((option) => {
      this.themeOption = option;
      if (this.path) this.updateSeo(this.path);
    });
  }

  updateSeo(path: string) {
    if (path.includes('product') || path.includes('produk')) {
      if (this.product) {
        this.scoContent = {
          og_type: 'website',
          url: this.product.canonical_url || window.location.href,
          og_title: this.product.og_title || this.product.meta_title || this.themeOption?.seo?.meta_title,
          og_description: this.product.og_description || this.product.meta_description || this.themeOption?.seo?.meta_description,
          og_image:
            this.product.product_meta_image?.original_url ||
            this.themeOption?.seo?.og_image?.original_url,
        };
      }
      this.customSCO();
    } else if (this.isArticleDetail(path)) {
      if (this.blog) {
        this.scoContent = {
          ...this.scoContent,
          url: this.blog?.canonical_url || window.location.href,
          og_type: 'article',
          og_title:
            this.blog?.og_title || this.blog?.meta_title || this.themeOption?.seo?.meta_title,
          og_description:
            this.blog?.og_description ||
            this.blog?.meta_description ||
            this.themeOption?.seo?.meta_description,
          og_image:
            this.blog?.blog_meta_image?.original_url ||
            this.themeOption?.seo?.og_image?.original_url,
        };
        this.customSCO();
      }
    } else if (this.isArticleList(path)) {
      const english = path.split('?')[0].startsWith('/en/');
      const label = english ? 'Articles' : 'Artikel';
      const siteTitle = this.themeOption?.general?.site_title || 'MATEX';
      this.scoContent = {
        og_type: 'website',
        url: window.location.href,
        og_title: `${label} | ${siteTitle}`,
        og_description: this.themeOption?.seo?.meta_description,
        og_image: this.themeOption?.seo?.og_image?.original_url,
      };
      this.customSCO();
    } else if (path.includes('page')) {
      if (this.page) {
        this.scoContent = {
          ...this.scoContent,
          og_type: 'website',
          url: window.location.href,
          og_title: this.page?.meta_title || this.themeOption?.seo?.meta_title,
          og_description: this.page?.meta_description || this.themeOption?.seo?.meta_description,
          og_image:
            this.page?.page_meta_image?.original_url ||
            this.themeOption?.seo?.og_image?.original_url,
        };
      }
      this.customSCO();
    } else if (path.includes('brand')) {
      if (this.brand) {
        this.scoContent = {
          ...this.scoContent,
          og_type: 'website',
          url: window.location.href,
          og_title: this.brand?.meta_title || this.themeOption?.seo?.meta_title,
          og_description: this.brand?.meta_description || this.themeOption?.seo?.meta_description,
          og_image:
            this.brand?.brand_meta_image?.original_url ||
            this.themeOption?.seo?.og_image?.original_url,
        };
      }
      this.customSCO();
    } else if (path.includes('category') || path.includes('kategori')) {
      if (this.category) {
        this.scoContent = {
          ...this.scoContent,
          og_type: 'website',
          url: this.category?.canonical_url || window.location.href,
          og_title:
            this.category?.og_title ||
            this.category?.meta_title ||
            this.themeOption?.seo?.meta_title,
          og_description:
            this.category?.og_description ||
            this.category?.meta_description ||
            this.themeOption?.seo?.meta_description,
          og_image:
            this.category?.category_meta_image?.original_url ||
            this.themeOption?.seo?.og_image?.original_url,
        };
      }
      this.customSCO();
    } else {
      this.updateDefaultSeo();
    }
  }

  updateDefaultSeo() {
    this.meta.updateTag({ name: 'title', content: this.themeOption?.seo?.meta_title });
    this.meta.updateTag({ name: 'description', content: this.themeOption?.seo?.meta_description });

    // Update Facebook Meta Tags
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: this.scoContent['url'] });
    this.meta.updateTag({ property: 'og:title', content: this.themeOption?.seo?.meta_title });
    this.meta.updateTag({
      property: 'og:description',
      content: this.themeOption?.seo?.meta_description,
    });
    this.meta.updateTag({ property: 'og:image', content: this.scoContent['og_image'] });

    // Update Twitter Meta Tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:url', content: this.scoContent['url'] });
    this.meta.updateTag({ name: 'twitter:title', content: this.themeOption?.seo?.meta_title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: this.themeOption?.seo?.meta_description,
    });
    this.meta.updateTag({ name: 'twitter:image', content: this.scoContent['og_image'] });

    if (this.themeOption?.general && this.themeOption?.general?.exit_tagline_enable) {
      document.addEventListener('visibilitychange', () => {
        this.messages = this.themeOption.general.taglines;
        this.ngZone.run(() => {
          this.isTabInFocus = !document.hidden;
          if (this.isTabInFocus) {
            clearTimeout(this.timeoutId);
            return this.titleService.setTitle(
              this.themeOption?.general?.site_title && this.themeOption?.general?.site_tagline
                ? `${this.themeOption?.general?.site_title} | ${this.themeOption?.general?.site_tagline}`
                : '',
            );
          } else {
            this.updateMessage();
          }
        });
      });
      this.scoContent = {
        ...this.scoContent,
        url: window.location.href,
        og_title: this.themeOption?.seo?.meta_title,
        og_description: this.themeOption?.seo?.meta_description,
        og_image: this.themeOption?.seo?.og_image?.original_url,
      };

      this.customSCO();
    } else {
      return this.titleService.setTitle(
        this.themeOption?.general?.site_title && this.themeOption?.general?.site_tagline
          ? `${this.themeOption?.general?.site_title} | ${this.themeOption?.general?.site_tagline}`
          : '',
      );
    }
  }

  customSCO() {
    const title = this.scoContent['og_title'];
    const description = this.scoContent['og_description'];

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'title', content: title });
    this.meta.updateTag({ name: 'description', content: description });

    // Update Facebook Meta Tags
    this.meta.updateTag({
      property: 'og:type',
      content: this.scoContent['og_type'] || 'website',
    });
    this.meta.updateTag({ property: 'og:url', content: this.scoContent['url'] });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: this.scoContent['og_image'] });

    // Update Twitter Meta Tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:url', content: this.scoContent['url'] });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: this.scoContent['og_image'] });
  }

  private isArticleDetail(path: string): boolean {
    const pathname = path.split('?')[0].split('#')[0];
    return /^\/(?:artikel|blog)\/[^/]+$/.test(pathname) || /^\/en\/article\/[^/]+$/.test(pathname);
  }

  private isArticleList(path: string): boolean {
    const pathname = path.split('?')[0].split('#')[0];
    return ['/artikel', '/articles', '/blogs', '/en/articles', '/en/blogs'].includes(pathname);
  }

  updateMessage() {
    // Clear the previous timeout
    clearTimeout(this.timeoutId);

    // Update the current message
    this.currentMessage = this.messages[this.currentMessageIndex];
    this.titleService.setTitle(this.currentMessage);
    // Increment the message index or reset it to 0 if it reaches the end
    this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;

    // Set a new timeout to call the function again after the specified delay
    this.timeoutId = setTimeout(() => {
      this.updateMessage();
    }, this.delay);
  }

  ngOnDestroy() {
    // Clear the timeout when the component is destroyed
    clearTimeout(this.timeoutId);
  }
}
