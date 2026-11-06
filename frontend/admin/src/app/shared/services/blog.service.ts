import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { listParams } from './list-params';
import { environment } from '../../../environments/environment';
import { IApiResponse } from '../interface/api-response.interface';
import {
  ArticleStatus,
  IArticleDetail,
  IArticleInsightAudit,
  IArticleInsightChart,
  IArticleInsightTop,
  IArticleTag,
  IArticlePayload,
  IBlogModel,
} from '../interface/blog.interface';
import { Params } from '../interface/core.interface';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/articles`;
  private tagApi = `${environment.API_URL}/api/v1/article-tags`;
  getBlogs(payload?: Params): Observable<IBlogModel> {
    const params = listParams(payload);

    return this.http.get<IBlogModel>(this.api, { params });
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

  getTags() {
    return this.http.get<IApiResponse<IArticleTag[]>>(this.tagApi);
  }
  updateTag(id: string, names: { name_id: string; name_en: string }) {
    return this.http.put<IApiResponse<unknown>>(`${this.tagApi}/${id}`, names);
  }
  deleteTag(id: string) {
    return this.http.delete<IApiResponse<unknown>>(`${this.tagApi}/${id}`);
  }

  insightTop(days: number) {
    return this.http.get<IApiResponse<IArticleInsightTop[]>>(
      `${this.api}/insight/top`,
      { params: { days } },
    );
  }
  insightChart(days: number) {
    return this.http.get<IApiResponse<IArticleInsightChart>>(
      `${this.api}/insight/chart`,
      { params: { days } },
    );
  }
  insightAudit() {
    return this.http.get<IApiResponse<IArticleInsightAudit>>(
      `${this.api}/insight/audit`,
    );
  }
}
