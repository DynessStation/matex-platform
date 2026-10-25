import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  ControlContainer,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';
import { finalize } from 'rxjs';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { WebsitePageAssistantService } from '../website-page-assistant.service';
import { WebsitePageEditorService } from '../website-page-editor.service';
import {
  AboutFeatureDraft,
  HomeLatexFeatureDraft,
  HomeSectionKey,
  WebsitePageEditorLocale,
} from '../website-page-form.model';
import { parseLocale, slugify } from '../website-page-form.util';

// Content tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-content-tab',

  imports: [
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    NgxEditorModule,
    AiFieldAction,
  ],

  templateUrl: './website-page-content-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class WebsitePageContentTab {
  readonly editor = inject(WebsitePageEditorService);

  readonly assistant = inject(WebsitePageAssistantService);

  // Rich text editor for the page body; created in the browser, per visit to this tab.
  readonly contentEditor = signal<Editor | null>(null);

  constructor() {
    afterNextRender(() => this.contentEditor.set(new Editor()));
    inject(DestroyRef).onDestroy(() => this.contentEditor()?.destroy());
  }

  public assistingOrganizerField: string | null = null;

  public readonly contentEditorToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],

    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],

    ['ordered_list', 'bullet_list'],

    ['blockquote', 'horizontal_rule'],

    ['link'],

    ['align_left', 'align_center', 'align_right', 'align_justify'],

    ['format_clear'],
  ];

  public readonly homeSectionOptions: readonly {
    key: HomeSectionKey;
    labelKey: string;
    descriptionKey: string;
    requiresVerifiedData: boolean;
  }[] = [
    {
      key: 'latex_features',
      labelKey: 'website_page.home_section_latex_features',
      descriptionKey: 'website_page.home_section_latex_features_help',
      requiresVerifiedData: false,
    },
    {
      key: 'categories',
      labelKey: 'website_page.home_section_categories',
      descriptionKey: 'website_page.home_section_categories_help',
      requiresVerifiedData: false,
    },
    {
      key: 'products',
      labelKey: 'website_page.home_section_products',
      descriptionKey: 'website_page.home_section_products_help',
      requiresVerifiedData: false,
    },
    {
      key: 'articles',
      labelKey: 'website_page.home_section_articles',
      descriptionKey: 'website_page.home_section_articles_help',
      requiresVerifiedData: false,
    },
    {
      key: 'tags',
      labelKey: 'website_page.home_section_tags',
      descriptionKey: 'website_page.home_section_tags_help',
      requiresVerifiedData: true,
    },
    {
      key: 'newsletter',
      labelKey: 'website_page.home_section_newsletter',
      descriptionKey: 'website_page.home_section_newsletter_help',
      requiresVerifiedData: true,
    },
    {
      key: 'advertisement',
      labelKey: 'website_page.home_section_advertisement',
      descriptionKey: 'website_page.home_section_advertisement_help',
      requiresVerifiedData: false,
    },
  ];

  get isOperationalDataPage(): boolean {
    return (
      this.editor.isSystemPage &&
      ['contact', 'faq'].includes(
        this.editor.form.controls.website_page_key.value,
      )
    );
  }

  get operationalDataHelpKey(): string {
    return this.editor.form.controls.website_page_key.value === 'contact'
      ? 'website_page.operational_contact_help'
      : 'website_page.operational_faq_help';
  }

  updateHomeLatexItem(
    locale: WebsitePageEditorLocale,
    index: number,
    field: keyof HomeLatexFeatureDraft,
    value: string,
  ): void {
    const items = [...this.editor.homeLatexContent[locale].items];
    items[index] = { ...items[index], [field]: value };
    this.editor.homeLatexContent = {
      ...this.editor.homeLatexContent,
      [locale]: { ...this.editor.homeLatexContent[locale], items },
    };
  }

  updateAboutFeature(
    locale: WebsitePageEditorLocale,
    index: number,
    field: keyof AboutFeatureDraft,
    value: string,
  ): void {
    this.editor.aboutFeatures[locale][index] = {
      ...this.editor.aboutFeatures[locale][index],
      [field]: value,
    };
    this.editor.aboutFeatures = { ...this.editor.aboutFeatures };
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
    this.editor.contentAssistant
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
            this.updateHomeLatexItem(locale, index, 'description', description);
          } else if (kind === 'advertisement') {
            this.editor.homeAdvertisementContent[locale].description =
              description;
          } else {
            this.updateAboutFeature(locale, index, 'description', description);
          }
          this.editor.notification.showSuccess(
            translateFromIndonesia
              ? 'Deskripsi English sudah diterjemahkan. Judul tetap Anda isi sendiri.'
              : 'Draf deskripsi sudah diisi. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.assistant.showContentAssistantError(error),
      });
  }

  addLanguage(locale: WebsitePageEditorLocale): void {
    this.editor.enableLanguage(locale);

    this.editor.activeLocale = locale;
  }

  removeLanguage(locale: WebsitePageEditorLocale): void {
    if (this.editor.isDefaultLocale(locale)) {
      return;
    }

    this.editor.resetTranslationForm(locale);

    this.editor.translationForm(locale).disable({
      emitEvent: false,
    });

    if (this.editor.activeLocale === locale) {
      const defaultLocale =
        parseLocale(
          this.editor.form.controls.website_page_default_locale.value,
        ) ?? 'id-ID';

      this.editor.activeLocale = defaultLocale;
    }
  }

  generateTranslationSlug(locale: WebsitePageEditorLocale): void {
    const group = this.editor.translationForm(locale);

    if (group.controls.slug.value.trim()) {
      return;
    }

    group.controls.slug.setValue(slugify(group.controls.title.value));
  }

  normalizeTranslationSlug(locale: WebsitePageEditorLocale): void {
    const control = this.editor.translationForm(locale).controls.slug;

    control.setValue(slugify(control.value));
  }

  goToSeo(): void {
    const invalidAboutLocale = this.editor.firstInvalidAboutLocale();
    if (invalidAboutLocale) {
      this.editor.activeLocale = invalidAboutLocale;
      this.editor.activeTab = 'content';
      return;
    }

    let invalidLocale: WebsitePageEditorLocale | null = null;

    this.editor.supportedLanguages.forEach((language) => {
      const group = this.editor.translationForm(language.locale);

      if (group.disabled) {
        return;
      }

      group.markAllAsTouched();

      if (group.invalid && !invalidLocale) {
        invalidLocale = language.locale;
      }
    });

    if (invalidLocale) {
      this.editor.activeLocale = invalidLocale;

      this.editor.activeTab = 'content';

      return;
    }

    this.editor.activeTab = 'seo';
  }
}
