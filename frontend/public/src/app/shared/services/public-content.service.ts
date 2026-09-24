import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicApiResponse, PublicContactData, PublicContactInquiry, PublicFaqData } from '../interface/public-content.interface';

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private http = inject(HttpClient);
  private contactCache = new Map<string, Observable<PublicApiResponse<PublicContactData>>>();
  getFaq(locale: string): Observable<PublicApiResponse<PublicFaqData>> {
    return this.http.get<PublicApiResponse<PublicFaqData>>(`${environment.cmsApiURL}/faq/${encodeURIComponent(locale)}`);
  }
  getContact(locale: string): Observable<PublicApiResponse<PublicContactData>> {
    const cached = this.contactCache.get(locale);
    if (cached) return cached;
    const request = this.http
      .get<PublicApiResponse<PublicContactData>>(`${environment.cmsApiURL}/contact/${encodeURIComponent(locale)}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.contactCache.set(locale, request);
    return request;
  }
  sendInquiry(payload: PublicContactInquiry): Observable<PublicApiResponse<{ reference: string }>> {
    return this.http.post<PublicApiResponse<{ reference: string }>>(`${environment.cmsApiURL}/contact-inquiry`, payload);
  }
}
