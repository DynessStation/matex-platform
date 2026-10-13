import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SKIP_PUBLIC_UI_INTERCEPTORS } from '../../core/interceptors/public-request-context';
import { IPublicWebsitePage } from '../interface/website-page.interface';

@Injectable({ providedIn: 'root' })
export class WebsitePageService {
  private readonly http = inject(HttpClient);

  getPage(locale: string, path: string) {
    return this.http
      .get<{ data: IPublicWebsitePage }>(
        `${environment.publicApiURL}/website-page/${encodeURIComponent(locale)}/${encodeURIComponent(path)}`,
        {
          context: new HttpContext().set(SKIP_PUBLIC_UI_INTERCEPTORS, true),
          // Public CMS data is safe to transfer once from SSR to hydration. This
          // avoids a second browser request that can clear the SSR metadata while
          // the public DNS or API route is unavailable during release checks.
          transferCache: true,
        },
      )
      .pipe(map((response) => response.data));
  }
}
