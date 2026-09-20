import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  IChairDetailResponse,
  IChairModel,
  IChairMutationResponse,
  IChairPayload,
  IDeleteChairResponse,
  IUpdateChairStatus,
  IUpdateChairStatusResponse,
} from '../interface/chair.interface';

import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class ChairService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/chair`;

  //==================================================
  //==== GET LIST
  //==================================================

  getChairs(payload?: Params): Observable<IChairModel> {
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
      .get<IChairModel>(this.apiUrl, {
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

            id: item.id_chair,
          })),
        })),
      );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  getChairDetail(id: string): Observable<IChairDetailResponse> {
    return this.http.get<IChairDetailResponse>(`${this.apiUrl}/${id}`);
  }

  //==================================================
  //==== CREATE
  //==================================================

  createChair(payload: IChairPayload): Observable<IChairMutationResponse> {
    return this.http.post<IChairMutationResponse>(this.apiUrl, payload);
  }

  //==================================================
  //==== UPDATE
  //==================================================

  updateChair(
    id: string,

    payload: IChairPayload,
  ): Observable<IChairMutationResponse> {
    return this.http.put<IChairMutationResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  //==================================================
  //==== STATUS
  //==================================================

  updateChairStatus(
    id: string,

    payload: IUpdateChairStatus,
  ): Observable<IUpdateChairStatusResponse> {
    return this.http.patch<IUpdateChairStatusResponse>(
      `${this.apiUrl}/${id}/status`,
      payload,
    );
  }

  //==================================================
  //==== DELETE
  //==================================================

  deleteChair(id: string): Observable<IDeleteChairResponse> {
    return this.http.delete<IDeleteChairResponse>(`${this.apiUrl}/${id}`);
  }
}
