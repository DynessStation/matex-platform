import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params } from '@angular/router';

import { Store } from '@ngxs/store';
import { distinctUntilChanged, map, Observable } from 'rxjs';

import { CollectionBanner } from './collection-banner/collection-banner';
import { CollectionCategorySlider } from './collection-category-slider/collection-category-slider';
import { CollectionLeftSidebar } from './collection-left-sidebar/collection-left-sidebar';
import { CollectionList } from './collection-list/collection-list';
import { CollectionNoSidebar } from './collection-no-sidebar/collection-no-sidebar';
import { CollectionProductInfiniteScroll } from './collection-product-infinite-scroll/collection-product-infinite-scroll';
import { CollectionRightSidebar } from './collection-right-sidebar/collection-right-sidebar';
import { CollectionShopListInfinite } from './collection-shop-list-infinite/collection-shop-list-infinite';
import { CollectionRelatedProduct } from './widgets/collection-recent-product/collection-recent-product';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { ProductModel } from '../../../shared/interface/product.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import {
  GetMoreProduct,
  GetProductByIds,
  GetProducts,
} from '../../../shared/store/action/product.action';
import { ProductState } from '../../../shared/store/state/product.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-collection',
  imports: [
    CollectionList,
    CollectionCategorySlider,
    HomeNewsletter,
    CollectionBanner,
    CollectionNoSidebar,
    CollectionRightSidebar,
    CollectionRelatedProduct,
    CollectionProductInfiniteScroll,
    Breadcrumb,
    AsyncPipe,
    CollectionLeftSidebar,
    CollectionShopListInfinite,
  ],
  templateUrl: './collection.html',
  styleUrl: './collection.scss',
})
export class Collection {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  product$: Observable<ProductModel> = this.store.select(ProductState.product);
  themeOptions$: Observable<Option> = this.store.select(ThemeOptionState.themeOptions);

  public layout: string = 'collection_category_slider';
  public skeleton: boolean = true;
  public breadcrumb: breadcrumb = {
    title: '',
    items: [],
  };

  public filter: Params = {
    page: 1, // Current page number
    paginate: 12, // Display per page,
    status: 1,
    field: 'created_at',
    price: '',
    category: '',
    tag: '',
    sort: 'asc', // ASC, DSC
    sortBy: 'asc',
    rating: '',
    attribute: '',
    brand: '',
  };

  public scrollFilter: Params = {
    page: 1,
    paginate: 12,
  };

  public totalItems: number = 0;
  private recentProductIds = '';

  constructor(private route: ActivatedRoute) {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const option = this.store.selectSnapshot(ThemeOptionState.themeOptions);
      this.layout =
        params['layout'] || option?.collection?.collection_layout || 'collection_category_slider';

      this.filter = {
        page: params['page'] ? Number(params['page']) : 1,
        paginate: params['paginate'] ? Number(params['paginate']) : 12,
        status: 1,
        field: params['field'] ? params['field'] : this.filter['field'],
        price: params['price'] ? params['price'] : '',
        category: params['category'] ? params['category'] : '',
        tag: params['tag'] ? params['tag'] : '',
        sortBy: params['sortBy'] ? params['sortBy'] : this.filter['sortBy'],
        rating: params['rating'] ? params['rating'] : '',
        attribute: params['attribute'] ? params['attribute'] : '',
        brand: params['brand'] ? params['brand'] : '',
      };

      this.scrollFilter = {
        ...this.filter,
        page: 1,
        paginate: this.scrollFilter['paginate'],
      };

      this.store.dispatch(new GetProducts(this.filter));
      if (
        this.layout == 'collection_product_infinite_scroll' ||
        this.layout == 'collection_shop_list_infinite'
      ) {
        this.store.dispatch(new GetMoreProduct(this.scrollFilter));
      }

      this.filter['layout'] = this.layout;
      this.loadRecentProducts(option);
      this.setBreadcrumb();
    });

    this.product$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((product) => (this.totalItems = product?.total));
    this.setBreadcrumb();
  }

  ngOnInit() {
    this.themeOptions$
      .pipe(
        map((option) => option || null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((option) => {
        if (!this.route.snapshot.queryParamMap.has('layout')) {
          this.layout = option?.collection?.collection_layout || 'collection_category_slider';
          this.filter['layout'] = this.layout;
        }
        if (option) this.loadRecentProducts(option);
      });
  }

  private loadRecentProducts(option: Option) {
    const ids = option?.collection?.product_ids || [];
    const key = ids.join(',');
    if (this.layout !== 'collection_recent_product' || !key || key === this.recentProductIds)
      return;

    this.recentProductIds = key;
    this.store.dispatch(
      new GetProductByIds({
        status: 1,
        approve: 1,
        ids: key,
        paginate: ids.length,
      }),
    );
  }

  setBreadcrumb() {
    const layoutParam = this.route.snapshot.queryParamMap.get('layout');
    if (layoutParam) {
      this.breadcrumb.title = layoutParam;
      this.breadcrumb.items = [{ label: layoutParam }];
    }
  }
}
