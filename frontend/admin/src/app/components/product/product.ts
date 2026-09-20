import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, Renderer2, DOCUMENT, viewChild } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module, Select2UpdateEvent } from 'ng-select2-component';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { AdvanceDropdown } from '../../shared/components/ui/advance-dropdown/advance-dropdown';
import { DigitalDownloadModal } from '../../shared/components/ui/modal/digital-download-modal/digital-download-modal';
import { ImportCsvModal } from '../../shared/components/ui/modal/import-csv-modal/import-csv-modal';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IAccountUser } from '../../shared/interface/account.interface';
import { ICategoryModel } from '../../shared/interface/category.interface';
import { IProduct, IProductModel } from '../../shared/interface/product.interface';
import { IValues } from '../../shared/interface/setting.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { GetBrandsAction } from '../../shared/store/action/brand.action';
import { GetCategoriesAction } from '../../shared/store/action/category.action';
import {
  ApproveProductStatusAction,
  DeleteAllProductAction,
  DeleteProductAction,
  DownloadAction,
  ExportProductAction,
  GetProductsAction,
  ReplicateProductAction,
  UpdateProductStatusAction,
} from '../../shared/store/action/product.action';
import { GetStoresAction } from '../../shared/store/action/store.action';
import { AccountState } from '../../shared/store/state/account.state';
import { BrandState } from '../../shared/store/state/brand.state';
import { CategoryState } from '../../shared/store/state/category.state';
import { ProductState } from '../../shared/store/state/product.state';
import { SettingState } from '../../shared/store/state/setting.state';
import { StoreState } from '../../shared/store/state/store.state';

@Component({
  selector: 'app-product',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    Select2Module,
    PageWrapper,
    Table,
    AdvanceDropdown,
    ImportCsvModal,
    DigitalDownloadModal,
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product {
  private store = inject(Store);
  private renderer = inject(Renderer2);
  private document = inject<Document>(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  product$: Observable<IProductModel> = inject(Store).select(ProductState.product);
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;
  category$: Observable<ICategoryModel> = inject(Store).select(
    CategoryState.category,
  ) as Observable<ICategoryModel>;
  brand$: Observable<Select2Data> = inject(Store).select(BrandState.brands);
  store$: Observable<Select2Data> = inject(Store).select(StoreState.stores);
  user$: Observable<IAccountUser> = inject(Store).select(AccountState.user);

  readonly CSVModal = viewChild<ImportCsvModal>('csvModal');
  readonly DownloadModal = viewChild<DigitalDownloadModal>('downloadModal');

  public mainProductType: Select2Data = [
    {
      value: 'physical',
      label: 'Physical Product',
    },
    {
      value: 'digital',
      label: 'Digital Product',
    },
    {
      value: 'external',
      label: 'External/Affiliate product',
    },
  ];

  public filter: Params = {
    search: '',
    field: '',
    category_ids: '',
    brand_ids: '',
    store_ids: '',
    sort: '', // current Sorting Order
    page: 1, // current page number
    paginate: 15, // Display per page,
  };

  public advanceFilter: any[] = [];
  public url: string;
  public open: boolean = true;
  public isBrowser: boolean;

  public tableConfig: ITableConfig = {
    columns: [
      {
        title: 'image',
        dataField: 'product_thumbnail',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      { title: 'name', dataField: 'name', sortable: true, sort_direction: 'desc' },
      { title: 'sku', dataField: 'sku', sortable: true, sort_direction: 'desc' },
      {
        title: 'price',
        dataField: 'sale_price',
        type: 'price',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'stock', dataField: 'stock' },
      { title: 'store', dataField: 'store_name' },
      { title: 'approved', dataField: 'is_approved', type: 'switch', canAllow: ['admin'] },
      { title: 'status', dataField: 'status', type: 'switch' },
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'product.edit',
      },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'product.destroy',
      },
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' },
    ],
    data: [] as IProduct[],
    total: 0,
  };

  constructor() {
    const platformId = this.platformId;

    this.isBrowser = isPlatformBrowser(platformId);
    this.setting$.subscribe(setting => {
      if (setting && setting.general) {
        this.url = setting.general.site_url;
      }
    });
  }

  ngOnInit() {
    this.store.dispatch(new GetCategoriesAction({ status: 1 }));
    this.store.dispatch(new GetBrandsAction({ status: 1 }));
    this.store.dispatch(new GetStoresAction({ status: 1 }));
    this.product$.subscribe(product => {
      let products = product?.data?.filter((element: IProduct) => {
        element.stock = element.stock_status
          ? `<div class="status-${element.stock_status}"><span>${element.stock_status.replace(/_/g, ' ')}</span></div>`
          : '-';
        element.store_name = element?.store ? element?.store?.store_name : '-';
        return element;
      });
      this.tableConfig.data = product ? products : [];
      this.tableConfig.total = product ? product?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.filter = { ...this.filter, ...data };
    this.store.dispatch(new GetProductsAction(this.filter));
  }

  applyFilter(data: Select2UpdateEvent) {
    this.filter['product_type'] = data && data.value ? data.value : null;
    if (!this.filter['product_type']) {
      delete this.filter['product_type'];
    }
    this.onTableChange(this.filter);
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'is_approved') this.approve(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
    else if (action.actionToPerform == 'duplicate') this.duplicate(action.data);
    else if (action.actionToPerform == 'download') this.download(action.data);
    else if (action.actionToPerform == 'view') this.view(action.data);
  }

  edit(data: IProduct) {
    void this.router.navigateByUrl(`/product/edit/${data.id}`);
  }

  approve(data: IProduct) {
    this.store.dispatch(new ApproveProductStatusAction(data.id, data.is_approved));
  }

  status(data: IProduct) {
    this.store.dispatch(new UpdateProductStatusAction(data.id, data.status));
  }

  delete(data: IProduct) {
    this.store.dispatch(new DeleteProductAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllProductAction(ids));
  }

  duplicate(ids: number[]) {
    this.store.dispatch(new ReplicateProductAction(ids));
  }

  download(data: IProduct) {
    if (data?.variations?.length) {
      void this.DownloadModal().openModal(data);
    } else {
      this.store.dispatch(new DownloadAction({ product_id: data.id, variation_id: null }));
    }
  }

  view(data: IProduct) {
    if (isPlatformBrowser(this.platformId)) {
      window.open(this.url + '/product/' + data.slug, '_blank');
    }
  }

  export() {
    this.store.dispatch(new ExportProductAction(this.filter));
  }

  openFilter() {
    this.open = !this.open;
  }

  selectItem(data: number[]) {
    this.renderer.addClass(this.document.body, 'loader-none');
    if (Array.isArray(data) && data.length) {
      this.filter['category_ids'] = data.join();
    } else {
      this.filter['category_ids'] = [];
    }
    this.onTableChange(this.filter);
  }

  filters(data: any, key: string) {
    this.renderer.addClass(this.document.body, 'loader-none');
    if (data && data.value) {
      this.filter[key] = data.value.join();
    } else {
      this.filter[key] = [];
    }
    this.onTableChange(this.filter);
  }
}
