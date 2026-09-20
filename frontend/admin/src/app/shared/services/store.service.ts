import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IStoresModel } from '../interface/store.interface';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private http = inject(HttpClient);

  getStores(payload?: Params): Observable<IStoresModel> {
    return this.http.get<IStoresModel>(`${environment.URL}/store.json`, { params: payload });
  }
}
