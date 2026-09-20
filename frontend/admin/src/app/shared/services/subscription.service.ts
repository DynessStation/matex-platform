import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { ISubscriptionModel } from '../interface/subscription.interface';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private http = inject(HttpClient);

  getSubscribeList(payload?: Params): Observable<ISubscriptionModel> {
    return this.http.get<ISubscriptionModel>(`${environment.URL}/subscribe.json`, {
      params: payload,
    });
  }
}
