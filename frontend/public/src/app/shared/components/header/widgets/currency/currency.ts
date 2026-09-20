import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { ClickOutsideDirective } from '../../../../directive/out-side-directive';
import { CurrencyModel, ICurrency } from '../../../../interface/currency.interface';
import { Values } from '../../../../interface/setting.interface';
import { SelectedCurrency } from '../../../../store/action/setting.action';
import { CurrencyState } from '../../../../store/state/currency.state';
import { SettingState } from '../../../../store/state/setting.state';

@Component({
  selector: 'app-currency',
  imports: [ClickOutsideDirective, AsyncPipe],
  templateUrl: './currency.html',
  styleUrl: './currency.scss',
})
export class Currency {
  public active: boolean = false;

  private store = inject(Store);

  setting$: Observable<Values | null> = this.store.select(SettingState.setting);
  selectedCurrency$: Observable<ICurrency | null> = this.store.select(
    SettingState.selectedCurrency,
  );
  currency$: Observable<CurrencyModel> = this.store.select(CurrencyState.currency);

  public open: boolean = false;
  constructor() { }

  openDropDown() {
    this.open = !this.open;
  }

  selectCurrency(currency: ICurrency) {
    this.open = false;
    this.store.dispatch(new SelectedCurrency(currency)).subscribe({
      complete: () => {
        window.location.reload();
      },
    });
  }

  hideDropdown() {
    this.open = false;
  }
}
