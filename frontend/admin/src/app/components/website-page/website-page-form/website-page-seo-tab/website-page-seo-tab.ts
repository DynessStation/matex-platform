import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { WebsitePageAssistantService } from '../website-page-assistant.service';
import { WebsitePageEditorService } from '../website-page-editor.service';
import { WebsitePageEditorLocale } from '../website-page-form.model';

// SEO tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-seo-tab',

  imports: [ReactiveFormsModule, TranslateModule, AiFieldAction],

  templateUrl: './website-page-seo-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class WebsitePageSeoTab {
  readonly editor = inject(WebsitePageEditorService);

  readonly assistant = inject(WebsitePageAssistantService);

  seoPreviewTitle(): string {
    const group = this.editor.translationForm(this.editor.activeLocale);

    return (
      group.controls.meta_title.value.trim() ||
      group.controls.title.value.trim() ||
      '-'
    );
  }

  seoPreviewDescription(): string {
    const group = this.editor.translationForm(this.editor.activeLocale);

    return (
      group.controls.meta_description.value.trim() ||
      group.controls.excerpt.value.trim() ||
      '-'
    );
  }

  seoPreviewSlug(): string {
    const slug = this.editor
      .translationForm(this.editor.activeLocale)
      .controls.slug.value.trim();

    return slug ? `/${slug}` : '/';
  }

  goToMedia(): void {
    let invalidLocale: WebsitePageEditorLocale | null = null;

    this.editor.supportedLanguages.forEach((language) => {
      const group = this.editor.translationForm(language.locale);

      if (group.disabled) {
        return;
      }

      group.controls.meta_title.markAsTouched();
      group.controls.meta_description.markAsTouched();
      group.controls.meta_keywords.markAsTouched();
      group.controls.meta_robots.markAsTouched();
      group.controls.canonical_url.markAsTouched();
      group.controls.og_title.markAsTouched();
      group.controls.og_description.markAsTouched();

      if (
        group.controls.meta_title.invalid ||
        group.controls.meta_description.invalid ||
        group.controls.meta_keywords.invalid ||
        group.controls.meta_robots.invalid ||
        group.controls.canonical_url.invalid ||
        group.controls.og_title.invalid ||
        group.controls.og_description.invalid
      ) {
        invalidLocale ??= language.locale;
      }
    });

    if (invalidLocale) {
      this.editor.activeLocale = invalidLocale;
      this.editor.activeTab = 'seo';

      return;
    }

    this.editor.activeTab = this.editor.canViewAttachments
      ? 'media'
      : 'publication';
  }
}
