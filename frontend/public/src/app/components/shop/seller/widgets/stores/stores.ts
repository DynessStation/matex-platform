import { AsyncPipe, NgClass } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { combineLatest, map, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { breadcrumb } from '../../../../../shared/interface/breadcrumb.interface';
import { Params } from '../../../../../shared/interface/core.interface';
import { IStores, IStoresModel } from '../../../../../shared/interface/store.interface';
import { StoreService } from '../../../../../shared/services/store.service';
import { StoreState } from '../../../../../shared/store/state/store.state';
import { StoreSort } from '../store-sort/store-sort';

@Component({
  selector: 'app-stores',
  imports: [NgbModule, StoreSort, RouterModule, AsyncPipe, NgClass],
  templateUrl: './stores.html',
  styleUrl: './stores.scss',
})
export class Stores {
  filter = input<Params>();
  style = input<string>();

  store = inject(Store);
  private route = inject(ActivatedRoute);
  storeService = inject(StoreService);
  private router = inject(Router);
  public total = 0;

  store$: Observable<IStoresModel> = inject(Store).select(StoreState.store);

  public paginateStore$: Observable<IStores[]> = combineLatest([
    this.store$,
    toObservable(this.filter)
  ]).pipe(
    map(([store, filter]) => {
      const storesArray = store.data ?? [];
      this.total = storesArray.length;
      if (!filter || !storesArray?.length) return [];

      return storesArray
        .map((p) => ({ ...p }))
        .slice(
          (filter['page'] - 1) * filter['paginate'],
          (filter['page'] - 1) * filter['paginate'] + filter['paginate'],
        );
    })
  );

  public breadcrumb: breadcrumb = {
    title: 'Seller Stores',
    items: [{ label: 'Seller Stores', active: true }],
  };

  ngOnInit() {
  }

  updatePaginatedStores() {
    // Logic moved to paginateStore$ pipe
  }

  setPage() {
    this.updatePaginatedStores();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.filter()!['page'] },
      queryParamsHandling: 'merge',
      skipLocationChange: false,
    });
  }

  getRowClass() {
    if (this.style() === 'seller_grid' || this.style() === 'seller_grid_2') {
      return 'g-md-4';
    } else if (this.style() === 'seller_list' || this.style() === 'seller_list_2') {
      return 'g-sm-4';
    }
    return '';
  }

  getColClass() {
    if (this.style() === 'seller_grid' || this.style() === 'seller_grid_2') {
      return 'col-xl-4 col-md-6';
    } else if (this.style() === 'seller_list') {
      return 'col-lg-6';
    } else if (this.style() === 'seller_list_2') {
      return 'col-xxl-6';
    }
    return '';
  }

  getBoxClass() {
    if (this.style() === 'seller_list' || this.style() === 'seller_list_2') {
      return 'seller-box seller-box-2';
    }
    return 'seller-box';
  }
}
