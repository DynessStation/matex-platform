import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { ProductFullWidth } from './product-details/product-full-width/product-full-width';
import { ProductImage } from './product-details/product-image/product-image';
import { ProductLightBoxImage } from './product-details/product-light-box-image/product-light-box-image';
import { ProductSlider } from './product-details/product-slider/product-slider';
import { ProductSticky } from './product-details/product-sticky/product-sticky';
import { ProductThumbnail } from './product-details/product-thumbnail/product-thumbnail';
import { ProductZoom } from './product-details/product-zoom/product-zoom';
import { RelatedProduct } from './product-details/widgets/related-product/related-product';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { TProduct } from '../../../shared/interface/product.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { ProductState } from '../../../shared/store/state/product.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';

@Component({
  selector: 'app-product',
  imports: [
    AsyncPipe,
    ProductThumbnail,
    RelatedProduct,
    ProductImage,
    ProductSlider,
    ProductSticky,
    ProductFullWidth,
    ProductLightBoxImage,
    Breadcrumb,
    ProductZoom,
    AsyncPipe,
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product {
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

  constructor(private route: ActivatedRoute) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.product$.subscribe((product) => {
      if (!product) return;
      this.breadcrumb.items = [];
      this.breadcrumb.title = product.name;
      this.breadcrumb.items.push(
        { label: 'Product', active: true },
        { label: product.name, active: false },
      );
      this.product = product;
    });

    // For Demo Purpose only
    this.route.queryParams.subscribe((params) => {
      if (params['layout']) {
        this.layout = params['layout'];
      } else {
        // Get Product Layout
        this.themeOptions$.subscribe((option) => {
          this.layout =
            option?.product && option?.product?.product_layout
              ? option?.product?.product_layout
              : 'product_thumbnail';
        });
      }
      this.setBreadcrumb();
    });
    this.setBreadcrumb();
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.isBrowser) {
      if (window.scrollY > 50) {
        this.isScrollActive = true;
        document.body.classList.add('stickyCart');
      } else {
        this.isScrollActive = false;
        document.body.classList.remove('stickyCart');
      }
    }
  }

  setBreadcrumb() {
    const layoutParam = this.route.snapshot.queryParamMap.get('layout');
    if (layoutParam) {
      this.breadcrumb.title = layoutParam;
      this.breadcrumb.items = [{ label: layoutParam }];
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      document.body.classList.remove('stickyCart');
    }
  }
}
