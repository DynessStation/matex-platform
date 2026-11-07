import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ICalculateRequest,
  ICalculateResult,
  ICostImpact,
  ICostItem,
  ICostItemPayload,
  ICostLinePayload,
  ICostMaterial,
  ICostSetting,
  IImportReport,
  ISalesChannel,
} from '../interface/costing.interface';

@Injectable({ providedIn: 'root' })
export class CostingService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/costing`;

  items() {
    return this.http.get<IApiResponse<ICostItem[]>>(`${this.api}/items`);
  }
  item(id: string) {
    return this.http.get<IApiResponse<ICostItem>>(`${this.api}/items/${id}`);
  }
  itemOfProduct(productId: string) {
    return this.http.get<IApiResponse<ICostItem | null>>(
      `${this.api}/items/by-product/${productId}`,
      { context: new HttpContext().set(SKIP_GLOBAL_LOADER, true) },
    );
  }
  saveItem(id: string | null, payload: ICostItemPayload) {
    return id
      ? this.http.put<IApiResponse<{ id?: string }>>(
          `${this.api}/items/${id}`,
          payload,
        )
      : this.http.post<IApiResponse<{ id?: string }>>(
          `${this.api}/items`,
          payload,
        );
  }
  /** Starts the HPP of a product; asking twice changes nothing. */
  startProductItem(productId: string) {
    return this.http.post<IApiResponse<ICostItem>>(
      `${this.api}/products/${productId}/item`,
      {},
    );
  }
  savePricing(id: string, pricing: Record<string, unknown>) {
    return this.http.put<IApiResponse<unknown>>(
      `${this.api}/items/${id}/pricing`,
      pricing,
    );
  }
  /** Draft products for items that have none. */
  createProducts(itemIds: string[], categoryId: string) {
    return this.http.post<IApiResponse<{ created: number }>>(
      `${this.api}/create-products`,
      { item_ids: itemIds, category_id: categoryId },
    );
  }
  saveRecipe(id: string, lines: ICostLinePayload[]) {
    return this.http.put<IApiResponse<{ version: number }>>(
      `${this.api}/items/${id}/recipe`,
      { lines },
    );
  }
  setting() {
    return this.http.get<IApiResponse<ICostSetting>>(`${this.api}/setting`);
  }
  saveSetting(setting: ICostSetting) {
    return this.http.put<IApiResponse<unknown>>(`${this.api}/setting`, setting);
  }
  applyPrices(itemIds: string[]) {
    return this.http.post<IApiResponse<{ applied: number }>>(
      `${this.api}/apply-prices`,
      { item_ids: itemIds },
    );
  }
  calculate(request: ICalculateRequest) {
    return this.http.post<IApiResponse<ICalculateResult>>(
      `${this.api}/calculate`,
      request,
      { context: new HttpContext().set(SKIP_GLOBAL_LOADER, true) },
    );
  }

  materials() {
    return this.http.get<IApiResponse<ICostMaterial[]>>(
      `${this.api}/materials`,
    );
  }
  createMaterial(payload: Record<string, unknown>) {
    return this.http.post<IApiResponse<{ id: string }>>(
      `${this.api}/materials`,
      payload,
    );
  }
  updateMaterial(id: string, payload: Record<string, unknown>) {
    return this.http.put<IApiResponse<unknown>>(
      `${this.api}/materials/${id}`,
      payload,
    );
  }
  deleteMaterial(id: string) {
    return this.http.delete<IApiResponse<unknown>>(
      `${this.api}/materials/${id}`,
    );
  }
  addMaterialPrice(id: string, amount: number, from: string) {
    return this.http.post<IApiResponse<unknown>>(
      `${this.api}/materials/${id}/prices`,
      { amount, from },
    );
  }
  materialImpact(id: string, price: number) {
    return this.http.get<IApiResponse<ICostImpact[]>>(
      `${this.api}/materials/${id}/impact`,
      {
        params: { price },
        context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
      },
    );
  }

  channels() {
    return this.http.get<IApiResponse<ISalesChannel[]>>(`${this.api}/channels`);
  }
  saveFee(
    channelId: string,
    feeId: string | null,
    payload: Record<string, unknown>,
  ) {
    return feeId
      ? this.http.put<IApiResponse<{ id?: string }>>(
          `${this.api}/fees/${feeId}`,
          payload,
        )
      : this.http.post<IApiResponse<{ id?: string }>>(
          `${this.api}/channels/${channelId}/fees`,
          payload,
        );
  }
  deleteFee(feeId: string) {
    return this.http.delete<IApiResponse<unknown>>(`${this.api}/fees/${feeId}`);
  }

  importWorkbook(file: File, apply: boolean) {
    const body = new FormData();
    body.append('file', file);
    if (apply) body.append('apply', '1');
    return this.http.post<IApiResponse<IImportReport>>(
      `${this.api}/import`,
      body,
    );
  }
}
