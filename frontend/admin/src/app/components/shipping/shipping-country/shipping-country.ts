import { CommonModule } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, Subject, mergeMap, of, switchMap, takeUntil } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { NoData } from '../../../shared/components/ui/no-data/no-data';
import { IShipping } from '../../../shared/interface/shipping.interface';
import {
  DeleteShippingRuleAction,
  EditShippingAction,
} from '../../../shared/store/action/shipping.action';
import { ShippingState } from '../../../shared/store/state/shipping.state';
import { FormShipping } from '../form-shipping/form-shipping';
import { ShippingRuleModal } from '../modal/shipping-rule-modal/shipping-rule-modal';

@Component({
  selector: 'app-shipping-country',
  imports: [
    CommonModule,
    RouterModule,
    NgbModule,
    TranslateModule,
    PageWrapper,
    FormShipping,
    NoData,
    ShippingRuleModal,
  ],
  templateUrl: './shipping-country.html',
  styleUrl: './shipping-country.scss',
})
export class ShippingCountry {
  private store = inject(Store);
  private route = inject(ActivatedRoute);

  shipping$: Observable<IShipping> = inject(Store).select(
    ShippingState.selectedShipping,
  ) as Observable<IShipping>;

  readonly CreateShippingRuleModal = viewChild<ShippingRuleModal>('createShippingRuleModal');

  public id: number;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap(params => {
          if (!params['id']) return of();
          return this.store
            .dispatch(new EditShippingAction(params['id']))
            .pipe(mergeMap(() => this.store.select(ShippingState.selectedShipping)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(shipping => {
        this.id = shipping?.id!;
      });
  }

  delete(actionType: string, data: IShipping) {
    this.store.dispatch(new DeleteShippingRuleAction(data?.id));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
