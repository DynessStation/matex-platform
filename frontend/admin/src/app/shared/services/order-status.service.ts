import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IOrderStatusModel } from '../interface/order-status.interface';

@Injectable({
  providedIn: 'root',
})
export class OrderStatusService {
  private http = inject(HttpClient);

  getOrderStatus(payload?: Params): Observable<IOrderStatusModel> {
    return this.http.get<IOrderStatusModel>(`${environment.URL}/orderStatus.json`, {
      params: payload,
    });
  }
}
