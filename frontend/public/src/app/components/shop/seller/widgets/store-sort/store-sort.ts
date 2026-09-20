import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Select2Data, Select2UpdateEvent, Select2 } from 'ng-select2-component';

import { Params } from '../../../../../shared/interface/core.interface';
import { IStores } from '../../../../../shared/interface/store.interface';

@Component({
  selector: 'app-store-sort',
  imports: [Select2],
  templateUrl: './store-sort.html',
  styleUrl: './store-sort.scss',
})
export class StoreSort {
  readonly stores = input<IStores[]>();
  filter = input<Params>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public sorting: Select2Data = [
    {
      value: 'most-popular',
      label: 'Most Popular',
    },
    {
      value: 'low-to-high',
      label: 'Low - High Price',
    },
    {
      value: 'high-to-low',
      label: 'High - Low Price',
    },
    {
      value: 'a-z',
      label: 'A - Z Order',
    },
    {
      value: 'z-a',
      label: 'Z - A Order',
    },
  ];

  // SortBy Filter
  sortByFilter(data: Select2UpdateEvent) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        sortBy: data && data.value ? data.value : null,
        field: data && (data.value == 'asc' || data.value == 'desc') ? 'created_at' : null,
      },
      queryParamsHandling: 'merge', // preserve the existing query params in the route
      skipLocationChange: false, // do trigger navigation
    });
  }
}
