import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  IOfficeDetailResponse,
  IOfficeModel,
  IOfficeMutationResponse,
  IOfficePayload,
  IUpdateOfficeStatus,
  IUpdateOfficeStatusResponse,
} from '../interface/office.interface';

import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class OfficeService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/office`;

  //==================================================
  //==== LIST
  //==================================================

  getOffices(payload?: Params): Observable<IOfficeModel> {
    let params = new HttpParams();

    if (payload) {
      if (payload['page'] !== undefined) {
        params = params.set('page', String(payload['page'] || 1));
      }

      if (payload['paginate'] !== undefined) {
        params = params.set('limit', String(payload['paginate']));
      }

      if (payload['limit'] !== undefined) {
        params = params.set('limit', String(payload['limit']));
      }

      if (payload['search']) {
        params = params.set('search', String(payload['search']));
      }

      if (payload['field']) {
        params = params.set('ord', String(payload['field']));
      }

      if (payload['sort']) {
        params = params.set('srt', String(payload['sort']));
      }
    }

    return this.http
      .get<IOfficeModel>(this.apiUrl, {
        params,
      })
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item) => ({
            ...item,

            id: item.id_office,
          })),
        })),
      );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  getOfficeDetail(id: string): Observable<IOfficeDetailResponse> {
    return this.http.get<IOfficeDetailResponse>(`${this.apiUrl}/${id}`);
  }

  //==================================================
  //==== CREATE
  //==================================================

  createOffice(payload: IOfficePayload): Observable<IOfficeMutationResponse> {
    return this.http.post<IOfficeMutationResponse>(this.apiUrl, payload);
  }

  //==================================================
  //==== UPDATE
  //==================================================

  updateOffice(
    id: string,
    payload: IOfficePayload,
  ): Observable<IOfficeMutationResponse> {
    return this.http.put<IOfficeMutationResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  //==================================================
  //==== STATUS
  //==================================================

  updateOfficeStatus(
    id: string,
    payload: IUpdateOfficeStatus,
  ): Observable<IUpdateOfficeStatusResponse> {
    return this.http.patch<IUpdateOfficeStatusResponse>(
      `${this.apiUrl}/${id}/status`,
      payload,
    );
  }

  //==================================================
  //==== DELETE
  //==================================================

  deleteOffice(id: string): Observable<IOfficeMutationResponse> {
    return this.http.delete<IOfficeMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
