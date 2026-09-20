import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IShipping } from '../interface/shipping.interface';

@Injectable({
  providedIn: 'root',
})
export class ShippingService {
  private http = inject(HttpClient);

  getShippings(payload?: Params): Observable<IShipping[]> {
    return this.http.get<IShipping[]>(`${environment.URL}/shipping.json`, { params: payload });
  }
}
