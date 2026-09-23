import { HttpClient } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import { IPublicNavigationResponse } from '../interface/public-navigation.interface';

@Injectable({
  providedIn: 'root',
})
export class PublicNavigationService {
  private http = inject(HttpClient);

  getNavigation(key: string, locale: string): Observable<IPublicNavigationResponse> {
    return this.http.get<IPublicNavigationResponse>(
      `${environment.cmsApiURL}/navigation/${encodeURIComponent(key)}/${encodeURIComponent(locale)}`,
    );
  }
}
