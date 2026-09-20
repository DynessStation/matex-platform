import { Component, inject, viewChild, input } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { ImportCsvModal } from '../../shared/components/ui/modal/import-csv-modal/import-csv-modal';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { ITag, ITagModel } from '../../shared/interface/tag.interface';
import {
  DeleteAllTagAction,
  DeleteTagAction,
  ExportTagAction,
  GetTagsAction,
  UpdateTagStatusAction,
} from '../../shared/store/action/tag.action';
import { TagState } from '../../shared/store/state/tag.state';

@Component({
  selector: 'app-tag',
  imports: [
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
    ImportCsvModal,
  ],
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
})
export class Tag {
  private store = inject(Store);
  router = inject(Router);

  tag$: Observable<ITagModel> = inject(Store).select(TagState.tag);

  readonly tagType = input<string | null>('product');

  readonly CSVModal = viewChild<ImportCsvModal>('csvModal');

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'name', dataField: 'name', sortable: true, sort_direction: 'desc' },
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
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'tag.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'tag.destroy',
      },
    ],
    data: [] as ITag[],
    total: 0,
  };

  ngOnInit() {
    this.tag$.subscribe(tag => {
      this.tableConfig.data = tag ? tag?.data : [];
      this.tableConfig.total = tag ? tag?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    data!['type'] = this.tagType()!;
    this.store.dispatch(new GetTagsAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: ITag) {
    if (this.tagType() == 'post') void this.router.navigateByUrl(`/blog/tag/edit/${data.id}`);
    else void this.router.navigateByUrl(`/tag/edit/${data.id}`);
  }

  status(data: ITag) {
    this.store.dispatch(new UpdateTagStatusAction(data.id, data.status));
  }

  delete(data: ITag) {
    this.store.dispatch(new DeleteTagAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllTagAction(ids));
  }

  export() {
    this.store.dispatch(new ExportTagAction());
  }
}
