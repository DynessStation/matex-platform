import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IBlog, IBlogModel } from '../interface/blog.interface';
import { Params } from '../interface/core.interface';

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private http = inject(HttpClient);

  public skeletonLoader: boolean = false;

  getBlogs(payload?: Params): Observable<IBlogModel> {
    return this.http.get<IBlogModel>(`${environment.URL}/blog.json`, { params: payload });
  }

  getBlogBySlug(slug: string): Observable<IBlog> {
    return this.http.get<IBlog>(`${environment.URL}/blog/slug/${slug}`);
  }
}
