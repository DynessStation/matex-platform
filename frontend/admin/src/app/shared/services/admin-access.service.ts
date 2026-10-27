import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import {
  IAdminAccessDetailResponse,
  IAdminAccessModel,
  IAdminAccessMutationResponse,
  IAdminAccessPayload,
  IAdminAccessPermissionMatrixResponse,
  IDeleteAdminAccessResponse,
  IUpdateAdminAccessStatus,
  IUpdateAdminAccessStatusResponse,
} from '../interface/admin-access.interface';
import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class AdminAccessService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/admin-access`;

  //==================================================
  //==== GET LIST
  //==================================================

  getAdminAccesses(payload?: Params): Observable<IAdminAccessModel> {
    const params = listParams(payload);

    return this.http
      .get<IAdminAccessModel>(this.apiUrl, {
        params,
      })
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item) => ({
            ...item,

            //==================================================
            //==== TEMPLATE TABLE COMPATIBILITY
            //==================================================

            id: item.id_admin_access,
          })),
        })),
      );
  }

  //==================================================
  //==== PERMISSION MATRIX
  //==================================================

  getPermissionMatrix(): Observable<IAdminAccessPermissionMatrixResponse> {
    return this.http.get<IAdminAccessPermissionMatrixResponse>(
      `${this.apiUrl}/permission-matrix`,
    );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  getAdminAccessDetail(id: string): Observable<IAdminAccessDetailResponse> {
    return this.http.get<IAdminAccessDetailResponse>(`${this.apiUrl}/${id}`);
  }

  //==================================================
  //==== CREATE
  //==================================================

  createAdminAccess(
    payload: IAdminAccessPayload,
  ): Observable<IAdminAccessMutationResponse> {
    return this.http.post<IAdminAccessMutationResponse>(this.apiUrl, payload);
  }

  //==================================================
  //==== UPDATE
  //==================================================

  updateAdminAccess(
    id: string,

    payload: IAdminAccessPayload,
  ): Observable<IAdminAccessMutationResponse> {
    return this.http.put<IAdminAccessMutationResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  //==================================================
  //==== UPDATE STATUS
  //==================================================

  updateAdminAccessStatus(
    id: string,

    payload: IUpdateAdminAccessStatus,
  ): Observable<IUpdateAdminAccessStatusResponse> {
    return this.http.patch<IUpdateAdminAccessStatusResponse>(
      `${this.apiUrl}/${id}/status`,
      payload,
    );
  }

  //==================================================
  //==== DELETE
  //==================================================

  deleteAdminAccess(id: string): Observable<IDeleteAdminAccessResponse> {
    return this.http.delete<IDeleteAdminAccessResponse>(`${this.apiUrl}/${id}`);
  }
}
