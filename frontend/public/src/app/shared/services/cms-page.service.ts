import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IPublicCmsPage } from '../interface/cms-page.interface';

@Injectable({ providedIn: 'root' })
export class CmsPageService {
  // Public content may fall back to template data silently, so it must not use
  // the demo shop auth, loader, or toast interceptors.
  private http = new HttpClient(inject(HttpBackend));

  getPage(locale: string, slug: string) {
    return this.http
      .get<{ data: IPublicCmsPage }>(
        `${environment.cmsApiURL}/cms-page/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`,
        { transferCache: false },
      )
      .pipe(map((response) => response.data));
  }
}
