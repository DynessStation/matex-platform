import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ISalesFilter,
  ISalesImport,
  ISalesImportReport,
  ISalesListMeta,
  ISalesOrder,
  ISalesProductOption,
  ISalesSettlement,
  ISalesStore,
  ISkuMap,
} from '../interface/sales.interface';

type ListResponse<T> = IApiResponse<T[]> & { meta: ISalesListMeta };

const paramsOf = (filter: ISalesFilter): HttpParams => {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
};

@Injectable({ providedIn: 'root' })
export class SalesService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/sales`;

  stores() {
    return this.http.get<IApiResponse<ISalesStore[]>>(`${this.api}/stores`);
  }
  /** Read the file and report; apply saves it. */
  importFile(store: string, file: File, apply: boolean) {
    const body = new FormData();
    body.append('store', store);
    body.append('file', file);
    if (apply) body.append('apply', '1');
    return this.http.post<IApiResponse<ISalesImportReport>>(
      `${this.api}/imports`,
      body,
    );
  }
  imports(store?: string) {
    return this.http.get<IApiResponse<ISalesImport[]>>(`${this.api}/imports`, {
      params: paramsOf({ store }),
    });
  }
  orders(filter: ISalesFilter) {
    return this.http.get<ListResponse<ISalesOrder>>(`${this.api}/orders`, {
      params: paramsOf(filter),
    });
  }
  settlements(filter: ISalesFilter) {
    return this.http.get<ListResponse<ISalesSettlement>>(
      `${this.api}/settlements`,
      { params: paramsOf(filter) },
    );
  }
  skuMap(store?: string) {
    return this.http.get<IApiResponse<ISkuMap[]>>(`${this.api}/sku-map`, {
      params: paramsOf({ store }),
    });
  }
  products() {
    return this.http.get<IApiResponse<ISalesProductOption[]>>(
      `${this.api}/products`,
    );
  }
  mapSku(id: string, productId: string | null) {
    return this.http.put<IApiResponse<{ id: string }>>(
      `${this.api}/sku-map/${id}`,
      { product_id: productId },
    );
  }
}
