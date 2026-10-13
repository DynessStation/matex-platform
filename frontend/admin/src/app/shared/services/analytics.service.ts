import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IAnalyticsOverviewResponse } from '../interface/analytics.interface';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/analytics/overview`;

  getOverview(
    from: string,
    to: string,
  ): Observable<IAnalyticsOverviewResponse> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<IAnalyticsOverviewResponse>(this.apiUrl, { params });
  }
}
