import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  RouterModule,
} from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { ProductCategoryFilter } from './product-category-filter/product-category-filter';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { OrderList } from '../../shared/components/ui/order-list/order-list';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { IOrderItem } from '../../shared/interface/order-list.interface';
import {
  IProduct,
  IProductModel,
} from '../../shared/interface/product.interface';
import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ProductService } from '../../shared/services/product.service';
import {
  DeleteProductAction,
  GetProductsAction,
} from '../../shared/store/action/product.action';
import { ProductState } from '../../shared/store/state/product.state';

@Component({
  selector: 'app-product',
  imports: [
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
    OrderList,
    ProductCategoryFilter,
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product implements AfterViewInit {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private productService = inject(ProductService);
  private notifications = inject(NotificationService);
  private messages = inject(ApiMessageService);
  // "Produk di depan": products ticked "Tampilkan di depan katalog", in their order.
  ordering = false;
  orderItems: IOrderItem[] = [];
  orderMax: number | null = null;
  savingOrder = false;
  readonly table = viewChild(Table);

  /** The category the list is filtered by ('' for all). */
  get selectedCategory(): string {
    return String(this.filter['category'] ?? '');
  }
  private pendingTableState: Params | null = null;
  filter: Params = {
    search: '',
    page: 1,
    paginate: 15,
    field: '',
    sort: '',
    category: '',
  };
  product$: Observable<IProductModel> = this.store.select(ProductState.product);
  tableConfig: ITableConfig<IProduct> = {
    columns: [
      {
        title: 'image',
        dataField: 'product_thumbnail',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      {
        title: 'name',
        dataField: 'name',
        sortable: true,
        sort_direction: 'desc',
      },
      {
        title: 'sku',
        dataField: 'sku',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'price', dataField: 'price_display' },
      { title: 'stock', dataField: 'stock' },
      { title: 'status', dataField: 'status_label' },
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'product.update',
      },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'product.delete',
      },
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' },
    ],
    data: [],
    total: 0,
  };

  ngOnInit() {
    this.product$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((model) => {
        const data = (model?.data ?? []).map((item) => ({
          ...item,
          price_display:
            item.price_visibility === 'displayed'
              ? new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }).format(item.price)
              : 'Hubungi kami',
          stock: item.stock_status?.replaceAll('_', ' ') || '-',
          status_label: String(item.status),
        }));
        this.tableConfig = {
          ...this.tableConfig,
          data,
          total: model?.meta.total ?? 0,
          total_all: model?.meta.total_all,
        };
      });
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.restoreFromUrl(params));
  }

  ngAfterViewInit() {
    if (this.pendingTableState) {
      this.table()?.syncState(this.pendingTableState);
      this.pendingTableState = null;
    }
  }

  private restoreFromUrl(params: ParamMap) {
    const state: Params = {
      page: this.positiveNumber(params.get('page'), 1),
      paginate: this.pageSize(params.get('paginate')),
      search: params.get('search')?.trim() ?? '',
      field: params.get('field')?.trim() ?? '',
      sort:
        params.get('sort') === 'asc' || params.get('sort') === 'desc'
          ? params.get('sort')
          : '',
      // Category panel (U-13): products in this category only.
      category: params.get('category')?.trim() ?? '',
    };
    this.filter = state;
    if (this.table()) this.table()?.syncState(state);
    else this.pendingTableState = state;
    this.store.dispatch(new GetProductsAction(state));
  }

  onTableChange(data?: Params) {
    const state = { ...this.filter, ...(data ?? {}) };
    const query: Params = {};
    if (Number(state['page']) > 1) query['page'] = Number(state['page']);
    if (Number(state['paginate']) !== 15)
      query['paginate'] = Number(state['paginate']);
    if (String(state['search'] ?? '').trim())
      query['search'] = String(state['search']).trim();
    if (String(state['field'] ?? '').trim())
      query['field'] = String(state['field']).trim();
    if (state['sort'] === 'asc' || state['sort'] === 'desc')
      query['sort'] = state['sort'];
    if (String(state['category'] ?? '').trim())
      query['category'] = String(state['category']).trim();
    const replaceUrl =
      (this.route.snapshot.queryParamMap.get('search') ?? '') !==
      String(query['search'] ?? '');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
      replaceUrl,
    });
  }

  /** Category panel: show that category's products from page 1 ('' for every product). */
  selectCategory(id: string) {
    this.onTableChange({ category: id, page: 1 });
  }

  onActionClicked(action: ITableClickedAction<IProduct>) {
    if (action.actionToPerform === 'edit')
      void this.router.navigateByUrl(`/product/edit/${action.data.id}`);
    if (action.actionToPerform === 'delete')
      this.store
        .dispatch(new DeleteProductAction(action.data.id))
        .subscribe(() =>
          this.store.dispatch(new GetProductsAction(this.filter)),
        );
    if (action.actionToPerform === 'view')
      window.open(`/product/${action.data.slug}`, '_blank');
  }

  openFront() {
    this.productService.getFront().subscribe((response) => {
      this.orderMax = response.data?.max ?? null;
      this.orderItems = (response.data?.data ?? []).map((item) => ({
        ...item,
        // Only published products show on the website.
        note:
          item.status === 'draft'
            ? 'Draf, belum tampil'
            : item.status === 'archived'
              ? 'Diarsipkan, belum tampil'
              : '',
      }));
      this.ordering = true;
    });
  }

  saveFront(ids: string[]) {
    this.savingOrder = true;
    this.productService.saveFront(ids).subscribe({
      next: (response) => {
        this.savingOrder = false;
        this.ordering = false;
        this.notifications.showSuccess(this.messages.resolveResponse(response));
        this.store.dispatch(new GetProductsAction(this.filter));
      },
      error: () => (this.savingOrder = false),
    });
  }

  private positiveNumber(value: string | null, fallback: number) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }
  private pageSize(value: string | null) {
    const number = Number(value);
    return [10, 15, 25, 50, 100].includes(number) ? number : 15;
  }
}
