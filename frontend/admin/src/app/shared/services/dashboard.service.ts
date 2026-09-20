import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IRevenueChart, IStatisticsCount } from '../interface/dashboard.interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  getStatisticsCount(payload?: Params): Observable<IStatisticsCount> {
    return this.http.get<IStatisticsCount>(`${environment.URL}/count.json`, { params: payload });
  }

  getRevenueChart(): Observable<IRevenueChart> {
    return this.http.get<IRevenueChart>(`${environment.URL}/chart.json`);
  }
}
