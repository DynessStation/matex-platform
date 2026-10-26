import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';

import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import {
  WebsitePageEditorLocale,
  HomeSectionVisibility,
  HomeLatexContentDraft,
  HomeAdvertisementDraft,
  HomeLatexFeatureDraft,
  AboutFeatureDraft,
  ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH,
  ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH,
  WebsitePageEditorMediaDraft,
  PAGE_MEDIA_ACCEPT,
  HOME_TAG_LABEL_MAX_LENGTH,
  HOME_TAG_LIMIT,
  HomeTagDraft,
} from './website-page-form.model';
import {
  createHomeSectionVisibility,
  readHomeSectionVisibility,
  createHomeLatexContent,
  readHomeLatexContent,
  createHomeAdvertisementContent,
  readHomeAdvertisementContent,
  createAboutFeatures,
  readAboutFeatures,
  mediaDraftsFromDetail,
  parseLocale,
  gadgetHomeMediaIssue,
  gadgetHomeMediaActionIssue,
  readHomeTags,
} from './website-page-form.util';
import { WebsitePagePublicationService } from './website-page-publication.service';
import {
  GADGET_HOME_MEDIA_RULES,
  GadgetHomeMediaRule,
} from '../../../shared/data/gadget-home-media';
import {
  WebsitePageEditorI18nStatus,
  IWebsitePageEditorDetail,
} from '../../../shared/interface/website-page-editor.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { LocalizationService } from '../../../shared/services/localization.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthState } from '../../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../../shared/utils/permission.util';

// State and logic of the fixed website page form, shared by the form and its tabs. The
// preview/save flow is in WebsitePageSaveService and the writing help in
// WebsitePageAssistantService. Provided by WebsitePageForm, one instance per open form.
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
  readonly publication = inject(WebsitePagePublicationService);

  //==================================================
  //==== INPUT
  //==================================================

  // Bound to the form's inputs and output in connect().
  editData: Signal<IWebsitePageEditorDetail | null> = signal(null);

  saving: Signal<boolean> = signal(false);

  connect(form: {
    editData: Signal<IWebsitePageEditorDetail | null>;
    saving: Signal<boolean>;
  }): void {
    this.editData = form.editData;
    this.saving = form.saving;
    this.publication.connect(form);
  }

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  public activeLocale: WebsitePageEditorLocale = 'id-ID';

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

  /** "Tag populer" (P-2): one list for both languages, at most HOME_TAG_LIMIT. */
  public homeTags: HomeTagDraft[] = [];

  public homeTagsValidationAttempted = false;

  readonly homeTagLimit = HOME_TAG_LIMIT;

  readonly homeTagLabelMaxLength = HOME_TAG_LABEL_MAX_LENGTH;

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

      this.homeTags = readHomeTags(
        data.translations.find(
          (item) => parseLocale(item.website_page_locale) === 'id-ID',
        )?.website_page_content_json,
        data.translations.find(
          (item) => parseLocale(item.website_page_locale) === 'en-US',
        )?.website_page_content_json,
      );
      this.homeTagsValidationAttempted = false;

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

      this.pageMedia = mediaDraftsFromDetail(data.attachments, {
        gadgetHome: this.isGadgetHomeTemplate,
        about: this.isAboutTemplate,
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
    return this.editData()?.website_page_is_system === 1;
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
  //==== HOME AND ABOUT DRAFTS
  //==================================================

  addHomeTag(): void {
    if (this.homeTags.length >= HOME_TAG_LIMIT) return;
    this.homeTags = [
      ...this.homeTags,
      { label_id: '', label_en: '', type: 'category', category_id: '' },
    ];
  }

  updateHomeTag(index: number, changes: Partial<HomeTagDraft>): void {
    this.homeTags = this.homeTags.map((tag, i) =>
      i === index ? { ...tag, ...changes } : tag,
    );
  }

  moveHomeTag(index: number, step: -1 | 1): void {
    const tags = [...this.homeTags];
    const [tag] = tags.splice(index, 1);
    tags.splice(index + step, 0, tag);
    this.homeTags = tags;
  }

  removeHomeTag(index: number): void {
    this.homeTags = this.homeTags.filter((_, i) => i !== index);
  }

  /** A tag misses a text in either language, or its category. */
  homeTagIncomplete(tag: HomeTagDraft): boolean {
    return (
      !tag.label_id.trim() ||
      !tag.label_en.trim() ||
      (tag.type === 'category' && !tag.category_id)
    );
  }

  get homeTagsInvalid(): boolean {
    return (
      this.isGadgetHomeTemplate &&
      this.homeTags.some((tag) => this.homeTagIncomplete(tag))
    );
  }

  updateHomeLatexItem(
    locale: WebsitePageEditorLocale,
    index: number,
    field: keyof HomeLatexFeatureDraft,
    value: string,
  ): void {
    const items = [...this.homeLatexContent[locale].items];
    items[index] = { ...items[index], [field]: value };
    this.homeLatexContent = {
      ...this.homeLatexContent,
      [locale]: { ...this.homeLatexContent[locale], items },
    };
  }

  updateAboutFeature(
    locale: WebsitePageEditorLocale,
    index: number,
    field: keyof AboutFeatureDraft,
    value: string,
  ): void {
    this.aboutFeatures[locale][index] = {
      ...this.aboutFeatures[locale][index],
      [field]: value,
    };
    this.aboutFeatures = { ...this.aboutFeatures };
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

  gadgetHomeMediaAssigned(role: string): boolean {
    return this.pageMedia.some(
      (media) => media.is_public && media.role === role,
    );
  }

  gadgetHomeMediaForRole(role: string): WebsitePageEditorMediaDraft | null {
    return this.pageMedia.find((media) => media.role === role) ?? null;
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
}
