import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { IFaq, IFaqModel } from '../../shared/interface/faq.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllFaqAction,
  DeleteFaqAction,
  GetFaqsAction,
  UpdateFaqStatusAction,
} from '../../shared/store/action/faq.action';
import { FaqState } from '../../shared/store/state/faq.state';

@Component({
  selector: 'app-faq',
  imports: [TranslateModule, RouterModule, HasPermissionDirective, PageWrapper, Table],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
  private store = inject(Store);
  router = inject(Router);

  faq$: Observable<IFaqModel> = inject(Store).select(FaqState.faq);

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
      { label: 'Edit', actionToPerform: 'edit', icon: 'ri-pencil-line', permission: 'faq.edit' },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'faq.destroy',
      },
    ],
    data: [] as IFaq[],
    total: 0,
  };

  ngOnInit() {
    this.faq$.subscribe(faq => {
      this.tableConfig.data = faq ? faq?.data : [];
      this.tableConfig.total = faq ? faq?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetFaqsAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: IFaq) {
    void this.router.navigateByUrl(`/faq/edit/${data.id}`);
  }

  status(data: IFaq) {
    this.store.dispatch(new UpdateFaqStatusAction(data.id, data.status));
  }

  delete(data: IFaq) {
    this.store.dispatch(new DeleteFaqAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllFaqAction(ids));
  }
}
