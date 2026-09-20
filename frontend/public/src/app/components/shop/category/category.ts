import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable, Subscription, map } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { ICategory } from '../../../shared/interface/category.interface';
import { Params } from '../../../shared/interface/core.interface';
import { ProductModel } from '../../../shared/interface/product.interface';
import { LayoutService } from '../../../shared/services/layout.service';
import { GetProducts } from '../../../shared/store/action/product.action';
import { CategoryState } from '../../../shared/store/state/category.state';
import { ProductState } from '../../../shared/store/state/product.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { CollectionProducts } from '../collection/widgets/collection-products/collection-products';
import { Sidebar } from '../collection/widgets/sidebar/sidebar';

@Component({
  selector: 'app-category',
  imports: [Sidebar, CollectionProducts, HomeNewsletter, Breadcrumb, AsyncPipe],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  private store = inject(Store);
  public layoutService = inject(LayoutService);
  product$: Observable<ProductModel> = this.store.select(ProductState.product);
  category$: Observable<ICategory | null> = this.store.select(CategoryState.selectedCategory);

  breadcrumb$: Observable<breadcrumb> = this.category$.pipe(
    map((category) => ({
      title: `Category: ${category?.name}`,
      items: [{ label: category?.name || '', active: false }],
    }))
  );
  public layout: string = 'collection_category_slider';
  public skeleton: boolean = true;
  public category: ICategory;
  public activeCategory: string | null;
  public filter: Params = {
    page: 1,
    paginate: 40,
    status: 1,
    field: 'created_at',
    price: '',
    category: '',
    tag: '',
    sort: 'asc',
    sortBy: 'asc',
    rating: '',
    attribute: '',
  };

  private subscriptions: Subscription = new Subscription();
  public totalItems: number = 0;

  constructor(private route: ActivatedRoute) {
    if (this.route.snapshot.paramMap.get('slug')) {
      this.activeCategory = this.route.snapshot.paramMap.get('slug');
      this.filter['category'] = this.activeCategory;
    }
  }

  ngOnInit() {
    this.subscriptions.add(
      this.category$.subscribe((category) => {
        this.category = category!;
        this.updateFilterAndFetchProducts();
      }),
    );

    this.filter['category'] = this.route.snapshot.paramMap.get('slug');
    this.store.dispatch(new GetProducts(this.filter));
  }


  private updateFilterAndFetchProducts() {
    if (this.category) {
      this.filter['category'] = this.category.slug;
    }
    this.store.dispatch(new GetProducts(this.filter));
  }

  public changePage(page: number) {
    this.filter['category'] = page;
    this.updateFilterAndFetchProducts();
  }

  public changePaginate(paginate: number) {
    this.filter['paginate'] = paginate;
    this.updateFilterAndFetchProducts();
  }
}
