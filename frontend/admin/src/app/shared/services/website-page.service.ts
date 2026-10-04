import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  IWebsitePageDetail,
  IWebsitePageDetailResponse,
  IWebsitePageMutationResponse,
  IWebsitePageSaveRequest,
  WebsitePageKey,
} from '../interface/website-page.interface';

@Injectable({
  providedIn: 'root',
})
export class WebsitePageService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.API_URL}/api/v1/website-page`;

  getPage(key: WebsitePageKey): Observable<IWebsitePageDetail> {
    return this.http
      .get<IWebsitePageDetailResponse>(`${this.apiUrl}/${key}`)
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Fixed website page response has no data');
          }

          return response.data;
        }),
      );
  }

  savePage(
    key: WebsitePageKey,
    payload: IWebsitePageSaveRequest,
  ): Observable<IWebsitePageMutationResponse> {
    return this.http.put<IWebsitePageMutationResponse>(
      `${this.apiUrl}/${key}`,
      payload,
    );
  }
}
