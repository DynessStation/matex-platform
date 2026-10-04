import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IPublicWebsitePage } from '../interface/website-page.interface';

@Injectable({ providedIn: 'root' })
export class WebsitePageService {
  // Content publik harus dapat memakai fallback template tanpa memicu auth,
  // loader, atau notifikasi milik alur toko demo.
  private readonly http = new HttpClient(inject(HttpBackend));

  getPage(locale: string, path: string) {
    return this.http
      .get<{ data: IPublicWebsitePage }>(
        `${environment.cmsApiURL}/website-page/${encodeURIComponent(locale)}/${encodeURIComponent(path)}`,
        { transferCache: false },
      )
      .pipe(map((response) => response.data));
  }
}
