import { CommonModule } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { ShippingCountryModal } from './modal/shipping-country-modal/shipping-country-modal';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { DeleteModal } from '../../shared/components/ui/modal/delete-modal/delete-modal';
import { NoData } from '../../shared/components/ui/no-data/no-data';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IShipping, IShippingModel } from '../../shared/interface/shipping.interface';
import {
  DeleteShippingAction,
  GetShippingsAction,
} from '../../shared/store/action/shipping.action';
import { ShippingState } from '../../shared/store/state/shipping.state';

@Component({
  selector: 'app-shipping',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HasPermissionDirective,
    PageWrapper,
    NoData,
    ShippingCountryModal,
    DeleteModal,
  ],
  templateUrl: './shipping.html',
  styleUrl: './shipping.scss',
})
export class Shipping {
  private store = inject(Store);

  shipping$: Observable<IShippingModel> = inject(Store).select(
    ShippingState.shipping,
  ) as Observable<IShippingModel>;

  readonly CountryShippingModal = viewChild<ShippingCountryModal>('countryShippingModal');
  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  constructor() {
    this.store.dispatch(new GetShippingsAction());
  }

  delete(actionType: string, data: IShipping) {
    this.store.dispatch(new DeleteShippingAction(data?.id));
  }
}
