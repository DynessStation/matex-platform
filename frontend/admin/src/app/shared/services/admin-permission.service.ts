import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  IAdminPermissionGroupMutation,
  IAdminPermissionGroupsResponse,
  IAdminPermissionMutationResponse,
  ICreateAdminPermission,
  IUpdateAdminPermission,
} from '../interface/admin-permission.interface';
import { IApiResponse } from '../interface/api-response.interface';

@Injectable({ providedIn: 'root' })
export class AdminPermissionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/admin-permission`;
  private readonly groupUrl = `${this.apiUrl}-group`;

  getGroups(): Observable<IAdminPermissionGroupsResponse> {
    return this.http.get<IAdminPermissionGroupsResponse>(this.groupUrl);
  }

  createGroup(
    name: string,
  ): Observable<IApiResponse<IAdminPermissionGroupMutation>> {
    return this.http.post<IApiResponse<IAdminPermissionGroupMutation>>(
      this.groupUrl,
      { name },
    );
  }

  renameGroup(
    id: string,
    name: string,
  ): Observable<IApiResponse<IAdminPermissionGroupMutation>> {
    return this.http.put<IApiResponse<IAdminPermissionGroupMutation>>(
      `${this.groupUrl}/${id}`,
      { name },
    );
  }

  deleteGroup(id: string): Observable<IApiResponse<unknown>> {
    return this.http.delete<IApiResponse<unknown>>(`${this.groupUrl}/${id}`);
  }

  create(
    payload: ICreateAdminPermission,
  ): Observable<IAdminPermissionMutationResponse> {
    return this.http.post<IAdminPermissionMutationResponse>(
      this.apiUrl,
      payload,
    );
  }

  update(
    id: string,
    payload: IUpdateAdminPermission,
  ): Observable<IAdminPermissionMutationResponse> {
    return this.http.put<IAdminPermissionMutationResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  setStatus(
    id: string,
    status: 0 | 1,
  ): Observable<IAdminPermissionMutationResponse> {
    return this.http.patch<IAdminPermissionMutationResponse>(
      `${this.apiUrl}/${id}/status`,
      { permission_status: status },
    );
  }

  delete(id: string): Observable<IAdminPermissionMutationResponse> {
    return this.http.delete<IAdminPermissionMutationResponse>(
      `${this.apiUrl}/${id}`,
    );
  }
}
