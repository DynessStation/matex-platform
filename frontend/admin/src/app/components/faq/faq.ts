import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { OrderList } from '../../shared/components/ui/order-list/order-list';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { Params } from '../../shared/interface/core.interface';
import { IFaq, IFaqModel } from '../../shared/interface/faq.interface';
import { IOrderItem } from '../../shared/interface/order-list.interface';
import {
  ITableClickedAction,
  ITableConfig,
} from '../../shared/interface/table.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { FaqService } from '../../shared/services/faq.service';
import { NotificationService } from '../../shared/services/notification.service';
import {
  DeleteAllFaqAction,
  DeleteFaqAction,
  GetFaqsAction,
  UpdateFaqStatusAction,
} from '../../shared/store/action/faq.action';
import { FaqState } from '../../shared/store/state/faq.state';

@Component({
  selector: 'app-faq',
  imports: [
    TranslateModule,
    RouterModule,
    HasPermissionDirective,
    PageWrapper,
    Table,
    OrderList,
  ],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
  private store = inject(Store);
  private faqService = inject(FaqService);
  private notifications = inject(NotificationService);
  private messages = inject(ApiMessageService);
  router = inject(Router);

  // "Atur urutan": the table is replaced by the drag list until it is saved or cancelled.
  ordering = false;
  orderItems: IOrderItem[] = [];
  savingOrder = false;

  faq$: Observable<IFaqModel | null> = this.store.select(FaqState.faq);
  private currentTableParams: Params = {
    search: '',
    page: 1,
    paginate: 15,
    field: '',
    sort: '',
  };

  public tableConfig: ITableConfig<IFaq> = {
    columns: [
      {
        title: 'faq_admin.question',
        dataField: 'question',
        sortable: true,
        sort_direction: 'asc',
      },
      {
        title: 'faq_admin.key',
        dataField: 'key',
        sortable: true,
        sort_direction: 'asc',
      },
      { title: 'faq_admin.translations', dataField: 'translation_label' },
      {
        title: 'Urutan',
        dataField: 'sort_order',
        sortable: true,
        sort_direction: 'asc',
      },
      {
        title: 'created_at',
        dataField: 'created',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
      {
        title: 'Tampil di website',
        dataField: 'status',
        type: 'switch',
        activeLabel: 'Tampil',
        inactiveLabel: 'Disembunyikan',
      },
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'faq.update',
      },
      {
        label: 'Delete',
        actionToPerform: 'delete',
        icon: 'ri-delete-bin-line',
        permission: 'faq.delete',
      },
    ],
    data: [] as IFaq[],
    total: 0,
  };

  ngOnInit() {
    this.faq$.subscribe((faq) => {
      this.tableConfig.data = (faq?.data ?? []).map((item) => ({
        ...item,
        translation_label: item.translation_complete
          ? 'Indonesia + English'
          : 'Belum lengkap',
      }));
      this.tableConfig.total = faq?.pagination.total ?? 0;
      this.tableConfig.total_all = faq?.pagination.total_all;
    });
  }

  onTableChange(data?: Params) {
    this.currentTableParams = { ...this.currentTableParams, ...(data ?? {}) };
    this.store.dispatch(new GetFaqsAction(this.currentTableParams));
  }

  onActionClicked(action: ITableClickedAction<IFaq>) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll')
      this.deleteAll((action.ids ?? []).map(String));
  }

  openOrder() {
    this.faqService.getOrder().subscribe((response) => {
      this.orderItems = (response.data?.data ?? []).map((item) => ({
        ...item,
        note: Number(item.status) === 0 ? 'Disembunyikan' : '',
      }));
      this.ordering = true;
    });
  }

  saveOrder(ids: string[]) {
    this.savingOrder = true;
    this.faqService.saveOrder(ids).subscribe({
      next: (response) => {
        this.savingOrder = false;
        this.ordering = false;
        this.notifications.showSuccess(this.messages.resolveResponse(response));
        this.store.dispatch(new GetFaqsAction(this.currentTableParams));
      },
      error: () => (this.savingOrder = false),
    });
  }

  edit(data: IFaq) {
    void this.router.navigateByUrl(`/faq/edit/${data.id}`);
  }

  status(data: IFaq) {
    this.store
      .dispatch(new UpdateFaqStatusAction(data.id, data.status))
      .subscribe({
        complete: () =>
          this.store.dispatch(new GetFaqsAction(this.currentTableParams)),
        error: () =>
          this.store.dispatch(new GetFaqsAction(this.currentTableParams)),
      });
  }

  delete(data: IFaq) {
    this.store.dispatch(new DeleteFaqAction(data.id)).subscribe({
      complete: () =>
        this.store.dispatch(new GetFaqsAction(this.currentTableParams)),
    });
  }

  deleteAll(ids: string[]) {
    this.store.dispatch(new DeleteAllFaqAction(ids)).subscribe({
      complete: () =>
        this.store.dispatch(new GetFaqsAction(this.currentTableParams)),
    });
  }
}
