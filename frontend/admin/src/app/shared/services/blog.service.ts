import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ArticleStatus,
  IArticleDetail,
  IArticlePayload,
  IBlogModel,
} from '../interface/blog.interface';
import { Params } from '../interface/core.interface';
@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/articles`;
  getBlogs(payload?: Params): Observable<IBlogModel> {
    let params = new HttpParams();
    if (payload?.['page']) params = params.set('page', payload['page']);
    if (payload?.['paginate'])
      params = params.set('limit', payload['paginate']);
    if (payload?.['search']) params = params.set('search', payload['search']);
    return this.http
      .get<IApiResponse<IBlogModel>>(this.api, { params })
      .pipe(map((r) => r.data ?? { data: [], total: 0 }));
  }
  getBlog(id: string) {
    return this.http.get<IApiResponse<IArticleDetail>>(`${this.api}/${id}`);
  }
  create(payload: IArticlePayload) {
    return this.http.post<IApiResponse<{ id: string }>>(this.api, payload);
  }
  update(id: string, payload: IArticlePayload) {
    return this.http.put<IApiResponse<{ id: string }>>(
      `${this.api}/${id}`,
      payload,
    );
  }
  updateStatus(id: string, status: ArticleStatus) {
    return this.http.patch<IApiResponse<null>>(`${this.api}/${id}/status`, {
      status,
    });
  }
  delete(id: string) {
    return this.http.delete<IApiResponse<null>>(`${this.api}/${id}`);
  }
}
