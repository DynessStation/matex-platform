import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IRefundModel } from '../interface/refund.interface';

@Injectable({
  providedIn: 'root',
})
export class RefundService {
  private http = inject(HttpClient);

  getRefunds(payload?: Params): Observable<IRefundModel> {
    return this.http.get<IRefundModel>(`${environment.URL}/refund.json`, { params: payload });
  }
}
