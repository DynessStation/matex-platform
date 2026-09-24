import { CurrencyPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Currency } from '../interface/currency.interface';
import { Values } from '../interface/setting.interface';
import { SettingState } from '../store/state/setting.state';

@Pipe({
  name: 'currencySymbol',
  standalone: true,
})
export class CurrencySymbolPipe implements PipeTransform {
  private currencyPipe = inject(CurrencyPipe);
  private router = inject(Router);

  selectedCurrency$: Observable<Currency> = inject(Store).select(
    SettingState.selectedCurrency,
  ) as Observable<Currency>;

  public symbol: string = '$';
  public setting: Values;
  public selectedCurrency: Currency;

  constructor() {
    this.selectedCurrency$.subscribe((currency) => (this.selectedCurrency = currency));
  }

  transform(
    value: number | undefined,
    position: 'before_price' | 'after_price' | string = 'before_price',
    currencyCode?: string,
  ): string | number {
    if (!value) {
      value = 0;
    }
    value = Number(value);
    if (currencyCode) {
      const locale = this.router.url === '/en' || this.router.url.startsWith('/en/') ? 'en-US' : 'id-ID';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'IDR' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'IDR' ? 0 : 2,
      }).format(value);
    }
    value = value * this.selectedCurrency?.exchange_rate;

    this.symbol = this.selectedCurrency?.symbol;
    position = this.selectedCurrency?.symbol_position;

    let formattedValue = this.currencyPipe.transform(value, this.symbol);
    formattedValue = formattedValue?.replace(this.symbol, '')!;

    if (position === 'before_price') {
      return `${this.symbol}${formattedValue}`;
    } else {
      return `${formattedValue}${this.symbol}`;
    }
  }
}
