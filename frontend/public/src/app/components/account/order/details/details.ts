import {
  DatePipe,
  isPlatformBrowser,
  Location,
  AsyncPipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';
import { Component, Inject, inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { mergeMap, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';

import { OrderStatusModel } from '../../../../shared/interface/order-status.interface';
import { Order } from '../../../../shared/interface/order.interface';
import { Product } from '../../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../../shared/pipe/currency.pipe';
import { TextConverterPipe } from '../../../../shared/pipe/text-converter.pipe';
import { GetOrderStatus } from '../../../../shared/store/action/order-status.action';
import { DownloadInvoice, ViewOrder } from '../../../../shared/store/action/order.action';
import { OrderStatusState } from '../../../../shared/store/state/order-status.state';
import { OrderState } from '../../../../shared/store/state/order.state';

@Component({
  selector: 'app-details',
  imports: [
    CurrencySymbolPipe,
    RouterLink,
    TextConverterPipe,
    DatePipe,
    TranslateModule,
    AsyncPipe,
    DatePipe,
    TitleCasePipe,
    UpperCasePipe,
  ],
  providers: [DatePipe],
  templateUrl: './details.html',
  styleUrl: './details.scss',
})
export class Details {
  private store = inject(Store);
  orderStatus$: Observable<OrderStatusModel> = this.store.select(OrderStatusState.orderStatus);

  private destroy$ = new Subject<void>();

  public order: Order;
  public isLogin: boolean;

  constructor(
    private route: ActivatedRoute,
    private modal: NgbModal,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object,
    private location: Location,
  ) {
    this.store.dispatch(new GetOrderStatus());
  }

  ngOnInit() {
    this.isLogin = !!this.store.selectSnapshot((state) => state.auth && state.auth.access_token);
    this.route.params
      .pipe(
        switchMap((params) => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new ViewOrder(params['id']))
            .pipe(mergeMap(() => this.store.select(OrderState.selectedOrder)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((order) => {
        this.order = order!;
        if (this.order && this.order?.order_status_activities) {
          this.order?.order_status_activities?.map((actStatus) => {
            this.orderStatus$.subscribe((res) => {
              res.data.map((status) => {
                if (actStatus.status == status.name) {
                  let convertDate = this.datePipe.transform(
                    actStatus?.changed_at,
                    'dd MMM yyyy hh:mm:a',
                  )!;
                  status['activities_date'] = convertDate;
                }
              });
            });
          });
        }
      });
  }

  openPayModal(_order: Order) {}

  openRefundModal(_product: Product, _order_id: number) {}

  download(id: number) {
    this.store.dispatch(new DownloadInvoice({ order_number: id }));
  }

  back() {
    if (isPlatformBrowser(this.platformId)) {
      this.location.back();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
