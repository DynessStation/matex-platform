import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable, Subscription, map } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBrand } from '../../../shared/interface/brand.interface';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Params } from '../../../shared/interface/core.interface';
import { ProductModel } from '../../../shared/interface/product.interface';
import { LayoutService } from '../../../shared/services/layout.service';
import { GetProducts } from '../../../shared/store/action/product.action';
import { BrandState } from '../../../shared/store/state/brand.state';
import { ProductState } from '../../../shared/store/state/product.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { CollectionProducts } from '../collection/widgets/collection-products/collection-products';
import { Sidebar } from '../collection/widgets/sidebar/sidebar';

@Component({
  selector: 'app-brand',
  imports: [CollectionProducts, HomeNewsletter, Sidebar, Breadcrumb, AsyncPipe],
  templateUrl: './brand.html',
  styleUrl: './brand.scss',
})
export class Brand {
  private route = inject(ActivatedRoute);
  private store = inject(Store);
  public layoutService = inject(LayoutService);

  product$: Observable<ProductModel> = inject(Store).select(ProductState.product);
  brand$: Observable<IBrand> = inject(Store).select(BrandState.selectedBrand) as Observable<IBrand>;

  breadcrumb$: Observable<breadcrumb> = this.brand$.pipe(
    map((brand) => ({
      title: `Brand: ${brand?.name}`,
      items: [{ label: brand?.name, active: false }],
    }))
  );
  public layout: string = 'collection_category_slider';
  public skeleton: boolean = true;
  public brand: IBrand;
  public filter: Params = {
    page: 1, // Current page number
    paginate: 40, // Display per page,
    brand: '',
  };

  public totalItems: number = 0;
  private subscriptions: Subscription = new Subscription();

  ngOnInit() {
    this.subscriptions.add(
      this.brand$.subscribe((brand) => {
        this.brand = brand;
        this.updateFilterAndFetchProducts();
      }),
    );

    this.filter['brand'] = this.route.snapshot.paramMap.get('slug');
    this.store.dispatch(new GetProducts(this.filter));
  }


  private updateFilterAndFetchProducts() {
    if (this.brand) {
      this.filter['brand'] = this.brand.slug;
    }
    this.store.dispatch(new GetProducts(this.filter));
  }

  public changePage(page: number) {
    this.filter['page'] = page;
    this.updateFilterAndFetchProducts();
  }

  public changePaginate(paginate: number) {
    this.filter['paginate'] = paginate;
    this.updateFilterAndFetchProducts();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
