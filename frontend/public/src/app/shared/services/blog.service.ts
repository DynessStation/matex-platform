import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IBlog, IBlogModel } from '../interface/blog.interface';
import { PublicApiResponse } from '../interface/public-content.interface';
import { Params } from '../interface/core.interface';
@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  public skeletonLoader = false;
  getBlogs(locale: string, payload?: Params): Observable<IBlogModel> {
    let params = new HttpParams();
    if (payload?.['page']) params = params.set('page', payload['page']);
    if (payload?.['paginate']) params = params.set('limit', payload['paginate']);
    if (payload?.['search']) params = params.set('search', payload['search']);
    return this.http
      .get<PublicApiResponse<IBlogModel>>(`${environment.cmsApiURL}/articles/${locale}`, { params })
      .pipe(map((r) => r.data ?? { data: [], total: 0 }));
  }
  getBlogBySlug(locale: string, slug: string): Observable<IBlog> {
    return this.http
      .get<PublicApiResponse<IBlog>>(
        `${environment.cmsApiURL}/articles/${locale}/${encodeURIComponent(slug)}`,
      )
      .pipe(map((r) => r.data!));
  }
}
