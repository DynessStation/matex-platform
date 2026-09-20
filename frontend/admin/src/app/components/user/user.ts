
import { Component, inject, viewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { ImportCsvModal } from '../../shared/components/ui/modal/import-csv-modal/import-csv-modal';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { IUser, IUserModel } from '../../shared/interface/user.interface';
import {
  DeleteAllUserAction,
  DeleteUserAction,
  ExportUserAction,
  GetUsersAction,
  UpdateUserStatusAction,
} from '../../shared/store/action/user.action';
import { UserState } from '../../shared/store/state/user.state';

@Component({
  selector: 'app-user',
  imports: [
    RouterModule,
    TranslateModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
    ImportCsvModal
],
  templateUrl: './user.html',
  styleUrl: './user.scss',
})
export class User {
  private store = inject(Store);
  router = inject(Router);

  user$: Observable<IUserModel> = inject(Store).select(UserState.user);

  readonly CSVModal = viewChild<ImportCsvModal>('csvModal');

  public tableConfig: ITableConfig = {
    columns: [
      {
        title: 'avatar',
        dataField: 'profile_image',
        class: 'tbl-image rounded-circle',
        type: 'image',
      },
      { title: 'name', dataField: 'name', sortable: true, sort_direction: 'desc' },
      { title: 'email', dataField: 'email' },
      { title: 'role', dataField: 'role_name' },
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
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'user.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'user.destroy',
      },
    ],
    data: [] as IUser[],
    total: 0,
  };

  ngOnInit() {
    this.user$.subscribe(user => {
      let users = user?.data?.filter(element => {
        element.role_name = element?.role?.name!;
        return element;
      });
      this.tableConfig.data = user ? users : [];
      this.tableConfig.total = user ? user.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetUsersAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: IUser) {
    void this.router.navigateByUrl(`/user/edit/${data.id}`);
  }

  status(data: IUser) {
    this.store.dispatch(new UpdateUserStatusAction(data.id, data.status));
  }

  delete(data: IUser) {
    this.store.dispatch(new DeleteUserAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllUserAction(ids));
  }

  export() {
    this.store.dispatch(new ExportUserAction());
  }
}
