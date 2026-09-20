import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  ICmsPageDetailResponse,
  ICmsPageModel,
  ICmsPageMutationResponse,
  ICmsPagePayload,
  ICmsPagePublicationPayload,
  ICmsPagePublicationResponse,
  ICmsPageRestoreResponse,
  ICmsPageTrashModel,
} from '../interface/cms-page.interface';

import { Params } from '../interface/core.interface';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class CmsPageService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/cms-page`;

  //==================================================
  //==== PARAMS
  //==================================================

  private buildParams(payload?: Params): HttpParams {
    let params = new HttpParams();

    if (!payload) {
      return params;
    }

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

    if (payload['status'] !== undefined) {
      params = params.set('status', String(payload['status']));
    }

    if (payload['visibility'] !== undefined) {
      params = params.set('visibility', String(payload['visibility']));
    }

    if (payload['type']) {
      params = params.set('type', String(payload['type']));
    }

    if (payload['locale']) {
      params = params.set('locale', String(payload['locale']));
    }

    return params;
  }

  //==================================================
  //==== LIST
  //==================================================

  getCmsPages(payload?: Params): Observable<ICmsPageModel> {
    return this.http
      .get<ICmsPageModel>(this.apiUrl, {
        params: this.buildParams(payload),
      })
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item) => ({
            ...item,

            id: item.id_cms_page,
          })),
        })),
      );
  }

  //==================================================
  //==== TRASH
  //==================================================

  getTrash(payload?: Params): Observable<ICmsPageTrashModel> {
    return this.http
      .get<ICmsPageTrashModel>(`${this.apiUrl}/trash`, {
        params: this.buildParams(payload),
      })
      .pipe(
        map((response) => ({
          ...response,

          data: response.data.map((item) => ({
            ...item,

            id: item.id_cms_page,
          })),
        })),
      );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  getCmsPageDetail(id: string): Observable<ICmsPageDetailResponse> {
    return this.http.get<ICmsPageDetailResponse>(`${this.apiUrl}/${id}`);
  }

  //==================================================
  //==== CREATE
  //==================================================

  createCmsPage(
    payload: ICmsPagePayload,
  ): Observable<ICmsPageMutationResponse> {
    return this.http.post<ICmsPageMutationResponse>(this.apiUrl, payload);
  }

  //==================================================
  //==== UPDATE
  //==================================================

  updateCmsPage(
    id: string,
    payload: ICmsPagePayload,
  ): Observable<ICmsPageMutationResponse> {
    return this.http.put<ICmsPageMutationResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  //==================================================
  //==== PUBLICATION
  //==================================================

  updatePublication(
    id: string,
    payload: ICmsPagePublicationPayload,
  ): Observable<ICmsPagePublicationResponse> {
    return this.http.post<ICmsPagePublicationResponse>(
      `${this.apiUrl}/${id}/publication`,
      payload,
    );
  }

  //==================================================
  //==== DELETE
  //==================================================

  deleteCmsPage(id: string): Observable<ICmsPageMutationResponse> {
    return this.http.delete<ICmsPageMutationResponse>(`${this.apiUrl}/${id}`);
  }

  //==================================================
  //==== RESTORE
  //==================================================

  restoreCmsPage(id: string): Observable<ICmsPageRestoreResponse> {
    return this.http.post<ICmsPageRestoreResponse>(
      `${this.apiUrl}/${id}/restore`,
      {},
    );
  }
}
