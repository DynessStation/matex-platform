import { Component, inject, viewChild } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { PayoutModal } from '../../shared/components/ui/modal/payout-modal/payout-modal';
import { Table } from '../../shared/components/ui/table/table';
import { Params } from '../../shared/interface/core.interface';
import { IRefund, IRefundModel } from '../../shared/interface/refund.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { GetRefundAction, UpdateRefundStatusAction } from '../../shared/store/action/refund.action';
import { RefundState } from '../../shared/store/state/refund.state';

@Component({
  selector: 'app-refund',
  imports: [PageWrapper, Table, PayoutModal],
  templateUrl: './refund.html',
  styleUrl: './refund.scss',
})
export class Refund {
  private store = inject(Store);

  refund$: Observable<IRefundModel> = inject(Store).select(RefundState.refund);

  readonly PayoutModal = viewChild<PayoutModal>('payoutModal');

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'order_number', dataField: 'order_id' },
      {
        title: 'consumer_name',
        dataField: 'consumer_name',
        sortable: true,
        sort_direction: 'desc',
      },
      { title: 'status', dataField: 'refund_status' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
    ],
    rowActions: [{ label: 'View', actionToPerform: 'view', icon: 'ri-eye-line' }],
    data: [] as IRefund[],
    total: 0,
  };

  ngOnInit() {
    this.refund$.subscribe(refund => {
      let refunds = refund?.data?.filter((element: IRefund) => {
        element.consumer_name = element?.user?.name;
        element.order_id = `<span class="fw-bolder">#${element?.order?.order_number}</span>`;
        element.refund_status = element.status
          ? `<div class="status-${element.status}"><span>${element.status.replace(/_/g, ' ')}</span></div>`
          : '-';
        return element;
      });
      this.tableConfig.data = refund ? refunds : [];
      this.tableConfig.total = refund ? refund?.total : 0;
    });
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'view') void this.PayoutModal().openModal(action.data);
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetRefundAction(data));
  }

  approved(event: any) {
    this.store.dispatch(new UpdateRefundStatusAction(event.data.id, event.status));
  }
}
