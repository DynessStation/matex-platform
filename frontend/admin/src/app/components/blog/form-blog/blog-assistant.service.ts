import { Injectable, inject } from '@angular/core';

import { finalize } from 'rxjs';

import { BlogFormService } from './blog-form.service';
import { BlogAssistField, BlogFormLocale } from './form-blog.model';
import { assistFieldType } from './form-blog.util';
import { IApiErrorResponse } from '../../../shared/interface/api-response.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Writing help of the article form (Content and SEO tabs): drafts one field, or translates
// the Indonesian field to English. One request at a time; assistingField names the field
// being filled. Provided by FormBlog.
@Injectable()
export class BlogAssistantService {
  private editor = inject(BlogFormService);
  private contentAssistant = inject(ContentAssistantService);
  private notification = inject(NotificationService);

  assistingField: string | null = null;

  assistArticleField(locale: BlogFormLocale, field: BlogAssistField) {
    if (this.assistingField) return;
    const value = this.editor.form.getRawValue();
    const controlName = `${locale}_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'article',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          user_written_title: value[`${locale}_title`],
        }),
        fields: { [field]: value[controlName] || '' },
        field_types: { [field]: assistFieldType(field) },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          this.editor.form.get(controlName)?.setValue(fields[field] || '');
          this.notification.showSuccess(
            'Draf field sudah diisi. Periksa fakta dan gaya bahasa sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  translateArticleField(field: BlogAssistField) {
    if (this.assistingField) return;
    const value = this.editor.form.getRawValue();
    const controlName = `en_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: 'article',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: { [field]: value[`id_${field}`] || '' },
        field_types: { [field]: assistFieldType(field) },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          this.editor.form.get(controlName)?.setValue(fields[field] || '');
          this.notification.showSuccess(
            'Field English sudah diterjemahkan. Judul tetap Anda isi sendiri.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  private showAssistantError(error: IApiErrorResponse) {
    this.notification.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan konten belum berhasil. Coba lagi sebentar.',
    );
  }
}
