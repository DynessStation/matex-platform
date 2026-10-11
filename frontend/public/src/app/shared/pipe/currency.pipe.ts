import { CurrencyPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Values } from '../interface/setting.interface';
import { SettingState } from '../store/state/setting.state';

@Pipe({
  name: 'currencySymbol',
  standalone: true,
})
export class CurrencySymbolPipe implements PipeTransform {
  private currencyPipe = inject(CurrencyPipe);
  private router = inject(Router);

  private selectedCurrency = inject(Store).selectSignal(SettingState.selectedCurrency);

  public symbol: string = '$';
  public setting: Values;
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
      const locale =
        this.router.url === '/en' || this.router.url.startsWith('/en/') ? 'en-US' : 'id-ID';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'IDR' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'IDR' ? 0 : 2,
      }).format(value);
    }
    const selectedCurrency = this.selectedCurrency();
    value = value * (selectedCurrency?.exchange_rate ?? 1);

    this.symbol = selectedCurrency?.symbol ?? 'Rp';
    position = selectedCurrency?.symbol_position ?? 'before_price';

    let formattedValue = this.currencyPipe.transform(value, this.symbol);
    formattedValue = formattedValue?.replace(this.symbol, '')!;

    if (position === 'before_price') {
      return `${this.symbol}${formattedValue}`;
    } else {
      return `${formattedValue}${this.symbol}`;
    }
  }
}
