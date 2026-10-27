import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
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
    const params = listParams(payload);

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
