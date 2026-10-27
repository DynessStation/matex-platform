import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ICategoryDetail,
  ICategoryModel,
  ICategoryOrderItem,
  ICategoryPayload,
} from '../interface/category.interface';
import { Params } from '../interface/core.interface';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/product-categories`;

  getCategories(payload?: Params): Observable<ICategoryModel> {
    const params = listParams(payload);

    return this.http.get<ICategoryModel>(this.api, { params });
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
  reorder(items: ICategoryOrderItem[]) {
    return this.http.patch<IApiResponse<null>>(`${this.api}/reorder`, {
      items,
    });
  }
  delete(id: string) {
    return this.http.delete<IApiResponse<null>>(`${this.api}/${id}`);
  }
}
