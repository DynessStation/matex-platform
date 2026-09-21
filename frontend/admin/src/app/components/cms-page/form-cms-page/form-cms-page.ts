import { Component, effect, inject, input } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import { ICmsPageDetail } from '../../../shared/interface/cms-page.interface';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-form-cms-page',

  imports: [ReactiveFormsModule, NgbModule, TranslateModule],

  templateUrl: './form-cms-page.html',
})
export class FormCmsPage {
  //==================================================
  //==== INJECT
  //==================================================

  private formBuilder = inject(FormBuilder);

  //==================================================
  //==== INPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<ICmsPageDetail | null>(null);

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group({
    cms_page_key: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[a-z0-9][a-z0-9_-]*$/),
      ],
    ],

    cms_page_type: [
      'standard',
      [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[a-z0-9][a-z0-9_-]*$/),
      ],
    ],

    cms_page_template: ['', [Validators.maxLength(100)]],

    cms_page_content_mode: ['html'],

    cms_page_default_locale: ['id-ID', [Validators.required]],

    cms_page_visibility: [1, [Validators.required]],

    cms_page_is_system: [false],

    cms_page_is_featured: [false],

    cms_page_sort_order: [0, [Validators.required, Validators.min(0)]],
  });

  //==================================================
  //==== EDIT DATA
  //==================================================

  constructor() {
    effect(() => {
      const data = this.editData();

      if (!data) {
        return;
      }

      this.form.patchValue(
        {
          cms_page_key: data.cms_page_key,

          cms_page_type: data.cms_page_type,

          cms_page_template: data.cms_page_template ?? '',

          cms_page_content_mode: data.cms_page_content_mode,

          cms_page_default_locale: data.cms_page_default_locale,

          cms_page_visibility: data.cms_page_visibility,

          cms_page_is_system: data.cms_page_is_system === 1,

          cms_page_is_featured: data.cms_page_is_featured === 1,

          cms_page_sort_order: data.cms_page_sort_order,
        },
        {
          emitEvent: false,
        },
      );
    });
  }

  //==================================================
  //==== SYSTEM PAGE
  //==================================================

  get isSystemPage(): boolean {
    return this.mode() === 'edit' && this.editData()?.cms_page_is_system === 1;
  }

  //==================================================
  //==== NORMALIZE KEY
  //==================================================

  normalizePageKey(): void {
    const control = this.form.controls.cms_page_key;

    const normalized = control.value.trim().toLowerCase().replace(/\s+/g, '-');

    control.setValue(normalized);
  }

  //==================================================
  //==== NEXT
  //==================================================

  goToContent(): void {
    const controls = this.form.controls;

    controls.cms_page_key.markAsTouched();
    controls.cms_page_type.markAsTouched();
    controls.cms_page_template.markAsTouched();
    controls.cms_page_default_locale.markAsTouched();
    controls.cms_page_visibility.markAsTouched();
    controls.cms_page_sort_order.markAsTouched();

    if (
      controls.cms_page_key.invalid ||
      controls.cms_page_type.invalid ||
      controls.cms_page_template.invalid ||
      controls.cms_page_default_locale.invalid ||
      controls.cms_page_visibility.invalid ||
      controls.cms_page_sort_order.invalid
    ) {
      this.activeTab = 'general';

      return;
    }

    this.activeTab = 'content';
  }
}
