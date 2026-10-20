import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { WebsitePageEditorService } from '../website-page-editor.service';

// General tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-general-tab',

  imports: [ReactiveFormsModule, TranslateModule],

  templateUrl: './website-page-general-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class WebsitePageGeneralTab {
  readonly editor = inject(WebsitePageEditorService);

  public readonly templateOptions = [
    { value: 'standard', label: 'Standard page' },
    { value: 'home', label: 'Home utama' },
    { value: 'company-profile', label: 'Company profile' },
    { value: 'contact', label: 'Contact page' },
  ];

  normalizePageKey(): void {
    const control = this.editor.form.controls.website_page_key;

    const normalized = control.value.trim().toLowerCase().replace(/\s+/g, '-');

    control.setValue(normalized);
  }

  goToContent(): void {
    const controls = this.editor.form.controls;

    controls.website_page_key.markAsTouched();
    controls.website_page_type.markAsTouched();
    controls.website_page_template.markAsTouched();
    controls.website_page_default_locale.markAsTouched();
    controls.website_page_visibility.markAsTouched();
    controls.website_page_sort_order.markAsTouched();

    if (
      controls.website_page_key.invalid ||
      controls.website_page_type.invalid ||
      controls.website_page_template.invalid ||
      controls.website_page_default_locale.invalid ||
      controls.website_page_visibility.invalid ||
      controls.website_page_sort_order.invalid
    ) {
      this.editor.activeTab = 'general';

      return;
    }

    this.editor.activeTab = 'content';
  }
}
