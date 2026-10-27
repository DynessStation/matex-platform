import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
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
    const params = listParams(payload);

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
