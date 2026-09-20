import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Params } from '@angular/router';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IStoresModel } from '../interface/store.interface';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private http = inject(HttpClient);

  public skeletonLoader: boolean = false;

  getStores(payload?: Params): Observable<IStoresModel> {
    return this.http.get<IStoresModel>(`${environment.URL}/store.json`, { params: payload });
  }
}
