import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  OutputEmitterRef,
  signal,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';

import { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { finalize } from 'rxjs';

import {
  WebsitePageEditorLocale,
  HomeSectionVisibility,
  HomeLatexContentDraft,
  HomeAdvertisementDraft,
  AboutFeatureDraft,
  ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH,
  ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH,
  WebsitePageEditorMediaDraft,
  PAGE_MEDIA_ACCEPT,
} from './website-page-form.model';
import {
  createHomeSectionVisibility,
  readHomeSectionVisibility,
  buildHomeContentJson,
  createHomeLatexContent,
  readHomeLatexContent,
  createHomeAdvertisementContent,
  readHomeAdvertisementContent,
  createAboutFeatures,
  readAboutFeatures,
  buildAboutContentJson,
  createEmptyMediaTranslations,
  parseLocale,
  slugify,
  gadgetHomeMediaIssue,
  gadgetHomeMediaActionIssue,
} from './website-page-form.util';
import { WebsitePagePublicationService } from './website-page-publication.service';
import {
  GADGET_HOME_MEDIA_RULES,
  GadgetHomeMediaRule,
} from '../../../shared/data/gadget-home-media';
import {
  WebsitePageEditorI18nStatus,
  IWebsitePageEditorAttachment,
  IWebsitePageEditorDetail,
  IWebsitePageEditorTranslation,
  IWebsitePageEditorPayload,
  IWebsitePageEditorSaveRequest,
} from '../../../shared/interface/website-page-editor.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { LocalizationService } from '../../../shared/services/localization.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthState } from '../../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../../shared/utils/permission.util';

// State and logic of the fixed website page form, shared by the form and its tabs.
// Provided by WebsitePageForm, so each open form has its own instance.
@Injectable()
export class WebsitePageEditorService {
  //==================================================
  //==== INJECT
  //==================================================

  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  public readonly localization = inject(LocalizationService);
  readonly translate = inject(TranslateService);
  readonly contentAssistant = inject(ContentAssistantService);
  readonly notification = inject(NotificationService);
  private readonly formIssues = inject(FormIssueNavigatorService);
  readonly publication = inject(WebsitePagePublicationService);

  //==================================================
  //==== INPUT
  //==================================================

  // Bound to the form's inputs and output in connect().
  mode: Signal<'create' | 'edit'> = signal('create');

  editData: Signal<IWebsitePageEditorDetail | null> = signal(null);

  saving: Signal<boolean> = signal(false);

  private submitted: OutputEmitterRef<IWebsitePageEditorSaveRequest> | null =
    null;

  connect(form: {
    mode: Signal<'create' | 'edit'>;
    editData: Signal<IWebsitePageEditorDetail | null>;
    saving: Signal<boolean>;
    submitted: OutputEmitterRef<IWebsitePageEditorSaveRequest>;
  }): void {
    this.mode = form.mode;
    this.editData = form.editData;
    this.saving = form.saving;
    this.submitted = form.submitted;
    this.publication.connect(form);
  }

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  public activeLocale: WebsitePageEditorLocale = 'id-ID';
  public assistingPageField: string | null = null;
  //==================================================
  //==== PREVIEW
  //==================================================

  public previewPage: IWebsitePageEditorDetail | null = null;

  //==================================================
  //==== MEDIA
  //==================================================

  public pageMedia: WebsitePageEditorMediaDraft[] = [];

  public readonly pageMediaAccept = PAGE_MEDIA_ACCEPT;

  public mediaValidationAttempted = false;

  //==================================================
  //==== CONTENT EDITOR
  //==================================================

  public readonly supportedLanguages: {
    locale: WebsitePageEditorLocale;
    labelKey: string;
    shortLabel: string;
  }[] = [
    {
      locale: 'id-ID',
      labelKey: 'website_page.language_indonesian',
      shortLabel: 'ID',
    },
    {
      locale: 'en-US',
      labelKey: 'website_page.language_english',
      shortLabel: 'EN',
    },
  ];

  public homeSectionVisibility: Record<
    WebsitePageEditorLocale,
    HomeSectionVisibility
  > = {
    'id-ID': createHomeSectionVisibility(),
    'en-US': createHomeSectionVisibility(),
  };

  public homeLatexContent: Record<
    WebsitePageEditorLocale,
    HomeLatexContentDraft
  > = {
    'id-ID': createHomeLatexContent('id-ID'),
    'en-US': createHomeLatexContent('en-US'),
  };

  public homeAdvertisementContent: Record<
    WebsitePageEditorLocale,
    HomeAdvertisementDraft
  > = {
    'id-ID': createHomeAdvertisementContent('id-ID'),
    'en-US': createHomeAdvertisementContent('en-US'),
  };

  public aboutFeatures: Record<WebsitePageEditorLocale, AboutFeatureDraft[]> = {
    'id-ID': createAboutFeatures(),
    'en-US': createAboutFeatures(),
  };

  // Pure helpers the template calls.
  //==================================================
  //==== TRANSLATION FORM
  //==================================================

  private createTranslationForm(locale: WebsitePageEditorLocale) {
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

      status: [0 as WebsitePageEditorI18nStatus],
    });
  }

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group({
    website_page_key: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[a-z0-9][a-z0-9_-]*$/),
      ],
    ],

    website_page_type: [
      'standard',
      [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[a-z0-9][a-z0-9_-]*$/),
      ],
    ],

    website_page_template: ['', [Validators.maxLength(100)]],

    website_page_content_mode: ['html'],

    website_page_default_locale: ['id-ID', [Validators.required]],

    website_page_visibility: [1, [Validators.required]],

    website_page_is_system: [false],

    website_page_is_featured: [false],

    website_page_sort_order: [0, [Validators.required, Validators.min(0)]],

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

    this.form.controls.website_page_default_locale.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const locale: WebsitePageEditorLocale =
          value === 'en-US' ? 'en-US' : 'id-ID';

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
          website_page_key: data.website_page_key,

          website_page_type: data.website_page_type,

          website_page_template: data.website_page_template ?? '',

          website_page_content_mode: data.website_page_content_mode,

          website_page_default_locale: data.website_page_default_locale,

          website_page_visibility: data.website_page_visibility,

          website_page_is_system: data.website_page_is_system === 1,

          website_page_is_featured: data.website_page_is_featured === 1,

          website_page_sort_order: data.website_page_sort_order,
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
      this.homeSectionVisibility = {
        'id-ID': createHomeSectionVisibility(),
        'en-US': createHomeSectionVisibility(),
      };

      this.homeLatexContent = {
        'id-ID': createHomeLatexContent('id-ID'),
        'en-US': createHomeLatexContent('en-US'),
      };
      this.homeAdvertisementContent = {
        'id-ID': createHomeAdvertisementContent('id-ID'),
        'en-US': createHomeAdvertisementContent('en-US'),
      };

      this.aboutFeatures = {
        'id-ID': createAboutFeatures(),
        'en-US': createAboutFeatures(),
      };

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
        const locale = parseLocale(translation.website_page_locale);

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

            title: translation.website_page_title,

            slug: translation.website_page_slug,

            excerpt: translation.website_page_excerpt ?? '',

            content: translation.website_page_content ?? '',

            meta_title: translation.website_page_meta_title ?? '',

            meta_description: translation.website_page_meta_description ?? '',

            meta_keywords: translation.website_page_meta_keywords ?? '',

            meta_robots: translation.website_page_meta_robots ?? 'index,follow',

            canonical_url: translation.website_page_canonical_url ?? '',

            og_title: translation.website_page_og_title ?? '',

            og_description: translation.website_page_og_description ?? '',

            status: translation.website_page_i18n_status,
          },
          {
            emitEvent: false,
          },
        );

        this.homeSectionVisibility[locale] = readHomeSectionVisibility(
          translation.website_page_content_json,
        );

        this.homeLatexContent[locale] = readHomeLatexContent(
          locale,
          translation.website_page_content_json,
        );
        this.homeAdvertisementContent[locale] = readHomeAdvertisementContent(
          locale,
          translation.website_page_content_json,
        );

        this.aboutFeatures[locale] = readAboutFeatures(
          translation.website_page_content_json,
        );
      });

      const defaultLocale =
        parseLocale(data.website_page_default_locale) ?? 'id-ID';

      this.enableLanguage(defaultLocale);

      this.activeLocale = defaultLocale;

      //==================================================
      //==== PATCH MEDIA
      //==================================================

      this.pageMedia = data.attachments.map((item) => {
        const translations = createEmptyMediaTranslations();

        item.translations.forEach((translation) => {
          const locale = parseLocale(
            translation.website_page_attachment_locale,
          );

          if (!locale) {
            return;
          }

          translations[locale] = {
            caption: translation.website_page_attachment_caption ?? '',
            alt_text: translation.website_page_attachment_alt_text ?? '',
          };
        });

        return {
          attachment: item,

          role:
            this.isGadgetHomeTemplate &&
            item.website_page_attachment_role === 'hero'
              ? 'home_main'
              : this.isAboutTemplate &&
                  item.website_page_attachment_role === 'hero'
                ? 'about_content'
                : item.website_page_attachment_role || 'gallery',

          is_public: item.website_page_attachment_is_public === 1,

          action_type: item.website_page_attachment_action_type ?? 'none',

          action_value: item.website_page_attachment_action_value ?? '',

          translations,
        };
      });

      //==================================================
      //==== PATCH PUBLICATION
      //==================================================

      this.publication.publicationChoice = 'current';
      this.publication.patchPublicationDateTime(
        'publish',
        data.website_page_publish_at,
      );

      this.publication.patchPublicationDateTime(
        'unpublish',
        data.website_page_unpublish_at,
      );

      this.publication.publicationValidationAttempted = false;
    });
  }

  //==================================================
  //==== SYSTEM PAGE
  //==================================================

  get isSystemPage(): boolean {
    return (
      this.mode() === 'edit' && this.editData()?.website_page_is_system === 1
    );
  }

  get canViewAttachments(): boolean {
    return hasPermissionAccess(
      'attachment.view',
      this.store.selectSnapshot(AuthState.permissions) ?? [],
      this.store.selectSnapshot(AuthState.isAllAccess) === true,
    );
  }

  get isGadgetHomeTemplate(): boolean {
    const template = this.form.controls.website_page_template.value;
    return template === 'home' || template === 'gadget-home-v1';
  }

  get isAboutTemplate(): boolean {
    return this.form.controls.website_page_key.value === 'about';
  }

  aboutHighlightIssue(
    locale: WebsitePageEditorLocale,
    index: number,
  ): string | null {
    if (!this.isAboutTemplate) return null;

    const highlight = this.aboutFeatures[locale][index];
    const title = highlight?.title.trim() ?? '';
    const description = highlight?.description.trim() ?? '';

    if (Boolean(title) !== Boolean(description)) {
      return 'website_page.validation.about_highlight_pair_required';
    }
    if (title.length > ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH) {
      return 'website_page.validation.about_highlight_title_max_length';
    }
    if (description.length > ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH) {
      return 'website_page.validation.about_highlight_description_max_length';
    }

    return null;
  }

  firstInvalidAboutLocale(): WebsitePageEditorLocale | null {
    if (!this.isAboutTemplate) return null;

    for (const language of this.supportedLanguages) {
      if (
        this.isLanguageEnabled(language.locale) &&
        this.aboutFeatures[language.locale].some((_, index) =>
          Boolean(this.aboutHighlightIssue(language.locale, index)),
        )
      ) {
        return language.locale;
      }
    }

    return null;
  }

  //==================================================
  //==== LANGUAGE
  //==================================================

  translationForm(locale: WebsitePageEditorLocale) {
    return this.form.controls.translations.controls[locale];
  }

  isLanguageEnabled(locale: WebsitePageEditorLocale): boolean {
    return this.translationForm(locale).enabled;
  }

  isDefaultLocale(locale: WebsitePageEditorLocale): boolean {
    return this.form.controls.website_page_default_locale.value === locale;
  }

  selectLanguage(locale: WebsitePageEditorLocale): void {
    this.activeLocale = locale;
  }

  assistPageField(
    field: 'excerpt' | 'content' | 'meta_description' | 'og_description',
  ): void {
    if (this.assistingPageField) return;
    const locale = this.activeLocale;
    const group = this.translationForm(locale);
    const value = group.getRawValue();
    const translateFromIndonesia = locale === 'en-US';
    this.assistingPageField = field;
    this.contentAssistant
      .assist({
        mode: translateFromIndonesia ? 'translate' : 'generate',
        content_type: this.isGadgetHomeTemplate ? 'home page' : 'website page',
        source_locale: translateFromIndonesia ? 'id-ID' : undefined,
        target_locale: locale,
        context: JSON.stringify({
          user_written_title: value.title,
          page_key: this.form.controls.website_page_key.value,
        }),
        fields: {
          [field]: translateFromIndonesia
            ? this.translationForm('id-ID').getRawValue()[field]
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

  enableLanguage(locale: WebsitePageEditorLocale): void {
    this.translationForm(locale).enable({
      emitEvent: false,
    });
  }

  resetTranslationForm(locale: WebsitePageEditorLocale): void {
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

  //==================================================
  //==== TRANSLATION SLUG
  //==================================================

  //==================================================
  //==== NEXT SEO
  //==================================================

  //==================================================
  //==== SEO PREVIEW
  //==================================================

  //==================================================
  //==== NEXT MEDIA
  //==================================================

  //==================================================
  //==== MEDIA
  //==================================================

  get gadgetHomeMissingMediaRules(): readonly GadgetHomeMediaRule[] {
    if (!this.isGadgetHomeTemplate) return [];

    const assignedRoles = new Set(
      this.pageMedia
        .filter((media) => media.is_public)
        .map((media) => media.role),
    );

    return GADGET_HOME_MEDIA_RULES.filter(
      (rule) => rule.required && !assignedRoles.has(rule.value),
    );
  }

  get gadgetHomeMediaHasInvalidFiles(): boolean {
    return (
      this.isGadgetHomeTemplate &&
      this.pageMedia.some((media) => gadgetHomeMediaIssue(media) !== null)
    );
  }

  get gadgetHomeMediaHasInvalidActions(): boolean {
    return (
      this.isGadgetHomeTemplate &&
      this.pageMedia.some((media) => gadgetHomeMediaActionIssue(media) !== null)
    );
  }

  get gadgetHomeRequiresCompleteMedia(): boolean {
    if (!this.isGadgetHomeTemplate) return false;

    return ['published', 'scheduled'].includes(
      this.publication.previewEffectiveStatus(),
    );
  }

  get gadgetHomeMediaBlocksSave(): boolean {
    return (
      this.gadgetHomeMediaHasInvalidFiles ||
      this.gadgetHomeMediaHasInvalidActions ||
      (this.gadgetHomeRequiresCompleteMedia &&
        this.gadgetHomeMissingMediaRules.length > 0)
    );
  }

  get aboutContentMedia(): WebsitePageEditorMediaDraft | null {
    return (
      this.pageMedia.find(
        (media) => media.role === 'about_content' && media.is_public,
      ) ?? null
    );
  }

  get aboutRequiresCompleteMedia(): boolean {
    return (
      this.isAboutTemplate &&
      ['published', 'scheduled'].includes(
        this.publication.previewEffectiveStatus(),
      )
    );
  }

  get aboutContentMediaFileInvalid(): boolean {
    return Boolean(
      this.aboutContentMedia &&
      !this.pageMediaAccept.includes(
        this.aboutContentMedia.attachment.mime_type,
      ),
    );
  }

  aboutContentMediaAltMissing(locale: WebsitePageEditorLocale): boolean {
    return Boolean(
      this.aboutContentMedia &&
      this.isLanguageEnabled(locale) &&
      this.translationForm(locale).controls.status.value === 1 &&
      !this.aboutContentMedia.translations[locale].alt_text.trim(),
    );
  }

  get aboutMediaBlocksSave(): boolean {
    if (!this.aboutRequiresCompleteMedia) return false;

    return (
      !this.aboutContentMedia ||
      this.aboutContentMediaFileInvalid ||
      this.supportedLanguages.some((language) =>
        this.aboutContentMediaAltMissing(language.locale),
      )
    );
  }

  //==================================================
  //==== PUBLICATION
  //==================================================

  get defaultTranslationPublished(): boolean {
    const locale =
      parseLocale(this.form.controls.website_page_default_locale.value) ??
      'id-ID';

    return this.translationForm(locale).controls.status.value === 1;
  }

  //==================================================
  //==== PREVIEW NAVIGATION
  //==================================================

  onNavChange(event: NgbNavChangeEvent): void {
    if (event.nextId !== 'preview') {
      return;
    }

    this.publication.publicationValidationAttempted = true;
    this.mediaValidationAttempted = true;

    const invalidAboutLocale = this.firstInvalidAboutLocale();
    if (invalidAboutLocale) {
      event.preventDefault();
      this.activeLocale = invalidAboutLocale;
      this.activeTab = 'content';
      return;
    }

    if (this.aboutMediaBlocksSave || this.gadgetHomeMediaBlocksSave) {
      event.preventDefault();
      this.activeTab = 'media';
      return;
    }

    if (
      this.publication.publicationRequiresPublishedTranslation &&
      !this.defaultTranslationPublished
    ) {
      event.preventDefault();

      this.activeTab = 'publication';

      return;
    }

    if (
      this.publication.publicationScheduleInvalid ||
      this.publication.publicationEndInvalid
    ) {
      event.preventDefault();

      this.activeTab = 'publication';

      return;
    }

    this.refreshPreviewPage();
  }

  //==================================================
  //==== PREVIEW PAGE
  //==================================================

  refreshPreviewPage(): void {
    this.previewPage = this.buildPreviewPage();
  }

  private buildPreviewPage(): IWebsitePageEditorDetail {
    const raw = this.form.getRawValue();

    const source = this.editData();

    const now = new Date().toISOString();

    const translations: IWebsitePageEditorTranslation[] =
      this.supportedLanguages
        .filter((language) => this.isLanguageEnabled(language.locale))
        .map((language) => {
          const group = this.translationForm(language.locale);

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

            website_page_content_json: this.isGadgetHomeTemplate
              ? buildHomeContentJson(
                  existing?.website_page_content_json,
                  this.homeSectionVisibility[language.locale],
                  this.homeLatexContent[language.locale],
                  this.homeAdvertisementContent[language.locale],
                )
              : this.isAboutTemplate
                ? buildAboutContentJson(this.aboutFeatures[language.locale])
                : (existing?.website_page_content_json ?? null),

            website_page_meta_title: value.meta_title.trim() || null,

            website_page_meta_description:
              value.meta_description.trim() || null,

            website_page_meta_keywords: value.meta_keywords.trim() || null,

            website_page_meta_robots: value.meta_robots.trim() || null,

            website_page_canonical_url: value.canonical_url.trim() || null,

            website_page_og_title: value.og_title.trim() || null,

            website_page_og_description: value.og_description.trim() || null,

            website_page_schema_json:
              existing?.website_page_schema_json ?? null,

            website_page_i18n_status: value.status,

            created: existing?.created ?? now,

            updated: now,
          };
        });

    const attachments: IWebsitePageEditorAttachment[] = this.pageMedia.map(
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

          translations: this.supportedLanguages
            .filter((language) => this.isLanguageEnabled(language.locale))
            .map((language) => {
              const existingTranslation = existing?.translations.find(
                (translation) =>
                  translation.website_page_attachment_locale ===
                  language.locale,
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
  //==== PREVIEW STATUS
  //==================================================

  //==================================================
  //==== PREVIEW SUMMARY
  //==================================================

  //==================================================
  //==== SAVE
  //==================================================

  submitForm(): void {
    this.publication.publicationValidationAttempted = true;
    this.mediaValidationAttempted = true;

    const invalidFormSection = this.firstInvalidFormSection();

    if (invalidFormSection) {
      this.activeTab = invalidFormSection.tab;

      if (invalidFormSection.locale) {
        this.activeLocale = invalidFormSection.locale;
      }

      this.notification.showError(
        'Pengaturan halaman belum lengkap. Periksa field yang ditandai merah.',
      );
      this.formIssues.focusFirstInvalid();

      return;
    }

    if (this.gadgetHomeMediaBlocksSave || this.aboutMediaBlocksSave) {
      this.activeTab = 'media';

      this.notification.showError(
        'Media wajib belum lengkap atau ukurannya belum sesuai slot.',
      );
      this.formIssues.focusFirstInvalid();

      return;
    }

    if (
      this.publication.publicationRequiresPublishedTranslation &&
      !this.defaultTranslationPublished
    ) {
      this.activeTab = 'publication';

      this.notification.showError(
        'Publikasikan bahasa utama terlebih dahulu sebelum menerapkan status halaman.',
      );
      this.formIssues.focusFirstInvalid();

      return;
    }

    if (
      this.publication.publicationScheduleInvalid ||
      this.publication.publicationEndInvalid
    ) {
      this.activeTab = 'publication';

      this.notification.showError(
        'Tanggal atau waktu publikasi belum lengkap atau tidak valid.',
      );
      this.formIssues.focusFirstInvalid();

      return;
    }

    const page = this.buildPreviewPage();

    const payload: IWebsitePageEditorPayload = {
      id_parent_website_page: page.id_parent_website_page,

      website_page_key: page.website_page_key,

      website_page_type: page.website_page_type,

      website_page_template: page.website_page_template,

      website_page_content_mode: page.website_page_content_mode,

      website_page_default_locale: page.website_page_default_locale,

      // Base save tidak mengubah lifecycle.
      website_page_status:
        this.mode() === 'edit'
          ? (this.editData()?.website_page_status ?? 0)
          : 0,

      website_page_visibility: page.website_page_visibility,

      website_page_is_system: page.website_page_is_system,

      website_page_is_featured: page.website_page_is_featured,

      website_page_sort_order: page.website_page_sort_order,

      website_page_publish_at:
        this.mode() === 'edit'
          ? (this.editData()?.website_page_publish_at ?? null)
          : null,

      website_page_unpublish_at:
        this.mode() === 'edit'
          ? (this.editData()?.website_page_unpublish_at ?? null)
          : null,

      website_page_settings_json:
        this.editData()?.website_page_settings_json ?? null,

      translations: page.translations.map((translation) => ({
        locale: translation.website_page_locale,

        slug: translation.website_page_slug,

        title: translation.website_page_title,

        excerpt: translation.website_page_excerpt,

        content: translation.website_page_content,

        content_json: translation.website_page_content_json,

        meta_title: translation.website_page_meta_title,

        meta_description: translation.website_page_meta_description,

        meta_keywords: translation.website_page_meta_keywords,

        meta_robots: translation.website_page_meta_robots,

        canonical_url: translation.website_page_canonical_url,

        og_title: translation.website_page_og_title,

        og_description: translation.website_page_og_description,

        schema_json: translation.website_page_schema_json,

        status: translation.website_page_i18n_status,
      })),

      attachments: page.attachments.map((attachment) => ({
        id_attachment: attachment.id_attachment,

        role: attachment.website_page_attachment_role,

        sort_order: attachment.website_page_attachment_sort_order,

        is_public: attachment.website_page_attachment_is_public,

        action_type: attachment.website_page_attachment_action_type,

        action_value: attachment.website_page_attachment_action_value,

        translations: attachment.translations.map((translation) => ({
          locale: translation.website_page_attachment_locale,

          caption: translation.website_page_attachment_caption,

          alt_text: translation.website_page_attachment_alt_text,
        })),
      })),
    };

    this.submitted?.emit({
      payload,

      publicationActions: this.publication.buildPublicationActions(),
    });
  }

  showServerIssue(code: string): void {
    if (code === 'WEBSITE_PAGE_CONFLICT') {
      this.activeTab = 'content';
      this.activeLocale = 'id-ID';
      const control = this.translationForm('id-ID').controls.slug;
      control.setErrors({ ...(control.errors ?? {}), duplicate: true });
      this.formIssues.focusFirstInvalid('slug');
      return;
    }
    this.form.markAllAsTouched();
    const invalid = this.firstInvalidFormSection();
    if (invalid) {
      this.activeTab = invalid.tab;
      if (invalid.locale) this.activeLocale = invalid.locale;
    }
    this.formIssues.focusFirstInvalid();
  }

  private firstInvalidFormSection(): {
    tab: 'general' | 'content' | 'seo';
    locale?: WebsitePageEditorLocale;
  } | null {
    this.form.markAllAsTouched();

    const controls = this.form.controls;
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

    for (const language of this.supportedLanguages) {
      const group = this.translationForm(language.locale);

      if (group.disabled) {
        continue;
      }

      if (group.controls.title.invalid || group.controls.slug.invalid) {
        return { tab: 'content', locale: language.locale };
      }

      if (
        this.isAboutTemplate &&
        this.aboutFeatures[language.locale].some((_, index) =>
          Boolean(this.aboutHighlightIssue(language.locale, index)),
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

  //==================================================
  //==== DATETIME INPUT
  //==================================================

  //==================================================
  //==== NORMALIZE KEY
  //==================================================

  //==================================================
  //==== NEXT
  //==================================================
}
