import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import {
  IOfficeDetailResponse,
  IOfficeModel,
  IOfficeMutationResponse,
  IOfficePayload,
  IUpdateOfficeStatus,
  IUpdateOfficeStatusResponse,
} from '../interface/office.interface';
import {
  IOrderListResponse,
  IOrderSaveResponse,
} from '../interface/order-list.interface';

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
    const params = listParams(payload);

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

  /** Public offices in their order (Contact page and footer), for "Atur urutan". */
  getPublicOrder(): Observable<IOrderListResponse> {
    return this.http.get<IOrderListResponse>(`${this.apiUrl}/public-order`);
  }

  /** Saves the public order (`ids`: every public office, first = position 1). */
  savePublicOrder(ids: string[]): Observable<IOrderSaveResponse> {
    return this.http.put<IOrderSaveResponse>(`${this.apiUrl}/public-order`, {
      ids,
    });
  }

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
