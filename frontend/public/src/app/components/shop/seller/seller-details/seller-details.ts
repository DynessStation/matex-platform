import { TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { NgbRating } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, combineLatest } from 'rxjs';
import { SwiperOptions } from 'swiper/types';

import { Breadcrumb } from '../../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../../shared/interface/breadcrumb.interface';
import { ProductModel } from '../../../../shared/interface/product.interface';
import { IStores } from '../../../../shared/interface/store.interface';
import { Option } from '../../../../shared/interface/theme-option.interface';
import { GetProducts } from '../../../../shared/store/action/product.action';
import { ProductState } from '../../../../shared/store/state/product.state';
import { StoreState } from '../../../../shared/store/state/store.state';
import { ThemeOptionState } from '../../../../shared/store/state/theme-option.state';
import { HomeCategory } from '../../../home/widgets/home-category/home-category';
import { HomeNewsletter } from '../../../home/widgets/home-newsletter/home-newsletter';
import { CollectionProducts } from '../../collection/widgets/collection-products/collection-products';
import { Sidebar } from '../../collection/widgets/sidebar/sidebar';
import { SellerDetailsTwo } from '../seller-details-two/seller-details-two';
import { SellerStoreSocialMedia } from '../widgets/seller-store-social-media/seller-store-social-media';

@Component({
  selector: 'app-seller-details',
  imports: [
    NgbRating,
    SellerStoreSocialMedia,
    Sidebar,
    CollectionProducts,
    HomeCategory,
    HomeNewsletter,
    SellerDetailsTwo,
    Breadcrumb,
    TranslateModule,
    TitleCasePipe,
  ],
  templateUrl: './seller-details.html',
  styleUrl: './seller-details.scss',
})
export class SellerDetails {
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  product$: Observable<ProductModel> = inject(Store).select(ProductState.product);
  themeOptions$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;
  store$: Observable<IStores> = inject(Store).select(
    StoreState.selectedStore,
  ) as Observable<IStores>;

  public breadcrumb: breadcrumb = {
    title: '',
    items: [],
  };
  public layout: string = 'seller_details';
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

  public browserCategoryOption: SwiperOptions = {
    slidesPerView: 8,
    spaceBetween: 15,
    navigation: {
      nextEl: '.electronic-category-next',
      prevEl: '.electronic-category-prev',
    },
    breakpoints: {
      0: {
        slidesPerView: 2,
      },
      400: {
        slidesPerView: 3,
      },
      550: {
        slidesPerView: 4,
      },
      685: {
        slidesPerView: 5,
      },
      830: {
        slidesPerView: 6,
      },
      975: {
        slidesPerView: 7,
      },
      1130: {
        slidesPerView: 8,
      },
      1399: {
        slidesPerView: 9,
      },
      1400: {
        slidesPerView: 6,
      },
      1590: {
        slidesPerView: 7,
      },
      1770: {
        slidesPerView: 8,
      },
    },
  };

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
          layout: queryParams['layout'] || 'seller_details',
        };

        // Update breadcrumb
        this.breadcrumb.items = [];
        this.breadcrumb.title = this.filter['store_slug'] ? this.filter['store_slug'] : 'Seller';
        this.breadcrumb.items.push(
          { label: 'Seller Store', active: true },
          { label: this.breadcrumb.title, active: false },
        );

        // Dispatch action to fetch products
        this.store.dispatch(new GetProducts(this.filter));

        // If layout is not in query params, set default layout

        if (queryParams['layout']) {
          this.layout = queryParams['layout'];
        } else {
          this.themeOptions$.subscribe((option) => {
            this.layout = option?.seller_store?.seller_layout || 'seller_details';
          });
        }

        // Update filter with layout
        this.filter['layout'] = this.layout;
      },
    );

    // Subscribe to product store to get total items
    this.product$.subscribe((product) => (this.totalItems = product?.total));
  }
}
