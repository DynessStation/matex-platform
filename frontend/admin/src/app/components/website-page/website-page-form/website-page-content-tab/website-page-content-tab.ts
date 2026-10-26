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

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { WebsitePageAboutContent } from '../website-page-about-content/website-page-about-content';
import { WebsitePageAssistantService } from '../website-page-assistant.service';
import { WebsitePageEditorService } from '../website-page-editor.service';
import { WebsitePageEditorLocale } from '../website-page-form.model';
import { parseLocale, slugify } from '../website-page-form.util';
import { WebsitePageHomeContent } from '../website-page-home-content/website-page-home-content';

// Content tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-content-tab',

  imports: [
    HelpTip,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    NgxEditorModule,
    AiFieldAction,
    WebsitePageHomeContent,
    WebsitePageAboutContent,
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

  public readonly contentEditorToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],

    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],

    ['ordered_list', 'bullet_list'],

    ['blockquote', 'horizontal_rule'],

    ['link'],

    ['align_left', 'align_center', 'align_right', 'align_justify'],

    ['format_clear'],
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
