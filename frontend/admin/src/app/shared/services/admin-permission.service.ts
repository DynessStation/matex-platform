import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import {
  IAdminPermissionDetailResponse,
  IAdminPermissionModel,
  ICreateAdminPermission,
  ICreateAdminPermissionResponse,
  IDeleteAdminPermissionResponse,
  IUpdateAdminPermission,
  IUpdateAdminPermissionResponse,
  IUpdateAdminPermissionStatus,
  IUpdateAdminPermissionStatusResponse,
} from '../interface/admin-permission.interface';
import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class AdminPermissionService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/admin-permission`;

  //==================================================
  //==== GET LIST
  //==================================================

  getAdminPermissions(payload?: Params): Observable<IAdminPermissionModel> {
    const params = listParams(payload);

    return this.http
      .get<IAdminPermissionModel>(this.apiUrl, {
        params,
      })
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item, index) => ({
            ...item,

            //==================================================
            //==== GENERIC TABLE INTERNAL ID
            //==================================================

            id: index + 1,
          })),
        })),
      );
  }

  //==================================================
  //==== CREATE
  //==================================================

  createAdminPermission(
    payload: ICreateAdminPermission,
  ): Observable<ICreateAdminPermissionResponse> {
    return this.http.post<ICreateAdminPermissionResponse>(this.apiUrl, payload);
  }

  //==================================================
  //==== DETAIL
  //==================================================

  getAdminPermissionDetail(
    id: string,
  ): Observable<IAdminPermissionDetailResponse> {
    return this.http.get<IAdminPermissionDetailResponse>(
      `${this.apiUrl}/${id}`,
    );
  }

  //==================================================
  //==== UPDATE
  //==================================================

  updateAdminPermission(
    id: string,

    payload: IUpdateAdminPermission,
  ): Observable<IUpdateAdminPermissionResponse> {
    return this.http.put<IUpdateAdminPermissionResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  //==================================================
  //==== STATUS
  //==================================================

  updateAdminPermissionStatus(
    id: string,

    payload: IUpdateAdminPermissionStatus,
  ): Observable<IUpdateAdminPermissionStatusResponse> {
    return this.http.patch<IUpdateAdminPermissionStatusResponse>(
      `${this.apiUrl}/${id}/status`,
      payload,
    );
  }

  //==================================================
  //==== DELETE
  //==================================================

  deleteAdminPermission(
    id: string,
  ): Observable<IDeleteAdminPermissionResponse> {
    return this.http.delete<IDeleteAdminPermissionResponse>(
      `${this.apiUrl}/${id}`,
    );
  }
}
