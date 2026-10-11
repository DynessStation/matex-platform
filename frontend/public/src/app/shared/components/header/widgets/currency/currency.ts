import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { combineLatest, Observable } from 'rxjs';

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  setting$: Observable<Values | null> = this.store.select(SettingState.setting);
  selectedCurrency$: Observable<ICurrency | null> = this.store.select(
    SettingState.selectedCurrency,
  );
  currency$: Observable<CurrencyModel> = this.store.select(CurrencyState.currency);

  public open: boolean = false;
  constructor() {
    combineLatest([this.currency$, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([currencies, queryParams]) => {
        const requestedCode = queryParams.get('currency')?.toUpperCase();
        if (!requestedCode) return;

        const requestedCurrency = currencies.data.find(
          (currency) => currency.code.toUpperCase() === requestedCode,
        );
        const selectedCode = this.store
          .selectSnapshot(SettingState.selectedCurrency)
          ?.code?.toUpperCase();

        if (requestedCurrency && selectedCode !== requestedCode) {
          this.store.dispatch(new SelectedCurrency(requestedCurrency));
        }
      });
  }

  openDropDown() {
    this.open = !this.open;
  }

  selectCurrency(currency: ICurrency) {
    this.open = false;
    this.store.dispatch(new SelectedCurrency(currency)).subscribe({
      complete: () => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { currency: currency.code, price: null, page: 1 },
          queryParamsHandling: 'merge',
        });
      },
    });
  }

  hideDropdown() {
    this.open = false;
  }
}
