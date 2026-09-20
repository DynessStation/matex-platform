import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Breadcrumb } from '../../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../../shared/interface/breadcrumb.interface';
import { Params } from '../../../../shared/interface/core.interface';
import { IStoresModel } from '../../../../shared/interface/store.interface';
import { Option } from '../../../../shared/interface/theme-option.interface';
import { GetStoresAction } from '../../../../shared/store/action/store.action';
import { StoreState } from '../../../../shared/store/state/store.state';
import { ThemeOptionState } from '../../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../../home/widgets/home-newsletter/home-newsletter';
import { StoreFilter } from '../widgets/store-filter/store-filter';
import { Stores } from '../widgets/stores/stores';

@Component({
  selector: 'app-seller-store',
  imports: [Stores, StoreFilter, HomeNewsletter, Breadcrumb],
  templateUrl: './seller-store.html',
  styleUrl: './seller-store.scss',
})
export class SellerStore {
  public style: string = 'seller_grid';
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  themeOptions$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;
  store$: Observable<IStoresModel> = inject(Store).select(StoreState.store);

  public filter: Params = {
    page: 1, // Current page number
    paginate: 9, // Display per page,
    status: 1,
    category: '',
    rating: '',
    sort: 'asc', // ASC, DSC
    sortBy: 'asc',
  };
  public totalItems: number = 0;

  public breadcrumb: breadcrumb = {
    title: '',
    items: [],
  };

  constructor() {
    // Get Query params..
    this.route.queryParams.subscribe((params) => {
      this.filter = {
        page: params['page'] ? params['page'] : 1,
        paginate: params['paginate'] ? params['paginate'] : 9,
        status: 1,
        category: params['category'] ? params['category'] : '',
        rating: params['rating'] ? params['rating'] : '',
        sortBy: params['sortBy'] ? params['sortBy'] : this.filter['sortBy'],
      };

      this.store.dispatch(new GetStoresAction(this.filter));
      // For Demo Purpose only
      if (params['style']) {
        this.style = params['style'];
      }

      this.filter['style'] = this.style;
      this.setBreadcrumb();
    });
    this.store$.subscribe((store) => (this.totalItems = store?.total));
    this.setBreadcrumb();
  }

  setBreadcrumb() {
    const layoutParam = this.route.snapshot.queryParamMap.get('style');
    if (layoutParam) {
      this.breadcrumb.title = layoutParam;
      this.breadcrumb.items = [{ label: layoutParam }];
    }
  }
}
