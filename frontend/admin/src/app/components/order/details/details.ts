import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, viewChild } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2Data, Select2Module, Select2UpdateEvent } from 'ng-select2-component';
import { Observable, Subject, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { ShippingNoteModal } from './shipping-note-modal/shipping-note-modal';
import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { IOrderStatus, IOrderStatusModel } from '../../../shared/interface/order-status.interface';
import { IOrder, IOrderStatusActivities } from '../../../shared/interface/order.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency-symbol.pipe';
import { GetOrderStatusAction } from '../../../shared/store/action/order-status.action';
import { DownloadInvoiceAction, ViewOrderAction } from '../../../shared/store/action/order.action';
import { OrderStatusState } from '../../../shared/store/state/order-status.state';
import { OrderState } from '../../../shared/store/state/order.state';
import { PosInvoiceModal } from '../checkout/modal/pos-invoice-modal/pos-invoice-modal';

@Component({
  selector: 'app-details',
  imports: [
    CommonModule,
    TranslateModule,
    Select2Module,
    CurrencySymbolPipe,
    RouterModule,
    PageWrapper,
    PosInvoiceModal,
    ShippingNoteModal,
    DatePipe,
  ],
  providers: [DatePipe],
  templateUrl: './details.html',
  styleUrl: './details.scss',
})
export class Details {
  private store = inject(Store);
  private datePipe = inject(DatePipe);
  private route = inject(ActivatedRoute);

  orderStatus$: Observable<IOrderStatusModel> = inject(Store).select(OrderStatusState.orderStatus);
  orderStatuses$: Observable<Select2Data> = inject(Store).select(
    OrderStatusState.orderStatuses,
  ) as Observable<Select2Data>;

  readonly PosInvoice = viewChild<PosInvoiceModal>('posInvoice');
  readonly ShippingNote = viewChild<ShippingNoteModal>('shippingNote');

  public order: IOrder;
  public statuses: IOrderStatus[] = [];
  public init: boolean;
  private destroy$ = new Subject<void>();
  public isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
    this.store.dispatch(new GetOrderStatusAction());
    this.init = true;
  }

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new ViewOrderAction(params['id']))
            .pipe(mergeMap(() => this.store.select(OrderState.selectedOrder)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(order => {
        this.order = order!;
        if (this.order && this.order?.order_status_activities) {
          this.order?.order_status_activities?.map(actStatus => {
            this.orderStatus$.subscribe(res => {
              res.data.map(status => {
                if (actStatus.status == status.name) {
                  let convertDate = this.datePipe.transform(actStatus?.changed_at, 'dd MMM yyyy')!;
                  status['activities_date'] = convertDate;
                }
              });
            });
          });
        }
      });
  }

  updateOrderStatus(data: Select2UpdateEvent) {
    if (data && data?.value) {
      if (!this.init) void this.ShippingNote().openModal(this.order?.id, Number(data.value));

      this.init = false;
    }
  }

  getDate(status: string, order: IOrderStatusActivities[]) {
    const getdate = order?.map(res => {
      const convertDate = this.datePipe.transform(res?.changed_at, 'dd MMM yyyy hh:mm:a')!;
      return status === res.status ? convertDate : ' ';
    });
    return getdate;
  }

  ngOnDestroy() {
    this.statuses = [];
    this.destroy$.next();
    this.destroy$.complete();
  }

  download(id: number) {
    this.store.dispatch(new DownloadInvoiceAction({ order_number: id }));
  }
}
