import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import {
  IFaqDetailResponse,
  IFaqModel,
  IFaqMutationResponse,
  IFaqPayload,
} from '../interface/faq.interface';
import {
  IOrderListResponse,
  IOrderSaveResponse,
} from '../interface/order-list.interface';

@Injectable({
  providedIn: 'root',
})
export class FaqService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/faq`;

  getFaqs(payload?: Params): Observable<IFaqModel> {
    const params = listParams(payload);

    return this.http.get<IFaqModel>(this.apiUrl, { params });
  }

  /** Every FAQ in its order, for "Atur urutan". */
  getOrder(): Observable<IOrderListResponse> {
    return this.http.get<IOrderListResponse>(`${this.apiUrl}/order`);
  }

  /** Saves the whole order (`ids`: every FAQ, first = position 1). */
  saveOrder(ids: string[]): Observable<IOrderSaveResponse> {
    return this.http.put<IOrderSaveResponse>(`${this.apiUrl}/order`, { ids });
  }

  getFaq(id: string): Observable<IFaqDetailResponse> {
    return this.http.get<IFaqDetailResponse>(`${this.apiUrl}/${id}`);
  }

  createFaq(payload: IFaqPayload): Observable<IFaqMutationResponse> {
    return this.http.post<IFaqMutationResponse>(this.apiUrl, payload);
  }

  updateFaq(
    id: string,
    payload: IFaqPayload,
  ): Observable<IFaqMutationResponse> {
    return this.http.put<IFaqMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  updateFaqStatus(id: string, status: 0 | 1): Observable<IFaqMutationResponse> {
    return this.http.patch<IFaqMutationResponse>(
      `${this.apiUrl}/${id}/status`,
      { status },
    );
  }

  deleteFaq(id: string): Observable<IFaqMutationResponse> {
    return this.http.delete<IFaqMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
