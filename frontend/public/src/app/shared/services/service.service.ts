import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import { ServiceModel } from '../interface/service.interface';

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  public searchSkeleton: boolean = false;

  constructor(private http: HttpClient) {}

  getService(payload?: Params): Observable<ServiceModel> {
    return this.http.get<ServiceModel>(`${environment.URL}/service.json`, { params: payload });
  }
}
