import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IPage, IPageModel } from '../../shared/interface/page.interface';
import { IValues } from '../../shared/interface/setting.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllPageAction,
  DeletePageAction,
  GetPagesAction,
  UpdatePageStatusAction,
} from '../../shared/store/action/page.action';
import { PageState } from '../../shared/store/state/page.state';
import { SettingState } from '../../shared/store/state/setting.state';

@Component({
  selector: 'app-page',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {
  private store = inject(Store);
  router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  page$: Observable<IPageModel> = inject(Store).select(PageState.page);
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public url: string;

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'title', dataField: 'title', sortable: true, sort_direction: 'desc' },
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
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'page.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'page.destroy',
      },
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' },
    ],
    data: [] as IPage[],
    total: 0,
  };

  constructor() {
    this.setting$.subscribe(setting => {
      if (setting && setting.general) {
        this.url = setting.general.site_url;
      }
    });
  }

  ngOnInit(): void {
    this.page$.subscribe(page => {
      this.tableConfig.data = page ? page?.data : [];
      this.tableConfig.total = page ? page?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetPagesAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
    else if (action.actionToPerform == 'view') this.view(action.data);
  }

  edit(data: IPage) {
    void this.router.navigateByUrl(`/page/edit/${data.id}`);
  }

  status(data: IPage) {
    this.store.dispatch(new UpdatePageStatusAction(data.id, data.status));
  }

  delete(data: IPage) {
    this.store.dispatch(new DeletePageAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllPageAction(ids));
  }

  view(data: IPage) {
    if (isPlatformBrowser(this.platformId)) {
      window.open(this.url + '/page/' + data.slug, '_blank');
    }
  }
}
