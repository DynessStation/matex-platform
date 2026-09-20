import { Component, inject } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { ICoupon, ICouponModel } from '../../shared/interface/coupon.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllCouponAction,
  DeleteCouponAction,
  GetCouponsAction,
  UpdateCouponStatusAction,
} from '../../shared/store/action/coupon.action';
import { CouponState } from '../../shared/store/state/coupon.state';

@Component({
  selector: 'app-coupon',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './coupon.html',
  styleUrl: './coupon.scss',
})
export class Coupon {
  private store = inject(Store);
  router = inject(Router);

  coupon$: Observable<ICouponModel> = inject(Store).select(CouponState.coupon);

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'title', dataField: 'title', sortable: true, sort_direction: 'desc' },
      { title: 'code', dataField: 'code', sortable: true, sort_direction: 'desc' },
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
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'coupon.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'coupon.destroy',
      },
    ],
    data: [] as ICoupon[],
    total: 0,
  };

  ngOnInit() {
    this.coupon$.subscribe(coupon => {
      this.tableConfig.data = coupon ? coupon?.data : [];
      this.tableConfig.total = coupon ? coupon?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetCouponsAction(data)).subscribe();
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: ICoupon) {
    void this.router.navigateByUrl(`/coupon/edit/${data.id}`);
  }

  status(data: ICoupon) {
    this.store.dispatch(new UpdateCouponStatusAction(data.id, data.status));
  }

  delete(data: ICoupon) {
    this.store.dispatch(new DeleteCouponAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllCouponAction(ids));
  }
}
