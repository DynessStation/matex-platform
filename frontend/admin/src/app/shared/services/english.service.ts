import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';
import { IApiResponse } from '../interface/api-response.interface';

// English that follows Indonesian (V1.2 Part 3, stage 4). API: /api/v1/content-english
// (backend/src/ctrl/admin/content-english.ts). The forms show Indonesian only until someone
// turns on "Tampilkan Inggris"; that choice is remembered in this browser.

export type EnglishContentType =
  'product' | 'product_category' | 'article' | 'faq' | 'website_page';

/** auto: translated from Indonesian. manual: edited by someone, never overwritten.
 * copy: the translation failed, the Indonesian text stands in. */
export type EnglishSource = 'auto' | 'manual' | 'copy';

export type EnglishFieldType =
  | 'plain_text'
  | 'multiline_text'
  | 'rich_text_html'
  | 'seo_description'
  | 'keyword_list';

const STORAGE_KEY = 'matex.showEnglish';

const readStored = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

@Injectable({ providedIn: 'root' })
export class EnglishService {
  private http = inject(HttpClient);
  private api = `${environment.API_URL}/api/v1/content-english`;

  /** Whether the English fields are shown beside Indonesian. */
  readonly visible = signal(readStored());

  setVisible(visible: boolean): void {
    this.visible.set(visible);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, visible ? '1' : '0');
    } catch {
      // A private window or blocked storage: the choice lasts until the page closes.
    }
  }

  translate(
    type: EnglishContentType,
    fields: Record<string, string>,
    fieldTypes: Record<string, EnglishFieldType>,
    context = '',
  ) {
    return this.http.post<IApiResponse<{ fields: Record<string, string> }>>(
      `${this.api}/translate`,
      { content_type: type, fields, field_types: fieldTypes, context },
      { context: new HttpContext().set(SKIP_GLOBAL_LOADER, true) },
    );
  }

  sources(type: EnglishContentType, ref: string) {
    return this.http.get<
      IApiResponse<{ sources: Record<string, EnglishSource> }>
    >(`${this.api}/${type}/${encodeURIComponent(ref)}`, {
      context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
    });
  }

  saveSources(
    type: EnglishContentType,
    ref: string,
    sources: Record<string, EnglishSource>,
  ) {
    return this.http.put<IApiResponse<{ fields: number }>>(
      `${this.api}/${type}/${encodeURIComponent(ref)}`,
      { sources },
      { context: new HttpContext().set(SKIP_GLOBAL_LOADER, true) },
    );
  }
}
