import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import { Params } from '../interface/core.interface';
import {
  IOrderListResponse,
  IOrderSaveResponse,
} from '../interface/order-list.interface';
import {
  IProduct,
  IProductModel,
  IProductPayload,
} from '../interface/product.interface';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/products`;
  getProducts(payload?: Params) {
    const params = listParams(payload);

    return this.http.get<IProductModel>(this.api, { params });
  }
  /** Products at the front of the catalog, in their order (at most `max`). */
  getFront() {
    return this.http.get<IOrderListResponse>(`${this.api}/front`);
  }
  /** Saves the whole front (`ids`, first = position 1); left-out products leave it. */
  saveFront(ids: string[]) {
    return this.http.put<IOrderSaveResponse>(`${this.api}/front`, { ids });
  }
  getProduct(id: string) {
    return this.http.get<IApiResponse<IProduct>>(`${this.api}/${id}`);
  }
  create(payload: IProductPayload) {
    return this.http.post<IApiResponse<{ id: string }>>(this.api, payload);
  }
  update(id: string, payload: IProductPayload) {
    return this.http.put<IApiResponse<{ id: string }>>(
      `${this.api}/${id}`,
      payload,
    );
  }
  updateStatus(id: string, status: string) {
    return this.http.patch<IApiResponse<null>>(`${this.api}/${id}/status`, {
      status,
    });
  }
  delete(id: string) {
    return this.http.delete<IApiResponse<null>>(`${this.api}/${id}`);
  }
}
