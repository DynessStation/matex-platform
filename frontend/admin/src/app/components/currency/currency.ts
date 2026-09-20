import { Component, inject } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { ICurrency, ICurrencyModel } from '../../shared/interface/currency.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllCurrencyAction,
  DeleteCurrencyAction,
  GetCurrenciesAction,
  UpdateCurrencyStatusAction,
} from '../../shared/store/action/currency.action';
import { CurrencyState } from '../../shared/store/state/currency.state';

@Component({
  selector: 'app-currency',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './currency.html',
  styleUrl: './currency.scss',
})
export class Currency {
  private store = inject(Store);
  router = inject(Router);

  currency$: Observable<ICurrencyModel> = inject(Store).select(CurrencyState.currency);

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'code', dataField: 'code', sortable: true, sort_direction: 'desc' },
      { title: 'symbol', dataField: 'symbol' },
      { title: 'exchange_rate', dataField: 'exchange_rate' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'status', dataField: 'status', type: 'switch' },
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'currency.edit',
      },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'currency.destroy',
      },
    ],
    data: [] as ICurrency[],
    total: 0,
  };

  ngOnInit(): void {
    this.currency$.subscribe(currency => {
      this.tableConfig.data = currency ? currency?.data : [];
      this.tableConfig.total = currency ? currency?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetCurrenciesAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: ICurrency) {
    void this.router.navigateByUrl(`/currency/edit/${data.id}`);
  }

  status(data: ICurrency) {
    this.store.dispatch(new UpdateCurrencyStatusAction(data.id, data.status));
  }

  delete(data: ICurrency) {
    this.store.dispatch(new DeleteCurrencyAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllCurrencyAction(ids));
  }
}
