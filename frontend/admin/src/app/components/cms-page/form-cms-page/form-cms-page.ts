import { Component, DestroyRef, effect, inject, input } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import {
  CmsPageI18nStatus,
  ICmsPageDetail,
} from '../../../shared/interface/cms-page.interface';

type CmsPageLocale = 'id-ID' | 'en-US';
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
  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== INPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<ICmsPageDetail | null>(null);

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  public activeLocale: CmsPageLocale = 'id-ID';

  public readonly supportedLanguages: {
    locale: CmsPageLocale;
    labelKey: string;
    shortLabel: string;
  }[] = [
    {
      locale: 'id-ID',
      labelKey: 'cms_page.language_indonesian',
      shortLabel: 'ID',
    },
    {
      locale: 'en-US',
      labelKey: 'cms_page.language_english',
      shortLabel: 'EN',
    },
  ];

  //==================================================
  //==== TRANSLATION FORM
  //==================================================

  private createTranslationForm(locale: CmsPageLocale) {
    return this.formBuilder.nonNullable.group({
      locale: [locale],

      title: ['', [Validators.required, Validators.maxLength(255)]],

      slug: [
        '',
        [
          Validators.maxLength(191),
          Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        ],
      ],

      excerpt: [''],

      content: [''],

      meta_title: ['', [Validators.maxLength(255)]],

      meta_description: ['', [Validators.maxLength(500)]],

      meta_keywords: ['', [Validators.maxLength(500)]],

      meta_robots: ['index,follow', [Validators.maxLength(100)]],

      canonical_url: [
        '',
        [Validators.maxLength(500), Validators.pattern(/^https?:\/\/.+/i)],
      ],

      og_title: ['', [Validators.maxLength(255)]],

      og_description: ['', [Validators.maxLength(500)]],

      status: [0 as CmsPageI18nStatus],
    });
  }

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

    translations: this.formBuilder.group({
      'id-ID': this.createTranslationForm('id-ID'),

      'en-US': this.createTranslationForm('en-US'),
    }),
  });

  //==================================================
  //==== EDIT DATA
  //==================================================

  constructor() {
    // English belum otomatis dibuat pada page baru.
    this.translationForm('en-US').disable({
      emitEvent: false,
    });

    this.form.controls.cms_page_default_locale.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const locale: CmsPageLocale = value === 'en-US' ? 'en-US' : 'id-ID';

        this.enableLanguage(locale);

        this.activeLocale = locale;
      });

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

      //==================================================
      //==== RESET TRANSLATIONS
      //==================================================

      this.resetTranslationForm('id-ID');
      this.resetTranslationForm('en-US');

      this.translationForm('id-ID').disable({
        emitEvent: false,
      });

      this.translationForm('en-US').disable({
        emitEvent: false,
      });

      //==================================================
      //==== PATCH TRANSLATIONS
      //==================================================

      data.translations.forEach((translation) => {
        const locale = this.parseLocale(translation.cms_page_locale);

        if (!locale) {
          return;
        }

        const group = this.translationForm(locale);

        group.enable({
          emitEvent: false,
        });

        group.patchValue(
          {
            locale,

            title: translation.cms_page_title,

            slug: translation.cms_page_slug,

            excerpt: translation.cms_page_excerpt ?? '',

            content: translation.cms_page_content ?? '',

            meta_title: translation.cms_page_meta_title ?? '',

            meta_description: translation.cms_page_meta_description ?? '',

            meta_keywords: translation.cms_page_meta_keywords ?? '',

            meta_robots: translation.cms_page_meta_robots ?? 'index,follow',

            canonical_url: translation.cms_page_canonical_url ?? '',

            og_title: translation.cms_page_og_title ?? '',

            og_description: translation.cms_page_og_description ?? '',

            status: translation.cms_page_i18n_status,
          },
          {
            emitEvent: false,
          },
        );
      });

      const defaultLocale =
        this.parseLocale(data.cms_page_default_locale) ?? 'id-ID';

      this.enableLanguage(defaultLocale);

      this.activeLocale = defaultLocale;
    });
  }

  //==================================================
  //==== SYSTEM PAGE
  //==================================================

  get isSystemPage(): boolean {
    return this.mode() === 'edit' && this.editData()?.cms_page_is_system === 1;
  }

  //==================================================
  //==== LANGUAGE
  //==================================================

  translationForm(locale: CmsPageLocale) {
    return this.form.controls.translations.controls[locale];
  }

  isLanguageEnabled(locale: CmsPageLocale): boolean {
    return this.translationForm(locale).enabled;
  }

  isDefaultLocale(locale: CmsPageLocale): boolean {
    return this.form.controls.cms_page_default_locale.value === locale;
  }

  selectLanguage(locale: CmsPageLocale): void {
    this.activeLocale = locale;
  }

  enableLanguage(locale: CmsPageLocale): void {
    this.translationForm(locale).enable({
      emitEvent: false,
    });
  }

  addLanguage(locale: CmsPageLocale): void {
    this.enableLanguage(locale);

    this.activeLocale = locale;
  }

  removeLanguage(locale: CmsPageLocale): void {
    if (this.isDefaultLocale(locale)) {
      return;
    }

    this.resetTranslationForm(locale);

    this.translationForm(locale).disable({
      emitEvent: false,
    });

    if (this.activeLocale === locale) {
      const defaultLocale =
        this.parseLocale(this.form.controls.cms_page_default_locale.value) ??
        'id-ID';

      this.activeLocale = defaultLocale;
    }
  }

  private resetTranslationForm(locale: CmsPageLocale): void {
    this.translationForm(locale).reset(
      {
        locale,

        title: '',

        slug: '',

        excerpt: '',

        content: '',

        meta_title: '',

        meta_description: '',

        meta_keywords: '',

        meta_robots: 'index,follow',

        canonical_url: '',

        og_title: '',

        og_description: '',

        status: 0,
      },
      {
        emitEvent: false,
      },
    );
  }

  private parseLocale(value: string): CmsPageLocale | null {
    if (value === 'id-ID' || value === 'en-US') {
      return value;
    }

    return null;
  }

  //==================================================
  //==== TRANSLATION SLUG
  //==================================================

  generateTranslationSlug(locale: CmsPageLocale): void {
    const group = this.translationForm(locale);

    if (group.controls.slug.value.trim()) {
      return;
    }

    group.controls.slug.setValue(this.slugify(group.controls.title.value));
  }

  normalizeTranslationSlug(locale: CmsPageLocale): void {
    const control = this.translationForm(locale).controls.slug;

    control.setValue(this.slugify(control.value));
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  //==================================================
  //==== NEXT SEO
  //==================================================

  goToSeo(): void {
    let invalidLocale: CmsPageLocale | null = null;

    this.supportedLanguages.forEach((language) => {
      const group = this.translationForm(language.locale);

      if (group.disabled) {
        return;
      }

      group.markAllAsTouched();

      if (group.invalid && !invalidLocale) {
        invalidLocale = language.locale;
      }
    });

    if (invalidLocale) {
      this.activeLocale = invalidLocale;

      this.activeTab = 'content';

      return;
    }

    this.activeTab = 'seo';
  }

  //==================================================
  //==== SEO PREVIEW
  //==================================================

  seoPreviewTitle(): string {
    const group = this.translationForm(this.activeLocale);

    return (
      group.controls.meta_title.value.trim() ||
      group.controls.title.value.trim() ||
      '-'
    );
  }

  seoPreviewDescription(): string {
    const group = this.translationForm(this.activeLocale);

    return (
      group.controls.meta_description.value.trim() ||
      group.controls.excerpt.value.trim() ||
      '-'
    );
  }

  seoPreviewSlug(): string {
    const slug = this.translationForm(
      this.activeLocale,
    ).controls.slug.value.trim();

    return slug ? `/${slug}` : '/';
  }

  //==================================================
  //==== NEXT MEDIA
  //==================================================

  goToMedia(): void {
    let invalidLocale: CmsPageLocale | null = null;

    this.supportedLanguages.forEach((language) => {
      const group = this.translationForm(language.locale);

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
      this.activeLocale = invalidLocale;
      this.activeTab = 'seo';

      return;
    }

    this.activeTab = 'media';
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
