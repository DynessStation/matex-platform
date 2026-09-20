import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, input, output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Select2, Select2Data, Select2UpdateEvent } from 'ng-select2-component';

import { Params } from '../../../../../shared/interface/core.interface';
import { LayoutService } from '../../../../../shared/services/layout.service';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-collection-sort',
  imports: [Select2, Sidebar, TranslateModule],
  templateUrl: './collection-sort.html',
  styleUrl: './collection-sort.scss',
})
export class CollectionSort {
  products = input<number>();
  filter = input<Params>();
  gridCol = input<string>();

  public isFilter: boolean = false;
  public listView: boolean = false;
  public class: string = 'row-cols-xxl-4';
  public selectedGrid: string = 'collection_4_grid';
  public gridArray = [
    'collection_2_grid',
    'collection_3_grid',
    'collection_4_grid',
    'collection_5_grid',
    'collection_list_view',
    'collection_3_grid_offcanvas',
    'collection_2_grid_offcanvas',
    'collection_4_grid_offcanvas',
    'collection_5_grid_offcanvas',
    'collection_list_view_offcanvas',
    'collection_shop_list_infinite',
  ];

  public offCanvasLayouts = [
    'collection_full_width',
    'collection_3_grid_offcanvas',
    'collection_2_grid_offcanvas',
    'collection_4_grid_offcanvas',
    'collection_5_grid_offcanvas',
    'collection_list_view_offcanvas',
  ];

  setGridClass = output<{ class: string; list_view: boolean }>();
  public isBrowser = false;

  public sorting: Select2Data = [
    {
      value: 'asc',
      label: 'Ascending Order',
    },
    {
      value: 'desc',
      label: 'Descending Order',
    },
    {
      value: 'low-high',
      label: 'Low - High Price',
    },
    {
      value: 'high-low',
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
    {
      value: 'discount-high-low',
      label: '% Off - Hight To Low',
    },
  ];

  public sortingItem: Select2Data = [
    {
      value: '10',
      label: '10 Products',
    },
    {
      value: '25',
      label: '25 Products',
    },
    {
      value: '50',
      label: '50 Products',
    },
    {
      value: '100',
      label: '100 Products',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public layoutService: LayoutService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnChanges(changes: SimpleChanges) {
    const layout = changes['filter']?.currentValue?.layout;

    // Prefer the gridCol input if provided
    const gridColValue = this.gridCol?.();
    if (gridColValue) {
      this.grid(gridColValue);
      return;
    }

    // Check if layout matches any known grid pattern
    if (layout && this.gridArray.includes(layout)) {
      this.selectedGrid = layout;
      this.grid(layout);
    } else if (
      ['collection_full_width', 'collection_top_filter', 'collection_sidebar_popup'].includes(
        layout,
      )
    ) {
      this.grid('collection_4_grid');
    } else {
      this.grid(this.selectedGrid);
    }
  }

  grid(value: string) {
    if (value == 'collection_3_grid' || value == 'collection_3_grid_offcanvas') {
      this.class = 'row-cols-xl-3 row-cols-lg-2 row-cols-md-3 row-cols-2';
      this.listView = false;
    } else if (value == 'collection_4_grid' || value == 'collection_4_grid_offcanvas') {
      this.class = 'row-cols-xxl-4 row-cols-xl-3 row-cols-lg-2 row-cols-md-3 row-cols-2';
      this.listView = false;
    } else if (value == 'collection_5_grid' || value == 'collection_5_grid_offcanvas') {
      this.class = 'row-cols-xxl-5 row-cols-xl-3 row-cols-lg-2 row-cols-md-3 row-cols-2';
      this.listView = false;
    } else if (value == 'collection_grid_view' || value == 'collection_3_grid_offcanvas') {
      this.class = 'col-xxl-3 col-md-4 col-6';
      this.listView = false;
    } else if (value == 'collection_2_grid' || value == 'collection_2_grid_offcanvas') {
      this.class = 'row-cols-2';
      this.listView = false;
    } else if (
      value == 'collection_list_view' ||
      value == 'collection_list_view_offcanvas' ||
      value == 'collection_shop_list_infinite'
    ) {
      this.class = 'product-list-section row-cols-1 list-style';
      this.listView = true;
    }

    if (value) {
      this.selectedGrid = value;
    }

    this.setGridClass.emit({ class: this.class, list_view: this.listView });
  }

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

  sortProductsLength(data: Select2UpdateEvent) {
    this.filter()!['paginate'] = data.value ? data.value : this.filter()!['paginate'];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        paginate: data.value,
      },
      queryParamsHandling: 'merge', // preserve the existing query params in the route
      skipLocationChange: false, // do trigger navigation
    });
  }

  openOffCanvasFilter(value: boolean) {
    this.layoutService.offCanvasFilterMenu = value;
  }

  openFilter() {
    this.isFilter = !this.isFilter;

    this.layoutService.offCanvasFilterMenu = true;
  }
}
