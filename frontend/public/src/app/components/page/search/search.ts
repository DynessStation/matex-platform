import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { combineLatest, debounceTime, distinctUntilChanged, map, Observable, startWith, switchMap, tap } from 'rxjs';

import { ProductBoxOne } from '../../../shared/components/product-box/product-box-one/product-box-one';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Params } from '../../../shared/interface/core.interface';
import { Product, ProductModel } from '../../../shared/interface/product.interface';
import { GetProducts } from '../../../shared/store/action/product.action';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-search',
  imports: [
    ProductBoxOne,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    Breadcrumb,
    TranslateModule,
    HomeNewsletter,
    AsyncPipe,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  product$ = this.store.select(state => state.product.product);

  search = new FormControl('');

  filter = new FormGroup({
    page: new FormControl(1),
    paginate: new FormControl(15),
    search: new FormControl(''),
    status: new FormControl(1)
  });

  totalItems$: Observable<number>;
  paginateProduct$: Observable<Product[]>;

  public breadcrumb: breadcrumb = {
    title: 'Search',
    items: [{ label: 'Search', active: true }]
  };

  constructor() {
    this.route.queryParams.subscribe(params => {
      this.filter.patchValue({
        search: params['search'] ? params['search'] : '',
        page: params['page'] ? parseFloat(params['page']) : 1,
        paginate: params['paginate'] ? parseFloat(params['paginate']) : 15,
        status: 1
      });

      this.search.patchValue(this.filter.get('search')?.value ?? '', { emitEvent: false })
    });

    this.totalItems$ = this.product$.pipe(map(product => product?.total));

    this.paginateProduct$ = combineLatest([this.product$, this.filter.valueChanges.pipe(startWith(this.filter.value))]).pipe(
      map(([products, filter]) => {
        if (!products?.data?.length) {
          return [];
        }
        const page = filter?.page || 1;
        const paginate = filter?.paginate || 15;
        return products.data.slice((page - 1) * paginate, page * paginate)
      }));
  }

  ngOnInit() {
    this.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged())
      .subscribe((inputValue) => {
        this.filter.patchValue({ search: inputValue, page: 1 });
        this.updateURL();
        this.store.dispatch(new GetProducts(this.filter.value as Params));
      })
  }

  updateURL() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.filter.value.search,
        page: this.filter.value.page,
        paginate: this.filter.value.paginate
      },
      queryParamsHandling: 'merge',
    });
  }

  pageChanged(page: number) {
    this.filter.patchValue({ page: page });
    this.updateURL();
  }
}
