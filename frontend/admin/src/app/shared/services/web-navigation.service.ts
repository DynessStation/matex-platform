import { HttpClient } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  IWebNavigationDetailResponse,
  IWebNavigationItemPayload,
  IWebNavigationListResponse,
  IWebNavigationMutationResponse,
  IWebNavigationPayload,
  IWebNavigationReorderPayload,
  IWebNavigationStatusPayload,
  IWebNavigationUpdatePayload,
} from '../interface/web-navigation.interface';

@Injectable({
  providedIn: 'root',
})
export class WebNavigationService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/web-navigation`;

  getNavigations(): Observable<IWebNavigationListResponse> {
    return this.http.get<IWebNavigationListResponse>(this.apiUrl);
  }

  getNavigationDetail(id: string): Observable<IWebNavigationDetailResponse> {
    return this.http.get<IWebNavigationDetailResponse>(`${this.apiUrl}/${id}`);
  }

  createNavigation(
    payload: IWebNavigationPayload,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.post<IWebNavigationMutationResponse>(this.apiUrl, payload);
  }

  updateNavigation(
    id: string,
    payload: IWebNavigationUpdatePayload,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.put<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  updateNavigationStatus(
    id: string,
    payload: IWebNavigationStatusPayload,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.patch<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${id}/status`,
      payload,
    );
  }

  deleteNavigation(id: string): Observable<IWebNavigationMutationResponse> {
    return this.http.delete<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${id}`,
    );
  }

  createItem(
    navigationId: string,
    payload: IWebNavigationItemPayload,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.post<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${navigationId}/items`,
      payload,
    );
  }

  updateItem(
    navigationId: string,
    itemId: string,
    payload: IWebNavigationItemPayload,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.put<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${navigationId}/items/${itemId}`,
      payload,
    );
  }

  deleteItem(
    navigationId: string,
    itemId: string,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.delete<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${navigationId}/items/${itemId}`,
    );
  }

  reorderItems(
    navigationId: string,
    payload: IWebNavigationReorderPayload,
  ): Observable<IWebNavigationMutationResponse> {
    return this.http.put<IWebNavigationMutationResponse>(
      `${this.apiUrl}/${navigationId}/reorder-items`,
      payload,
    );
  }
}
