import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category, CategoryModel } from '../interface/category.interface';
import { Params } from '../interface/core.interface';
import {
  PublicApiResponse,
  PublicListResponse,
  toListModel,
} from '../interface/public-content.interface';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private router = inject(Router);
  public searchSkeleton = false;

  getCategories(_payload?: Params): Observable<CategoryModel> {
    return this.http
      .get<PublicListResponse<Category>>(
        `${environment.publicApiURL}/product-categories/${this.locale()}`,
      )
      .pipe(map((response): CategoryModel => toListModel(response)));
  }
  getCategoryBySlug(slug: string, locale: 'id-ID' | 'en-US' = this.locale()): Observable<Category> {
    return this.http
      .get<PublicApiResponse<Category>>(
        `${environment.publicApiURL}/product-categories/${locale}/${encodeURIComponent(slug)}`,
      )
      .pipe(map((response) => response.data!));
  }
  private locale() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/') ? 'en-US' : 'id-ID';
  }
}
