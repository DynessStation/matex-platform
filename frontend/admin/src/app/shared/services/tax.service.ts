import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { ITaxModel } from '../interface/tax.interface';

@Injectable({
  providedIn: 'root',
})
export class TaxService {
  private http = inject(HttpClient);

  getTaxes(payload?: Params): Observable<ITaxModel> {
    return this.http.get<ITaxModel>(`${environment.URL}/tax.json`, { params: payload });
  }
}
