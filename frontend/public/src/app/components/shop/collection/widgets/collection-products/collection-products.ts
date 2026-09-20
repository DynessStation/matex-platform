import { AsyncPipe } from '@angular/common';
import { Component, inject, input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, Subscription } from 'rxjs';

import { ProductBox } from '../../../../../shared/components/product-box/product-box';
import { Params } from '../../../../../shared/interface/core.interface';
import { Product, ProductModel } from '../../../../../shared/interface/product.interface';
import { ProductService } from '../../../../../shared/services/product.service';
import { GetMoreProduct } from '../../../../../shared/store/action/product.action';
import { ProductState } from '../../../../../shared/store/state/product.state';
import { CollectionSort } from '../collection-sort/collection-sort';

@Component({
  selector: 'app-collection-products',
  imports: [CollectionSort, AsyncPipe, ProductBox, NgbPagination, AsyncPipe, TranslateModule],
  templateUrl: './collection-products.html',
  styleUrl: './collection-products.scss',
})
export class CollectionProducts implements OnInit, OnDestroy {
  filter = input<Params>();
  gridCol = input<string>();
  productClass = input<string>();
  infiniteScroll = input<boolean>(false);

  public gridClass = 'row-cols-xxl-4';
  public listView = false;
  public total_product = 0;
  public products = 0;
  public total = 0;
  public finished = false;
  public button_loader = false;
  public productsArray: Product[] = [];
  public paginateProduct: Product[] = [];
  public scrollFilter: Params = { page: 1, paginate: 9 };

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public productService = inject(ProductService);

  private productSubscription?: Subscription;
  private moreProductSubscription?: Subscription;

  product$: Observable<ProductModel> = this.store.select(ProductState.product);
  moreProduct$: Observable<Product[]> = this.store.select(ProductState.moreProduct);

  ngOnInit() {
    this.productSubscription = this.product$.subscribe((res) => {
      if (res) {
        this.productsArray = res.data;
        this.total = this.productsArray.length;
        this.updatePaginatedProducts();
      }
    });

    this.route.queryParams.subscribe(() => {
      this.total_product = 0;
      const currentFilter = this.filter();
      if (
        currentFilter!['layout'] === 'collection_product_infinite_scroll' ||
        currentFilter!['layout'] === 'collection_shop_list_infinite'
      ) {
        this.scrollFilter = {
          ...currentFilter,
          page: this.scrollFilter['page'],
          paginate: this.scrollFilter['paginate'],
        };
      }
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd && this.productSubscription) {
        this.productSubscription.unsubscribe();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filter']) {
      const currentFilter = this.filter();
      this.route.queryParams.subscribe(() => {
        this.total_product = 0;

        this.productSubscription = this.product$.subscribe((product) => {
          if (product && product.total) {
            this.total_product = product.total;
          }
        });

        if (
          currentFilter!['layout'] === 'collection_product_infinite_scroll' ||
          currentFilter!['layout'] === 'collection_shop_list_infinite'
        ) {
          this.moreProductSubscription = this.moreProduct$.subscribe((product) => {
            if (product?.length) this.products = product.length;
            this.finished = this.total_product === this.products;
          });

          this.scrollFilter = {
            ...currentFilter,
            page: this.scrollFilter['page'],
            paginate: this.scrollFilter['paginate'],
          };
        }

        this.router.events.subscribe((event) => {
          if (event instanceof NavigationEnd) {
            this.productSubscription?.unsubscribe();
            this.moreProductSubscription?.unsubscribe();
          }
        });
      });
    }
  }

  setGridClass(value: { class: string; list_view: boolean }) {
    this.gridClass = value.class;
    this.listView = value.list_view;
  }

  private updatePaginatedProducts() {
    const filter = this.filter();
    if (!filter || !this.productsArray?.length) return;

    this.paginateProduct = this.productsArray
      .map((product) => ({ ...product }))
      .slice(
        (filter['page'] - 1) * filter['paginate'],
        (filter['page'] - 1) * filter['paginate'] + filter['paginate'],
      );
  }

  onScroll(value: number) {
    if (this.products !== this.total_product) {
      this.button_loader = true;
      this.scrollFilter['page'] += value;
      this.store.dispatch(new GetMoreProduct(this.scrollFilter, true)).subscribe({
        complete: () => (this.button_loader = false),
      });
    } else {
      this.finished = true;
    }
  }

  setPage() {
    this.updatePaginatedProducts();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.filter()!['page'] },
      queryParamsHandling: 'merge',
      skipLocationChange: false,
    });
  }

  ngOnDestroy() {
    this.productSubscription?.unsubscribe();
    this.moreProductSubscription?.unsubscribe();
  }
}
