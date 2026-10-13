import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  IPageSpeedResponse,
  ISeoConsoleOverviewResponse,
} from '../interface/seo-console.interface';

@Injectable({ providedIn: 'root' })
export class SeoConsoleService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/seo-console`;

  getOverview(days: 7 | 28 | 90): Observable<ISeoConsoleOverviewResponse> {
    return this.http.get<ISeoConsoleOverviewResponse>(
      `${this.apiUrl}/overview`,
      {
        params: new HttpParams().set('days', days),
      },
    );
  }

  runPageSpeed(
    strategy: 'mobile' | 'desktop',
    path = '/',
  ): Observable<IPageSpeedResponse> {
    return this.http.get<IPageSpeedResponse>(`${this.apiUrl}/pagespeed`, {
      params: new HttpParams().set('strategy', strategy).set('path', path),
    });
  }
}
