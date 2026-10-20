import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

import { CURRENCIES } from '../data/currencies';
import { Params } from '../interface/core.interface';
import { CurrencyModel } from '../interface/currency.interface';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  public selectedCurrency: any;

  // The currency list ships with the app (shared/data); prices come from the API per currency.
  getCurrencies(_payload?: Params): Observable<CurrencyModel> {
    return of(structuredClone(CURRENCIES) as unknown as CurrencyModel);
  }
}
