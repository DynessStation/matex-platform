import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';

export type SlugEntity = 'article' | 'product' | 'product_category';

export interface ISlugCheck {
  slug: string;
  available: boolean;
}

@Injectable({ providedIn: 'root' })
export class SlugCheckService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/v1/slug-check`;

  check(
    entity: SlugEntity,
    locale: string,
    slug: string,
    id?: string | null,
  ): Observable<{ data: ISlugCheck }> {
    return this.http.get<{ data: ISlugCheck }>(this.apiUrl, {
      params: { entity, locale, slug, ...(id ? { id } : {}) },
      // Runs while the title is typed: must never cover the form with the page loader.
      context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
    });
  }
}
