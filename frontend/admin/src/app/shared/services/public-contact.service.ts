import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import {
  IContactInsightAudit,
  IContactInsightChannel,
  IContactInsightSocial,
  IPublicContactResponse,
  IPublicContactSettings,
} from '../interface/public-contact.interface';

@Injectable({ providedIn: 'root' })
export class PublicContactService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/public-contact`;
  getSettings(): Observable<IPublicContactResponse> {
    return this.http.get<IPublicContactResponse>(this.apiUrl);
  }
  updateSettings(
    payload: Partial<IPublicContactSettings>,
  ): Observable<IPublicContactResponse> {
    return this.http.put<IPublicContactResponse>(this.apiUrl, payload);
  }
  insightSocials(days: number) {
    return this.http.get<IApiResponse<IContactInsightSocial[]>>(
      `${this.apiUrl}/insight/socials`,
      { params: { days } },
    );
  }
  insightChannels(days: number) {
    return this.http.get<IApiResponse<IContactInsightChannel[]>>(
      `${this.apiUrl}/insight/channels`,
      { params: { days } },
    );
  }
  insightAudit() {
    return this.http.get<IApiResponse<IContactInsightAudit>>(
      `${this.apiUrl}/insight/audit`,
    );
  }
}
