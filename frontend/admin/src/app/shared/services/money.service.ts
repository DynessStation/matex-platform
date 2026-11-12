import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ILedgerBalance,
  ILedgerEntry,
  IMoneyFilter,
  IMoneySummary,
  IPaymentPayload,
} from '../interface/money.interface';

const paramsOf = (filter: IMoneyFilter): HttpParams => {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value) params = params.set(key, String(value));
  }
  return params;
};

@Injectable({ providedIn: 'root' })
export class MoneyService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/money`;

  summary(filter: IMoneyFilter) {
    return this.http.get<IApiResponse<IMoneySummary>>(`${this.api}/summary`, {
      params: paramsOf(filter),
    });
  }
  ledger(filter: IMoneyFilter) {
    return this.http.get<
      IApiResponse<ILedgerEntry[]> & { meta: { balances: ILedgerBalance[] } }
    >(`${this.api}/ledger`, { params: paramsOf(filter) });
  }
  recordPayment(payload: IPaymentPayload) {
    return this.http.post<IApiResponse<{ ids: string[] }>>(
      `${this.api}/payments`,
      payload,
    );
  }
  rebuild(store?: string) {
    return this.http.post<
      IApiResponse<{ settlements: number; rows_added: number }>
    >(`${this.api}/rebuild`, { store: store || undefined });
  }
}
