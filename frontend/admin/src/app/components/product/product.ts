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
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { IProductModel } from '../../shared/interface/product.interface';
import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';
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
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product implements AfterViewInit {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  readonly table = viewChild(Table);
  private pendingTableState: Params | null = null;
  filter: Params = { search: '', page: 1, paginate: 15, field: '', sort: '' };
  product$: Observable<IProductModel> = this.store.select(ProductState.product);
  tableConfig: ITableConfig = {
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
          total: model?.total ?? 0,
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
    const replaceUrl =
      (this.route.snapshot.queryParamMap.get('search') ?? '') !==
      String(query['search'] ?? '');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
      replaceUrl,
    });
  }

  onActionClicked(action: ITableClickedAction) {
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

  private positiveNumber(value: string | null, fallback: number) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }
  private pageSize(value: string | null) {
    const number = Number(value);
    return [10, 15, 25, 50, 100].includes(number) ? number : 15;
  }
}
