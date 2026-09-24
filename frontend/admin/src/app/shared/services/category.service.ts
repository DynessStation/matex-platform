import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ICategoryDetail,
  ICategoryModel,
  ICategoryPayload,
} from '../interface/category.interface';
import { Params } from '../interface/core.interface';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/product-categories`;

  getCategories(payload?: Params): Observable<ICategoryModel> {
    let params = new HttpParams();
    if (payload?.['search']) params = params.set('search', payload['search']);
    if (payload?.['locale']) params = params.set('locale', payload['locale']);
    return this.http
      .get<IApiResponse<ICategoryModel>>(this.api, { params })
      .pipe(map((response) => response.data ?? { data: [], total: 0 }));
  }
  getCategory(id: string) {
    return this.http.get<IApiResponse<ICategoryDetail>>(`${this.api}/${id}`);
  }
  create(payload: ICategoryPayload) {
    return this.http.post<IApiResponse<{ id: string }>>(this.api, payload);
  }
  update(id: string, payload: ICategoryPayload) {
    return this.http.put<IApiResponse<{ id: string }>>(
      `${this.api}/${id}`,
      payload,
    );
  }
  delete(id: string) {
    return this.http.delete<IApiResponse<null>>(`${this.api}/${id}`);
  }
}
