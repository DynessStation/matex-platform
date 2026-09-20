import { CurrencyPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

import { Store } from '@ngxs/store';

import { SettingState } from '../store/state/setting.state';

@Pipe({
  name: 'currencySymbol',
  standalone: true,
})
export class CurrencySymbolPipe implements PipeTransform {
  private store = inject(Store);
  private currencyPipe = inject(CurrencyPipe);

  transform(
    value: number,
    position: 'before_price' | 'after_price' | string = 'before_price',
  ): string {
    if (value == null || isNaN(value)) {
      return 'Invalid amount';
    }

    const setting = this.store.selectSnapshot(SettingState.setting);
    const exchangeRate = setting?.general?.default_currency?.exchange_rate ?? 1;
    const symbol = setting?.general?.default_currency?.symbol ?? '$';
    const symbolPosition = setting?.general?.default_currency?.symbol_position ?? position;

    // Adjust value by exchange rate
    value = value * exchangeRate;
    let formattedValue = this.currencyPipe.transform(value.toFixed(2), symbol);
    formattedValue = formattedValue?.replace(symbol, '') ?? '';

    if (symbolPosition === 'before_price') {
      return `${symbol}${formattedValue}`;
    } else {
      return `${formattedValue}${symbol}`;
    }
  }
}
