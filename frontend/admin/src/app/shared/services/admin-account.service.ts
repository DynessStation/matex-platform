import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  IAdminAccountDetailResponse,
  IAdminAccountModel,
  IAdminAccountSelectParams,
  IAdminAccountSelectResponse,
  ICreateAdminAccount,
  ICreateAdminAccountResponse,
  IDeleteAdminAccountResponse,
  IUpdateAdminAccount,
  IUpdateAdminAccountResponse,
  IUpdateAdminAccountStatus,
  IUpdateAdminAccountStatusResponse,
} from '../interface/admin-account.interface';

import { Params } from '../interface/core.interface';

import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';

@Injectable({
  providedIn: 'root',
})
export class AdminAccountService {
  private http = inject(HttpClient);

  //==================================================
  //==== GET ADMIN ACCOUNT
  //==================================================

  getAdminAccounts(payload?: Params): Observable<IAdminAccountModel> {
    let params = new HttpParams();

    if (payload) {
      const sortValue =
        payload['sort'] === 'desc' ||
        payload['sort'] === true ||
        payload['sort'] === 'true'
          ? 'true'
          : 'false';

      const mappedParams: Record<string, any> = {
        page: payload['page'],

        limit: payload['paginate'],

        search: payload['search'],

        ord: payload['field'],

        srt: payload['field'] ? sortValue : undefined,
      };

      Object.entries(mappedParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<IAdminAccountModel>(
      `${environment.API_URL}/api/v1/admin-acct`,
      {
        params,
      },
    );
  }

  //==================================================
  //==== SELECT COMPANY
  //==================================================

  getCompanySelect(
    payload?: IAdminAccountSelectParams,
  ): Observable<IAdminAccountSelectResponse> {
    const params = this.buildSelectParams(payload);

    return this.http.get<IAdminAccountSelectResponse>(
      `${environment.API_URL}/api/v1/admin-acct/select/company`,

      this.selectRequestOptions(params),
    );
  }

  //==================================================
  //==== SELECT OFFICE
  //==================================================

  getOfficeSelect(
    idMasterComp: string,
    payload?: IAdminAccountSelectParams,
  ): Observable<IAdminAccountSelectResponse> {
    let params = this.buildSelectParams(payload);

    params = params.set('id_master_comp', idMasterComp);

    return this.http.get<IAdminAccountSelectResponse>(
      `${environment.API_URL}/api/v1/admin-acct/select/office`,

      this.selectRequestOptions(params),
    );
  }

  //==================================================
  //==== SELECT CHAIR
  //==================================================

  getChairSelect(
    idMasterComp: string,
    payload?: IAdminAccountSelectParams,
  ): Observable<IAdminAccountSelectResponse> {
    let params = this.buildSelectParams(payload);

    params = params.set('id_master_comp', idMasterComp);

    return this.http.get<IAdminAccountSelectResponse>(
      `${environment.API_URL}/api/v1/admin-acct/select/chair`,
      this.selectRequestOptions(params),
    );
  }

  //==================================================
  //==== SELECT ACCESS
  //==================================================

  getAccessSelect(
    idMasterComp: string,
    payload?: IAdminAccountSelectParams,
  ): Observable<IAdminAccountSelectResponse> {
    let params = this.buildSelectParams(payload);

    params = params.set('id_master_comp', idMasterComp);

    return this.http.get<IAdminAccountSelectResponse>(
      `${environment.API_URL}/api/v1/admin-acct/select/access`,
      this.selectRequestOptions(params),
    );
  }

  //==================================================
  //==== SELECT PARAM HELPER
  //==================================================

  private buildSelectParams(payload?: IAdminAccountSelectParams): HttpParams {
    let params = new HttpParams();

    if (!payload) {
      return params;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  //==================================================
  //==== SELECT REQUEST OPTIONS
  //==================================================

  private selectRequestOptions(params: HttpParams) {
    return {
      params,

      context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
    };
  }

  //==================================================
  //==== CREATE ADMIN ACCOUNT
  //==================================================

  createAdminAccount(
    payload: ICreateAdminAccount,
  ): Observable<ICreateAdminAccountResponse> {
    return this.http.post<ICreateAdminAccountResponse>(
      `${environment.API_URL}/api/v1/admin-acct`,
      payload,
    );
  }

  //==================================================
  //==== GET ADMIN ACCOUNT DETAIL
  //==================================================

  getAdminAccountDetail(id: string): Observable<IAdminAccountDetailResponse> {
    return this.http.get<IAdminAccountDetailResponse>(
      `${environment.API_URL}/api/v1/admin-acct/${id}`,
    );
  }

  //==================================================
  //==== UPDATE ADMIN ACCOUNT
  //==================================================

  updateAdminAccount(
    id: string,
    payload: IUpdateAdminAccount,
  ): Observable<IUpdateAdminAccountResponse> {
    return this.http.put<IUpdateAdminAccountResponse>(
      `${environment.API_URL}/api/v1/admin-acct/${id}`,
      payload,
    );
  }

  //==================================================
  //==== UPDATE ADMIN ACCOUNT STATUS
  //==================================================

  updateAdminAccountStatus(
    id: string,

    payload: IUpdateAdminAccountStatus,
  ): Observable<IUpdateAdminAccountStatusResponse> {
    return this.http.patch<IUpdateAdminAccountStatusResponse>(
      `${environment.API_URL}/api/v1/admin-acct/${id}/status`,

      payload,
    );
  }

  //==================================================
  //==== DELETE ADMIN ACCOUNT
  //==================================================

  deleteAdminAccount(id: string): Observable<IDeleteAdminAccountResponse> {
    return this.http.delete<IDeleteAdminAccountResponse>(
      `${environment.API_URL}/api/v1/admin-acct/${id}`,
    );
  }
}
