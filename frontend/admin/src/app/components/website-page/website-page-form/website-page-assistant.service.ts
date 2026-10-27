import { Injectable, inject } from '@angular/core';

import { finalize } from 'rxjs';

import { WebsitePageEditorService } from './website-page-editor.service';
import { WebsitePageEditorLocale } from './website-page-form.model';
import { IApiErrorResponse } from '../../../shared/interface/api-response.interface';
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

  // The Home or About description being filled.
  public assistingOrganizerField: string | null = null;

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

  assistOrganizerDescription(
    kind: 'latex' | 'latex_item' | 'advertisement' | 'about_item',
    index = 0,
  ): void {
    if (this.assistingOrganizerField) return;
    const locale = this.editor.activeLocale;
    const sourceLocale: WebsitePageEditorLocale = 'id-ID';
    const translateFromIndonesia = locale === 'en-US';
    const taskKey = `${kind}-${index}`;
    let current = '';
    let source = '';
    let userWrittenTitle = '';

    if (kind === 'latex') {
      current = this.editor.homeLatexContent[locale].description;
      source = this.editor.homeLatexContent[sourceLocale].description;
      userWrittenTitle = this.editor.homeLatexContent[locale].title;
    } else if (kind === 'latex_item') {
      current =
        this.editor.homeLatexContent[locale].items[index]?.description || '';
      source =
        this.editor.homeLatexContent[sourceLocale].items[index]?.description ||
        '';
      userWrittenTitle =
        this.editor.homeLatexContent[locale].items[index]?.title || '';
    } else if (kind === 'advertisement') {
      current = this.editor.homeAdvertisementContent[locale].description;
      source = this.editor.homeAdvertisementContent[sourceLocale].description;
      userWrittenTitle = this.editor.homeAdvertisementContent[locale].title;
    } else {
      current = this.editor.aboutFeatures[locale][index]?.description || '';
      source =
        this.editor.aboutFeatures[sourceLocale][index]?.description || '';
      userWrittenTitle = this.editor.aboutFeatures[locale][index]?.title || '';
    }

    this.assistingOrganizerField = taskKey;
    this.contentAssistant
      .assist({
        mode: translateFromIndonesia ? 'translate' : 'generate',
        content_type: `website-${kind}`,
        source_locale: translateFromIndonesia ? sourceLocale : undefined,
        target_locale: locale,
        context: JSON.stringify({ user_written_title: userWrittenTitle }),
        fields: { description: translateFromIndonesia ? source : current },
        field_types: { description: 'multiline_text' },
      })
      .pipe(finalize(() => (this.assistingOrganizerField = null)))
      .subscribe({
        next: (fields) => {
          const description = fields['description'] || '';
          if (kind === 'latex') {
            this.editor.homeLatexContent[locale].description = description;
          } else if (kind === 'latex_item') {
            this.editor.updateHomeLatexItem(
              locale,
              index,
              'description',
              description,
            );
          } else if (kind === 'advertisement') {
            this.editor.homeAdvertisementContent[locale].description =
              description;
          } else {
            this.editor.updateAboutFeature(
              locale,
              index,
              'description',
              description,
            );
          }
          this.notification.showSuccess(
            translateFromIndonesia
              ? 'Deskripsi English sudah diterjemahkan. Judul tetap Anda isi sendiri.'
              : 'Draf deskripsi sudah diisi. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showContentAssistantError(error),
      });
  }

  showContentAssistantError(error: IApiErrorResponse): void {
    this.notification.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan konten belum berhasil. Coba lagi sebentar.',
    );
  }
}
