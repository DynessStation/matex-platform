import { Injectable, OutputEmitterRef, inject } from '@angular/core';

import { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';

import { WebsitePageEditorService } from './website-page-editor.service';
import { WebsitePageEditorLocale } from './website-page-form.model';
import {
  buildAboutContentJson,
  buildHomeContentJson,
  buildSavePayload,
  slugify,
} from './website-page-form.util';
import { WebsitePagePublicationService } from './website-page-publication.service';
import {
  IWebsitePageEditorAttachment,
  IWebsitePageEditorDetail,
  IWebsitePageEditorSaveRequest,
  IWebsitePageEditorTranslation,
} from '../../../shared/interface/website-page-editor.interface';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Preview and save flow of the fixed website page form: the checks before the Preview tab
// opens and before saving, the preview page built from the form, and the save request.
// Provided by WebsitePageForm next to WebsitePageEditorService, which holds the state.
@Injectable()
export class WebsitePageSaveService {
  private readonly editor = inject(WebsitePageEditorService);
  private readonly publication = inject(WebsitePagePublicationService);
  private readonly notification = inject(NotificationService);
  private readonly formIssues = inject(FormIssueNavigatorService);

  // Bound to the form's output in connect().
  private submitted: OutputEmitterRef<IWebsitePageEditorSaveRequest> | null =
    null;

  connect(form: {
    submitted: OutputEmitterRef<IWebsitePageEditorSaveRequest>;
  }): void {
    this.submitted = form.submitted;
  }

  //==================================================
  //==== PREVIEW
  //==================================================

  public previewPage: IWebsitePageEditorDetail | null = null;

  onNavChange(event: NgbNavChangeEvent): void {
    if (event.nextId !== 'preview') {
      return;
    }

    const editor = this.editor;

    this.publication.publicationValidationAttempted = true;
    editor.mediaValidationAttempted = true;

    const invalidAboutLocale = editor.firstInvalidAboutLocale();
    if (invalidAboutLocale) {
      event.preventDefault();
      editor.activeLocale = invalidAboutLocale;
      editor.activeTab = 'content';
      return;
    }

    if (editor.aboutMediaBlocksSave || editor.gadgetHomeMediaBlocksSave) {
      event.preventDefault();
      editor.activeTab = 'media';
      return;
    }

    if (
      this.publication.publicationRequiresPublishedTranslation &&
      !editor.defaultTranslationPublished
    ) {
      event.preventDefault();

      editor.activeTab = 'publication';

      return;
    }

    if (
      this.publication.publicationScheduleInvalid ||
      this.publication.publicationEndInvalid
    ) {
      event.preventDefault();

      editor.activeTab = 'publication';

      return;
    }

    this.refreshPreviewPage();
  }

  refreshPreviewPage(): void {
    this.previewPage = this.buildPreviewPage();
  }

  /** The page as it would be stored, built from the form and the media drafts. */
  private buildPreviewPage(): IWebsitePageEditorDetail {
    const editor = this.editor;

    const raw = editor.form.getRawValue();

    const source = editor.editData();

    const now = new Date().toISOString();

    const enabledLanguages = editor.supportedLanguages.filter((language) =>
      editor.isLanguageEnabled(language.locale),
    );

    const translations: IWebsitePageEditorTranslation[] = enabledLanguages.map(
      (language) => {
        const group = editor.translationForm(language.locale);

        const value = group.getRawValue();

        const existing = source?.translations.find(
          (item) => item.website_page_locale === language.locale,
        );

        const title = value.title.trim();

        const slug = value.slug.trim() || slugify(title);

        return {
          website_page_locale: language.locale,

          website_page_slug: slug,

          website_page_title: title,

          website_page_excerpt: value.excerpt.trim() || null,

          website_page_content: value.content || null,

          website_page_content_json: editor.isGadgetHomeTemplate
            ? buildHomeContentJson(
                existing?.website_page_content_json,
                editor.homeSectionVisibility[language.locale],
                editor.homeLatexContent[language.locale],
                editor.homeAdvertisementContent[language.locale],
              )
            : editor.isAboutTemplate
              ? buildAboutContentJson(editor.aboutFeatures[language.locale])
              : (existing?.website_page_content_json ?? null),

          website_page_meta_title: value.meta_title.trim() || null,

          website_page_meta_description: value.meta_description.trim() || null,

          website_page_meta_keywords: value.meta_keywords.trim() || null,

          website_page_meta_robots: value.meta_robots.trim() || null,

          website_page_canonical_url: value.canonical_url.trim() || null,

          website_page_og_title: value.og_title.trim() || null,

          website_page_og_description: value.og_description.trim() || null,

          website_page_schema_json: existing?.website_page_schema_json ?? null,

          website_page_i18n_status: value.status,

          created: existing?.created ?? now,

          updated: now,
        };
      },
    );

    const attachments: IWebsitePageEditorAttachment[] = editor.pageMedia.map(
      (item, index) => {
        const existing = source?.attachments.find(
          (attachment) =>
            attachment.id_attachment === item.attachment.id_attachment,
        );

        return {
          ...item.attachment,

          website_page_attachment_role: item.role,

          website_page_attachment_sort_order: index,

          website_page_attachment_is_public: item.is_public ? 1 : 0,

          website_page_attachment_action_type: item.action_type,

          website_page_attachment_action_value:
            item.action_type === 'none'
              ? null
              : item.action_value.trim() || null,

          translations: enabledLanguages.map((language) => {
            const existingTranslation = existing?.translations.find(
              (translation) =>
                translation.website_page_attachment_locale === language.locale,
            );

            const mediaTranslation = item.translations[language.locale];

            return {
              website_page_attachment_locale: language.locale,

              website_page_attachment_caption:
                mediaTranslation.caption.trim() || null,

              website_page_attachment_alt_text:
                mediaTranslation.alt_text.trim() || null,

              created: existingTranslation?.created ?? now,

              updated: now,
            };
          }),

          created: existing?.created ?? item.attachment.created ?? now,

          updated: now,
        };
      },
    );

    return {
      id_website_page: source?.id_website_page ?? 'preview',

      id_parent_website_page: source?.id_parent_website_page ?? null,

      website_page_key: raw.website_page_key.trim(),

      website_page_type: raw.website_page_type.trim(),

      website_page_template: raw.website_page_template.trim() || null,

      website_page_content_mode: raw.website_page_content_mode.trim(),

      website_page_default_locale: raw.website_page_default_locale,

      website_page_status: this.publication.previewWebsitePageEditorStatus(),

      effective_status: this.publication.previewEffectiveStatus(),

      website_page_visibility: Number(raw.website_page_visibility) as 0 | 1 | 2,

      website_page_is_system:
        source?.website_page_is_system ?? (raw.website_page_is_system ? 1 : 0),

      website_page_is_featured: raw.website_page_is_featured ? 1 : 0,

      website_page_sort_order: Number(raw.website_page_sort_order),

      website_page_publish_at: this.publication.previewPublishAt(),

      website_page_unpublish_at: this.publication.previewUnpublishAt(),

      website_page_settings_json: source?.website_page_settings_json ?? null,

      translations,

      attachments,

      translation_count: translations.length,

      attachment_count: attachments.length,

      created_by: source?.created_by ?? null,

      updated_by: source?.updated_by ?? null,

      created: source?.created ?? now,

      updated: now,
    };
  }

  //==================================================
  //==== SAVE
  //==================================================

  submitForm(): void {
    const editor = this.editor;

    this.publication.publicationValidationAttempted = true;
    editor.mediaValidationAttempted = true;

    const invalidFormSection = this.firstInvalidFormSection();

    if (invalidFormSection) {
      editor.activeTab = invalidFormSection.tab;

      if (invalidFormSection.locale) {
        editor.activeLocale = invalidFormSection.locale;
      }

      this.reject(
        'Pengaturan halaman belum lengkap. Periksa field yang ditandai merah.',
      );

      return;
    }

    if (editor.gadgetHomeMediaBlocksSave || editor.aboutMediaBlocksSave) {
      editor.activeTab = 'media';

      this.reject(
        'Media wajib belum lengkap atau ukurannya belum sesuai slot.',
      );

      return;
    }

    if (
      this.publication.publicationRequiresPublishedTranslation &&
      !editor.defaultTranslationPublished
    ) {
      editor.activeTab = 'publication';

      this.reject(
        'Publikasikan bahasa utama terlebih dahulu sebelum menerapkan status halaman.',
      );

      return;
    }

    if (
      this.publication.publicationScheduleInvalid ||
      this.publication.publicationEndInvalid
    ) {
      editor.activeTab = 'publication';

      this.reject(
        'Tanggal atau waktu publikasi belum lengkap atau tidak valid.',
      );

      return;
    }

    this.submitted?.emit({
      payload: buildSavePayload(this.buildPreviewPage(), editor.editData()),

      publicationActions: this.publication.buildPublicationActions(),
    });
  }

  private reject(message: string): void {
    this.notification.showError(message);
    this.formIssues.focusFirstInvalid();
  }

  /** Called by the edit page when the API rejects a save. */
  showServerIssue(code: string): void {
    const editor = this.editor;

    if (code === 'WEBSITE_PAGE_CONFLICT') {
      editor.activeTab = 'content';
      editor.activeLocale = 'id-ID';
      const control = editor.translationForm('id-ID').controls.slug;
      control.setErrors({ ...(control.errors ?? {}), duplicate: true });
      this.formIssues.focusFirstInvalid('slug');
      return;
    }
    editor.form.markAllAsTouched();
    const invalid = this.firstInvalidFormSection();
    if (invalid) {
      editor.activeTab = invalid.tab;
      if (invalid.locale) editor.activeLocale = invalid.locale;
    }
    this.formIssues.focusFirstInvalid();
  }

  private firstInvalidFormSection(): {
    tab: 'general' | 'content' | 'seo';
    locale?: WebsitePageEditorLocale;
  } | null {
    const editor = this.editor;

    editor.form.markAllAsTouched();

    const controls = editor.form.controls;
    const generalControls = [
      controls.website_page_key,
      controls.website_page_type,
      controls.website_page_template,
      controls.website_page_default_locale,
      controls.website_page_visibility,
      controls.website_page_sort_order,
    ];

    if (generalControls.some((control) => control.invalid)) {
      return { tab: 'general' };
    }

    for (const language of editor.supportedLanguages) {
      const group = editor.translationForm(language.locale);

      if (group.disabled) {
        continue;
      }

      if (group.controls.title.invalid || group.controls.slug.invalid) {
        return { tab: 'content', locale: language.locale };
      }

      if (
        editor.isAboutTemplate &&
        editor.aboutFeatures[language.locale].some((_, index) =>
          Boolean(editor.aboutHighlightIssue(language.locale, index)),
        )
      ) {
        return { tab: 'content', locale: language.locale };
      }

      const seoControls = [
        group.controls.meta_title,
        group.controls.meta_description,
        group.controls.meta_keywords,
        group.controls.meta_robots,
        group.controls.canonical_url,
        group.controls.og_title,
        group.controls.og_description,
      ];

      if (seoControls.some((control) => control.invalid)) {
        return { tab: 'seo', locale: language.locale };
      }
    }

    return null;
  }
}
