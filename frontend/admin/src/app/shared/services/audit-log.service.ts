import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  IAuditLogDetailResponse,
  IAuditLogModel,
} from '../interface/audit-log.interface';

import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/audit-log`;

  //==================================================
  //==== GET LIST
  //==================================================

  getAuditLogs(payload?: Params): Observable<IAuditLogModel> {
    let params = new HttpParams();

    if (payload) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }

        //==================================================
        //==== KARTIFY PARAM MAPPING
        //==================================================

        switch (key) {
          case 'paginate':
            params = params.set('limit', String(value));

            break;

          case 'field':
            params = params.set('ord', String(value));

            break;

          case 'sort':
            params = params.set('srt', String(value));

            break;

          default:
            params = params.set(key, String(value));

            break;
        }
      });
    }

    return this.http
      .get<IAuditLogModel>(this.apiUrl, {
        params,
      })
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item) => ({
            ...item,

            //==================================================
            //==== GENERIC TABLE COMPATIBILITY
            //==================================================

            id: item.id_audit_log,
          })),
        })),
      );
  }

  //==================================================
  //==== GET DETAIL
  //==================================================

  getAuditLogDetail(id: string): Observable<IAuditLogDetailResponse> {
    return this.http.get<IAuditLogDetailResponse>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
    );
  }
}
