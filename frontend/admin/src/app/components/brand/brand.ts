import { Component, inject } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IBrand, IBrandModel } from '../../shared/interface/brand.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllBrandAction,
  DeleteBrandAction,
  GetBrandsAction,
  UpdateBrandStatusAction,
} from '../../shared/store/action/brand.action';
import { BrandState } from '../../shared/store/state/brand.state';

@Component({
  selector: 'app-brand',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './brand.html',
  styleUrl: './brand.scss',
})
export class Brand {
  private store = inject(Store);
  router = inject(Router);

  brand$: Observable<IBrandModel> = inject(Store).select(BrandState.brand);

  public tableConfig: ITableConfig = {
    columns: [
      {
        title: 'image',
        dataField: 'brand_image',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      { title: 'Name', dataField: 'name', sortable: true, sort_direction: 'desc' },
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
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'brand.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'brand.destroy',
      },
    ],
    data: [] as IBrand[],
    total: 0,
  };

  ngOnInit() {
    this.brand$.subscribe(brand => {
      this.tableConfig.data = brand ? brand?.data : [];
      this.tableConfig.total = brand ? brand?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetBrandsAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: IBrand) {
    void this.router.navigateByUrl(`/brand/edit/${data.id}`);
  }

  status(data: IBrand) {
    this.store.dispatch(new UpdateBrandStatusAction(data.id, data.status));
  }

  delete(data: IBrand) {
    this.store.dispatch(new DeleteBrandAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllBrandAction(ids));
  }
}
