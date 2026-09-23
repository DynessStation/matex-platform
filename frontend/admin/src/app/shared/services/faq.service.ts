import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IFaqDetailResponse, IFaqModel, IFaqMutationResponse, IFaqPayload } from '../interface/faq.interface';
import { IApiResponse } from '../interface/api-response.interface';

@Injectable({
  providedIn: 'root',
})
export class FaqService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/faq`;

  getFaqs(payload?: Params): Observable<IFaqModel> {
    let params = new HttpParams();
    if (payload?.['page'] !== undefined) params = params.set('page', String(payload['page'] || 1));
    if (payload?.['paginate'] !== undefined) params = params.set('limit', String(payload['paginate']));
    if (payload?.['limit'] !== undefined) params = params.set('limit', String(payload['limit']));
    if (payload?.['search']) params = params.set('search', String(payload['search']));
    return this.http.get<IApiResponse<IFaqModel>>(this.apiUrl, { params }).pipe(
      map(response => response.data ?? { data: [], pagination: { current_page: 1, per_page: 15, total: 0 } }),
    );
  }

  getFaq(id: string): Observable<IFaqDetailResponse> {
    return this.http.get<IFaqDetailResponse>(`${this.apiUrl}/${id}`);
  }

  createFaq(payload: IFaqPayload): Observable<IFaqMutationResponse> {
    return this.http.post<IFaqMutationResponse>(this.apiUrl, payload);
  }

  updateFaq(id: string, payload: IFaqPayload): Observable<IFaqMutationResponse> {
    return this.http.put<IFaqMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  updateFaqStatus(id: string, status: 0 | 1): Observable<IFaqMutationResponse> {
    return this.http.patch<IFaqMutationResponse>(`${this.apiUrl}/${id}/status`, { status });
  }

  deleteFaq(id: string): Observable<IFaqMutationResponse> {
    return this.http.delete<IFaqMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
