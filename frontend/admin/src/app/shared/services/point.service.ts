import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IPoint } from '../interface/point.interface';

@Injectable({
  providedIn: 'root',
})
export class PointService {
  private http = inject(HttpClient);

  getUserTransaction(payload?: Params): Observable<IPoint> {
    return this.http.get<IPoint>(`${environment.URL}/points.json`, { params: payload });
  }
}
