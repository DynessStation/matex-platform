import { Component, inject, viewChild } from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { ImportCsvModal } from '../../shared/components/ui/modal/import-csv-modal/import-csv-modal';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IAttribute, IAttributeModel } from '../../shared/interface/attribute.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllAttributeAction,
  DeleteAttributeAction,
  ExportAttributeAction,
  GetAttributesAction,
} from '../../shared/store/action/attribute.action';
import { AttributeState } from '../../shared/store/state/attribute.state';

@Component({
  selector: 'app-attribute',
  imports: [
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
    ImportCsvModal,
  ],
  templateUrl: './attribute.html',
  styleUrl: './attribute.scss',
})
export class Attribute {
  private store = inject(Store);
  router = inject(Router);

  attribute$: Observable<IAttributeModel> = inject(Store).select(AttributeState.attribute);

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
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'attribute.edit',
      },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'attribute.destroy',
      },
    ],
    data: [] as IAttribute[],
    total: 0,
  };

  ngOnInit() {
    this.attribute$.subscribe(attribute => {
      this.tableConfig.data = attribute ? attribute?.data : [];
      this.tableConfig.total = attribute ? attribute?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetAttributesAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: IAttribute) {
    void this.router.navigateByUrl(`/attribute/edit/${data.id}`);
  }

  delete(data: IAttribute) {
    this.store.dispatch(new DeleteAttributeAction(data.id!));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllAttributeAction(ids));
  }

  export() {
    this.store.dispatch(new ExportAttributeAction());
  }
}
