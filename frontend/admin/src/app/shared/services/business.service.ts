import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';
import { IApiResponse } from '../interface/api-response.interface';
import {
  IBusinessChannel,
  IBusinessEntity,
  IBusinessEntityOption,
  IBusinessEntityPayload,
  IRevenueShareRule,
  IRevenueShareRulePayload,
  IStore,
  IStorePayload,
} from '../interface/business.interface';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/business`;

  entities() {
    return this.http.get<IApiResponse<IBusinessEntity[]>>(
      `${this.api}/entities`,
    );
  }
  /** Names for selects in other forms (product seller and producer, partner accounts). */
  entityOptions() {
    return this.http.get<IApiResponse<IBusinessEntityOption[]>>(
      `${this.api}/entities/options`,
      { context: new HttpContext().set(SKIP_GLOBAL_LOADER, true) },
    );
  }
  saveEntity(id: string | null, payload: IBusinessEntityPayload) {
    return id
      ? this.http.put<IApiResponse<{ id: string }>>(
          `${this.api}/entities/${id}`,
          payload,
        )
      : this.http.post<IApiResponse<{ id: string }>>(
          `${this.api}/entities`,
          payload,
        );
  }
  setEntityStatus(id: string, status: boolean) {
    return this.http.patch<IApiResponse<unknown>>(
      `${this.api}/entities/${id}/status`,
      { status },
    );
  }
  deleteEntity(id: string) {
    return this.http.delete<IApiResponse<unknown>>(
      `${this.api}/entities/${id}`,
    );
  }

  channels() {
    return this.http.get<IApiResponse<IBusinessChannel[]>>(
      `${this.api}/channels`,
    );
  }
  stores() {
    return this.http.get<IApiResponse<IStore[]>>(`${this.api}/stores`);
  }
  saveStore(entityId: string, id: string | null, payload: IStorePayload) {
    return id
      ? this.http.put<IApiResponse<{ id: string }>>(
          `${this.api}/stores/${id}`,
          payload,
        )
      : this.http.post<IApiResponse<{ id: string }>>(
          `${this.api}/entities/${entityId}/stores`,
          payload,
        );
  }
  deleteStore(id: string) {
    return this.http.delete<IApiResponse<unknown>>(`${this.api}/stores/${id}`);
  }

  rules() {
    return this.http.get<IApiResponse<IRevenueShareRule[]>>(
      `${this.api}/rules`,
    );
  }
  saveRule(
    entityId: string,
    id: string | null,
    payload: IRevenueShareRulePayload,
  ) {
    return id
      ? this.http.put<IApiResponse<{ id: string }>>(
          `${this.api}/rules/${id}`,
          payload,
        )
      : this.http.post<IApiResponse<{ id: string }>>(
          `${this.api}/entities/${entityId}/rules`,
          payload,
        );
  }
  deleteRule(id: string) {
    return this.http.delete<IApiResponse<unknown>>(`${this.api}/rules/${id}`);
  }
}
