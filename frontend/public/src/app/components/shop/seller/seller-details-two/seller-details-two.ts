import { TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { NgbRating } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { combineLatest, Observable } from 'rxjs';

import { ProductModel } from '../../../../shared/interface/product.interface';
import { IStores } from '../../../../shared/interface/store.interface';
import { Option } from '../../../../shared/interface/theme-option.interface';
import { GetProductByIds, GetProducts } from '../../../../shared/store/action/product.action';
import { ProductState } from '../../../../shared/store/state/product.state';
import { StoreState } from '../../../../shared/store/state/store.state';
import { ThemeOptionState } from '../../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../../home/widgets/home-newsletter/home-newsletter';
import { HomeProduct } from '../../../home/widgets/home-product/home-product';
import { CollectionProducts } from '../../collection/widgets/collection-products/collection-products';
import { Sidebar } from '../../collection/widgets/sidebar/sidebar';

@Component({
  selector: 'app-seller-details-two',
  imports: [NgbRating, Sidebar, CollectionProducts, HomeNewsletter, HomeProduct, TitleCasePipe],
  templateUrl: './seller-details-two.html',
  styleUrl: './seller-details-two.scss',
})
export class SellerDetailsTwo {
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  product$: Observable<ProductModel> = inject(Store).select(ProductState.product);
  themeOptions$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;
  store$: Observable<IStores> = inject(Store).select(
    StoreState.selectedStore,
  ) as Observable<IStores>;

  public layout: string = 'seller_details_two';
  public skeleton: boolean = true;
  public selectedStore: IStores;
  public filter: Params = {
    page: 1, // Current page number
    paginate: 12, // Display per page,
    status: 1,
    field: 'price',
    price: '',
    category: '',
    tag: '',
    sort: '', // ASC, DSC
    sortBy: '',
    rating: '',
    attribute: '',
  };

  public totalItems: number = 0;

  ngOnInit(): void {
    this.store.dispatch(new GetProducts(this.filter));
    // Subscribe to store changes
    this.store$.subscribe((store) => {
      this.selectedStore = store;
    });

    // Combine latest values from params and queryParams observables
    combineLatest([this.route.params, this.route.queryParams]).subscribe(
      ([params, queryParams]) => {
        // Update filter based on query params
        this.filter = {
          page: queryParams['page'] || 1,
          paginate: 12,
          status: 1,
          field: queryParams['field'] || '',
          price: queryParams['price'] || '',
          category: queryParams['category'] || '',
          tag: queryParams['tag'] || '',
          sort: queryParams['sort'] || '',
          sortBy: queryParams['sortBy'] || '',
          rating: queryParams['rating'] || '',
          attribute: queryParams['attribute'] || '',
          store_slug: params['slug'] || '',
          layout: queryParams['layout'] || 'seller_details_two',
        };

        // Dispatch action to fetch products
        this.store.dispatch(new GetProductByIds(this.filter));
        this.store.dispatch(new GetProducts(this.filter));

        if (queryParams['layout']) {
          this.layout = queryParams['layout'];
        } else {
          this.themeOptions$.subscribe((option) => {
            this.layout = option?.seller_store?.seller_layout || 'seller_details';
          });
        }
      },
    );

    // Subscribe to product store to get total items
    this.product$.subscribe((product) => (this.totalItems = product?.total));
  }
}
