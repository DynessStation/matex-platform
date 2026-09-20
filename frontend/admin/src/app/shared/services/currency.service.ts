import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { ICurrencyModel } from '../interface/currency.interface';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private http = inject(HttpClient);

  getCurrencies(payload?: Params): Observable<ICurrencyModel> {
    return this.http.get<ICurrencyModel>(`${environment.URL}/currency.json`, { params: payload });
  }
}
