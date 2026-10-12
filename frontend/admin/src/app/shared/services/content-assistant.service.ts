import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { map } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ContentAssistantRequest {
  mode: 'translate' | 'generate';
  content_type: string;
  source_locale?: string;
  target_locale: string;
  context?: string;
  fields: Record<string, string>;
  field_types: Record<string, ContentAssistantFieldType>;
}

export type ContentAssistantFieldType =
  | 'plain_text'
  | 'multiline_text'
  | 'rich_text_html'
  | 'seo_description'
  | 'keyword_list'
  | 'short_value';

@Injectable({ providedIn: 'root' })
export class ContentAssistantService {
  private http = inject(HttpClient);

  assist(payload: ContentAssistantRequest) {
    return this.http
      .post<{ data: { fields: Record<string, string> } }>(
        `${environment.API_URL}/api/v1/content-assistant`,
        payload,
      )
      .pipe(map((response) => response.data.fields));
  }
}
