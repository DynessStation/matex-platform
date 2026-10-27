import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { combineLatest, Observable } from 'rxjs';

import { ProductThumbnail } from './product-details/product-thumbnail/product-thumbnail';
import { RelatedProduct } from './product-details/widgets/related-product/related-product';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { TProduct } from '../../../shared/interface/product.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { resolvedMissing } from '../../../shared/resolver/resolved-missing';
import { PublicSeoAlternate, PublicSeoService } from '../../../shared/services/public-seo.service';
import { RecentProductService } from '../../../shared/services/recent-product.service';
import { ProductState } from '../../../shared/store/state/product.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { Error404 } from '../../page/error-404/error-404';

@Component({
  selector: 'app-product',
  imports: [AsyncPipe, ProductThumbnail, RelatedProduct, Breadcrumb, Error404],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product {
  // Nothing found by the resolver: show the 404 view (status 404) instead.
  readonly missing = resolvedMissing();

  private store = inject(Store);
  product$: Observable<TProduct | null> = this.store.select(ProductState.selectedProduct);
  themeOptions$: Observable<Option> = this.store.select(ThemeOptionState.themeOptions);

  public breadcrumb: breadcrumb = {
    title: '',
    items: [],
  };
  public layout: string = 'product_thumbnail';
  public product: TProduct;
  public isScrollActive = false;
  public isBrowser: boolean;
  private platformId = inject<Object>(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private recentProducts = inject(RecentProductService);
  private seo = inject(PublicSeoService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Route data too: the product may load before the resolver's answer reaches the route.
    combineLatest([this.product$, this.route.data])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([product, data]) => {
        if (!product || data['data'] === false) return;
        this.breadcrumb.items = [];
        this.breadcrumb.title = product.name;
        this.breadcrumb.items.push(
          {
            label: this.isEnglish ? 'Products' : 'Produk',
            url: this.isEnglish ? '/en/catalog' : '/katalog',
            active: false,
          },
          { label: product.name, active: true },
        );
        this.product = product;
        this.recentProducts.add(product);
        this.applySeo(product);
      });

    // One product layout; the Kartify demo layouts (switched with ?layout=) were removed in 6B.
    this.themeOptions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (option) => (this.layout = option?.product?.product_layout || 'product_thumbnail'),
      );
  }

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.isBrowser && this.product?.internal_commerce_enabled && !this.product?.is_external) {
      if (window.scrollY > 50) {
        this.isScrollActive = true;
        document.body.classList.add('stickyCart');
      } else {
        this.isScrollActive = false;
        document.body.classList.remove('stickyCart');
      }
    }
  }

  ngOnDestroy() {
    this.seo.clear();
    if (this.isBrowser) {
      document.body.classList.remove('stickyCart');
    }
  }

  private applySeo(product: TProduct): void {
    const locale: 'id-ID' | 'en-US' = this.isEnglish ? 'en-US' : 'id-ID';
    const currentPath = `${this.isEnglish ? '/en/product/' : '/produk/'}${encodeURIComponent(product.slug)}`;
    const canonical = this.seo.canonicalUrl(currentPath, product.canonical_url);
    const description =
      product.meta_description || product.short_description || product.description || '';
    const image =
      product.product_meta_image?.original_url || product.product_thumbnail?.original_url;
    const alternates: PublicSeoAlternate[] = [
      {
        locale: 'id-ID',
        path: `/produk/${encodeURIComponent(product.localized_slugs?.['id-ID'] || product.slug)}`,
      },
      {
        locale: 'en-US',
        path: `/en/product/${encodeURIComponent(product.localized_slugs?.['en-US'] || product.slug)}`,
      },
    ];
    const offer =
      product.price_visibility === 'displayed' && Number(product.price) > 0
        ? {
            '@type': 'Offer',
            priceCurrency: product.currency || 'IDR',
            price: Number(product.sale_price || product.price),
            availability:
              product.stock_status === 'in_stock'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            url: canonical,
          }
        : undefined;

    this.seo.apply({
      locale,
      title: product.meta_title || `${product.name} | MATEX`,
      description,
      canonicalPath: currentPath,
      canonicalUrl: canonical,
      alternates,
      type: 'product',
      socialTitle: product.og_title || product.meta_title || product.name,
      socialDescription: product.og_description || description,
      image,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: this.seo.toPlainText(description),
        image: image ? [image] : undefined,
        sku: product.sku || undefined,
        brand: product.brand?.name
          ? { '@type': 'Brand', name: product.brand.name }
          : { '@type': 'Brand', name: 'MATEX' },
        category: product.categories?.map((category) => category.name).join(', ') || undefined,
        url: canonical,
        offers: offer,
      },
    });
  }
}
