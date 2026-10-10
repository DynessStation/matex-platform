import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { ProductBox } from '../../../../../shared/components/product-box/product-box';
import { Params } from '../../../../../shared/interface/core.interface';
import { Product, ProductModel } from '../../../../../shared/interface/product.interface';
import { ProductService } from '../../../../../shared/services/product.service';
import { GetMoreProduct } from '../../../../../shared/store/action/product.action';
import { ProductState } from '../../../../../shared/store/state/product.state';
import { CollectionSort } from '../collection-sort/collection-sort';

@Component({
  selector: 'app-collection-products',
  imports: [CollectionSort, AsyncPipe, ProductBox, NgbPagination, TranslateModule],
  templateUrl: './collection-products.html',
  styleUrl: './collection-products.scss',
})
export class CollectionProducts implements OnInit {
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
  public paginateProduct: Product[] = [];
  public scrollFilter: Params = { page: 1, paginate: 9 };
  public isEnglish = false;

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  public productService = inject(ProductService);

  product$: Observable<ProductModel> = this.store.select(ProductState.product);
  moreProduct$: Observable<Product[]> = this.store.select(ProductState.moreProduct);

  ngOnInit() {
    this.isEnglish = this.router.url === '/en' || this.router.url.startsWith('/en/');
    this.product$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      this.paginateProduct = result?.data ?? [];
      this.total = result?.total ?? 0;
      this.total_product = this.total;
    });
    this.moreProduct$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((products) => {
      this.products = products?.length ?? 0;
      this.finished = this.total_product > 0 && this.products >= this.total_product;
    });
  }

  setGridClass(value: { class: string; list_view: boolean }) {
    this.gridClass = value.class;
    this.listView = value.list_view;
  }

  applyFilter() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  onScroll(value: number) {
    if (this.products < this.total_product) {
      this.button_loader = true;
      this.scrollFilter = { ...this.filter(), page: Number(this.scrollFilter['page']) + value };
      this.store.dispatch(new GetMoreProduct(this.scrollFilter, true)).subscribe({
        complete: () => (this.button_loader = false),
      });
    } else {
      this.finished = true;
    }
  }

  setPage() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.filter()!['page'] },
      queryParamsHandling: 'merge',
    });
  }
}
