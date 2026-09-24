import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { IApiResponse } from '../interface/api-response.interface';
import { Params } from '../interface/core.interface';
import { IProduct, IProductModel, IProductPayload } from '../interface/product.interface';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/products`;
  getProducts(payload?: Params) {
    let params = new HttpParams();
    if (payload?.['search']) params = params.set('search', payload['search']);
    if (payload?.['locale']) params = params.set('locale', payload['locale']);
    return this.http.get<IApiResponse<IProductModel>>(this.api, { params }).pipe(map(r => r.data ?? { data: [], total: 0 }));
  }
  getProduct(id: string) { return this.http.get<IApiResponse<IProduct>>(`${this.api}/${id}`); }
  create(payload: IProductPayload) { return this.http.post<IApiResponse<{ id: string }>>(this.api, payload); }
  update(id: string, payload: IProductPayload) { return this.http.put<IApiResponse<{ id: string }>>(`${this.api}/${id}`, payload); }
  updateStatus(id: string, status: string) { return this.http.patch<IApiResponse<null>>(`${this.api}/${id}/status`, { status }); }
  delete(id: string) { return this.http.delete<IApiResponse<null>>(`${this.api}/${id}`); }
}
