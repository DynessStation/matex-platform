import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IPublicCmsPage } from '../interface/cms-page.interface';
import { PUBLIC_CMS_REQUEST } from '../../core/interceptors/public-cms.context';

@Injectable({ providedIn: 'root' })
export class CmsPageService {
  // Anonymous CMS requests do not participate in template shop auth/toast interceptors.
  private http = inject(HttpClient);

  getPage(locale: string, slug: string) {
    return this.http.get<{ data: IPublicCmsPage }>(
      `${environment.cmsApiURL}/cms-page/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`,
      { context: new HttpContext().set(PUBLIC_CMS_REQUEST, true), transferCache: false },
    ).pipe(map(response => response.data));
  }
}
