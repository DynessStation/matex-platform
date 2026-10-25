import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

import { BlogAssistField, BlogFormLocale } from './form-blog.model';
import { IArticleTranslation } from '../../../shared/interface/blog.interface';
import { ContentAssistantFieldType } from '../../../shared/services/content-assistant.service';

// Stateless helpers of the article form.

/** A stored datetime as the value of a datetime-local field. */
export function localDate(value?: string | null): string {
  return value ? String(value).slice(0, 16).replace(' ', 'T') : '';
}

export function dateToStruct(date: Date): NgbDateStruct {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/** Date and time pickers as "YYYY-MM-DDTHH:mm", or '' when either is empty. */
export function composeDateTime(
  date: NgbDateStruct | null,
  time: NgbTimeStruct | null,
): string {
  if (!date || !time) return '';
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

export function dateLabel(value: NgbDateStruct | null): string {
  if (!value) return 'Pilih tanggal';
  return `${String(value.day).padStart(2, '0')}/${String(value.month).padStart(2, '0')}/${value.year}`;
}

/** One language of the form values as the stored translation. */
export function articleTranslation(
  locale: 'id-ID' | 'en-US',
  prefix: BlogFormLocale,
  v: any,
): IArticleTranslation {
  return {
    locale,
    slug: v[`${prefix}_slug`],
    title: v[`${prefix}_title`],
    excerpt: v[`${prefix}_excerpt`] ?? '',
    body: v[`${prefix}_body`],
    meta_title: v[`${prefix}_meta_title`] ?? '',
    meta_description: v[`${prefix}_meta_description`] ?? '',
    canonical_url: v[`${prefix}_canonical_url`] ?? '',
    og_title: v[`${prefix}_og_title`] ?? '',
    og_description: v[`${prefix}_og_description`] ?? '',
    schema_json: '',
    status: 1,
  };
}

/** How the content assistant should treat an article field. */
export function assistFieldType(
  field: BlogAssistField,
): ContentAssistantFieldType {
  return field === 'body'
    ? 'rich_text_html'
    : field === 'excerpt'
      ? 'multiline_text'
      : 'seo_description';
}
