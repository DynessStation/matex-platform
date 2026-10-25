import { Injectable, inject } from '@angular/core';

import { finalize } from 'rxjs';

import { WebsitePageEditorService } from './website-page-editor.service';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Writing help of the fixed website page form (Content and SEO tabs): drafts a field in the
// active language, or translates it from Indonesian when English is active. One request at
// a time; assistingPageField names the field being filled. Provided by WebsitePageForm.
@Injectable()
export class WebsitePageAssistantService {
  private readonly editor = inject(WebsitePageEditorService);
  private readonly contentAssistant = inject(ContentAssistantService);
  private readonly notification = inject(NotificationService);

  public assistingPageField: string | null = null;

  assistPageField(
    field: 'excerpt' | 'content' | 'meta_description' | 'og_description',
  ): void {
    if (this.assistingPageField) return;
    const editor = this.editor;
    const locale = editor.activeLocale;
    const group = editor.translationForm(locale);
    const value = group.getRawValue();
    const translateFromIndonesia = locale === 'en-US';
    this.assistingPageField = field;
    this.contentAssistant
      .assist({
        mode: translateFromIndonesia ? 'translate' : 'generate',
        content_type: editor.isGadgetHomeTemplate
          ? 'home page'
          : 'website page',
        source_locale: translateFromIndonesia ? 'id-ID' : undefined,
        target_locale: locale,
        context: JSON.stringify({
          user_written_title: value.title,
          page_key: editor.form.controls.website_page_key.value,
        }),
        fields: {
          [field]: translateFromIndonesia
            ? editor.translationForm('id-ID').getRawValue()[field]
            : value[field],
        },
        field_types: {
          [field]:
            field === 'content'
              ? 'rich_text_html'
              : field === 'excerpt'
                ? 'multiline_text'
                : 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assistingPageField = null)))
      .subscribe({
        next: (generated) => {
          group.controls[field].setValue(generated[field] || '');
          this.notification.showSuccess(
            translateFromIndonesia
              ? 'Field English sudah diterjemahkan. Judul tetap Anda isi sendiri.'
              : 'Draf field sudah diisi. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showContentAssistantError(error),
      });
  }

  showContentAssistantError(error: any): void {
    this.notification.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan konten belum berhasil. Coba lagi sebentar.',
    );
  }
}
