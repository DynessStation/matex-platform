import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';

import { Category } from '../../../../interface/category.interface';
import { Product } from '../../../../interface/product.interface';
import { IPublicNavigationItem } from '../../../../interface/public-navigation.interface';
import { CategoryService } from '../../../../services/category.service';
import { MenuService } from '../../../../services/menu.service';
import { ProductService } from '../../../../services/product.service';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

interface HeaderMenuItem {
  key: string;
  label: string;
  path: string;
  active?: boolean;
  categories?: Category[];
  products?: Product[];
}

@Component({
  selector: 'app-main-menu',
  imports: [AsyncPipe, NgTemplateOutlet, RouterLink],
  templateUrl: './main-menu.html',
  styleUrl: './main-menu.scss',
})
export class MainMenu {
  readonly navClass = input<string>('');
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  public menuService = inject(MenuService);
  public navigation = inject(PublicNavigationContextService);

  readonly items$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      forkJoin({
        categories: this.categoryService
          .getCategories({ status: 1 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
        products: this.productService
          .getProducts({ status: 1 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
      }).pipe(
        map(({ categories, products }) => this.buildItems(locale, categories.data, products.data)),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  toggle(item: HeaderMenuItem, items: HeaderMenuItem[]): void {
    const nextState = !item.active;
    items.forEach((candidate) => (candidate.active = false));
    item.active = nextState;
  }

  close(): void {
    this.menuService.mainMenuToggle = false;
  }

  categoryPath(category: Category): string {
    return this.navigation.locale() === 'en-US'
      ? `/en/category/${category.slug}`
      : `/kategori/${category.slug}`;
  }

  productPath(product: Product): string {
    return this.navigation.locale() === 'en-US'
      ? `/en/product/${product.slug}`
      : `/produk/${product.slug}`;
  }

  imageUrl(product: Product): string {
    return (
      product.product_thumbnail?.asset_url ||
      product.product_thumbnail?.original_url ||
      'assets/images/placeholder/product.png'
    );
  }

  private buildItems(
    locale: string,
    categories: Category[],
    products: Product[],
  ): HeaderMenuItem[] {
    const english = locale === 'en-US';
    const managed = this.navigation.primaryItems();
    const featured = products.filter((product) => product.is_featured).slice(0, 2);
    const featuredIds = new Set(featured.map((product) => product.id));
    const random = products
      .filter((product) => !featuredIds.has(product.id))
      .sort((a, b) => this.stableRank(locale, a) - this.stableRank(locale, b))
      .slice(0, 3);

    return [
      this.linkItem('home', english ? 'Home' : 'Beranda', english ? '/en' : '/', managed),
      this.linkItem(
        'about',
        english ? 'About MATEX' : 'Tentang MATEX',
        english ? '/en/about-matex' : '/tentang-matex',
        managed,
      ),
      {
        ...this.linkItem(
          'categories',
          english ? 'Category' : 'Kategori',
          english ? '/en/catalog' : '/katalog',
          managed,
        ),
        categories,
      },
      {
        ...this.linkItem(
          'products',
          english ? 'Product' : 'Produk',
          english ? '/en/catalog' : '/katalog',
          managed,
        ),
        products: [...featured, ...random],
      },
      this.linkItem(
        'articles',
        english ? 'Blog' : 'Artikel',
        english ? '/en/articles' : '/artikel',
        managed,
        ['blog'],
      ),
      this.linkItem(
        'contact',
        english ? 'Contact' : 'Hubungi',
        english ? '/en/contact-us' : '/kontak',
        managed,
      ),
    ];
  }

  private linkItem(
    key: string,
    label: string,
    path: string,
    managed: IPublicNavigationItem[],
    aliases: string[] = [],
  ): HeaderMenuItem {
    const configured = managed.find((item) => [key, ...aliases].includes(item.key));
    return {
      key,
      label,
      path: configured?.path || path,
    };
  }

  private stableRank(locale: string, product: Product): number {
    const value = `${locale}:${product.id}:${product.slug}`;
    return [...value].reduce((rank, character) => (rank * 31 + character.charCodeAt(0)) >>> 0, 7);
  }
}
