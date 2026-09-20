import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { INotice, INoticeModel } from '../../shared/interface/notice.interface';
import { IPermission } from '../../shared/interface/role.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { DeleteNoticeAction, GetNoticeAction } from '../../shared/store/action/notice.action';
import { AccountState } from '../../shared/store/state/account.state';
import { NoticeState } from '../../shared/store/state/notice.state';

@Component({
  selector: 'app-notice',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
  ],
  templateUrl: './notice.html',
  styleUrl: './notice.scss',
})
export class Notice {
  private store = inject(Store);
  router = inject(Router);

  notice$: Observable<INoticeModel> = inject(Store).select(NoticeState.notice);
  permissions$: Observable<IPermission[]> = inject(Store).select(AccountState.permissions);

  public role: string;
  public permissions: string[] = [];
  public tableConfig: ITableConfig = {
    columns: [
      { title: 'title', dataField: 'title', sortable: true, sort_direction: 'desc' },
      { title: 'priority', dataField: 'badge' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
    ],
    rowActions: [
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'notice.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'notice.destroy',
      },
    ],
    data: [] as INotice[],
    total: 0,
  };

  ngOnInit() {
    this.role = this.store.selectSnapshot(state => state.account && state.account.roleName);
    if (this.role !== 'admin') {
      this.store.dispatch(new GetNoticeAction());
    }

    this.notice$.subscribe(notice => {
      let notices = notice?.data?.filter((element: INotice) => {
        element.badge = element.priority
          ? `<div class="status-${element.priority}"><span>${element.priority}</span></div>`
          : '-';
        return element;
      });
      this.tableConfig.data = notice ? notices : [];
      this.tableConfig.total = notice ? notice?.total : 0;
    });
  }

  hasPermission(per: string) {
    this.permissions$.subscribe(
      permission => (this.permissions = permission?.map((value: IPermission) => value?.name)),
    );
    return this.permissions.includes(per);
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetNoticeAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
  }

  edit(data: INotice) {
    void this.router.navigateByUrl(`/notice/edit/${data.id}`);
  }

  delete(data: INotice) {
    this.store.dispatch(new DeleteNoticeAction(data.id));
  }
}
