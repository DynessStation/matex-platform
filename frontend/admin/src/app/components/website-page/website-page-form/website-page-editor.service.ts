import {
  afterNextRender,
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

import {
  NgbDateStruct,
  NgbNavChangeEvent,
  NgbTimeStruct,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Editor, Toolbar } from 'ngx-editor';
import { finalize } from 'rxjs';

import {
  WebsitePageEditorLocale,
  WebsitePageEditorPublicationChoice,
  HomeSectionKey,
  HomeSectionVisibility,
  HomeLatexFeatureDraft,
  HomeLatexContentDraft,
  HomeAdvertisementDraft,
  AboutFeatureDraft,
  ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH,
  ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH,
  WebsitePageEditorMediaTranslationDraft,
  WebsitePageEditorMediaDraft,
  PAGE_MEDIA_ACCEPT,
  GADGET_HOME_MEDIA_ROLES,
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
  createMediaDraft,
  sortGadgetHomeMedia,
  gadgetHomeMediaRequirement,
  gadgetHomeMediaIssue,
  gadgetHomeAttachmentIssue,
  gadgetHomeMediaActionIssue,
  toAttachmentArray,
  toPreviewIso,
  previewLanguageLabelKey,
  previewVisibilityKey,
  toLocalDateTimeInput,
  publicationDateValue,
  composePublicationDateTime,
  dateToNgbDate,
} from './website-page-form.util';
import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';
import { MediaModal } from '../../../shared/components/ui/modal/media-modal/media-modal';
import {
  GADGET_HOME_MEDIA_RULES,
  GadgetHomeMediaRule,
  getGadgetHomeMediaRule,
} from '../../../shared/data/gadget-home-media';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  WebsitePageEditorEffectiveStatus,
  WebsitePageEditorI18nStatus,
  WebsitePageEditorStatus,
  IWebsitePageEditorAttachment,
  IWebsitePageEditorDetail,
  IWebsitePageEditorTranslation,
  IWebsitePageEditorPayload,
  IWebsitePageEditorPublicationPayload,
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
  private readonly translate = inject(TranslateService);
  private readonly contentAssistant = inject(ContentAssistantService);
  private readonly notification = inject(NotificationService);
  private readonly formIssues = inject(FormIssueNavigatorService);

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
    mediaModal: Signal<MediaModal | undefined>;
  }): void {
    this.mode = form.mode;
    this.editData = form.editData;
    this.saving = form.saving;
    this.submitted = form.submitted;
    this.mediaModal = form.mediaModal;
  }

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  public activeLocale: WebsitePageEditorLocale = 'id-ID';
  public assistingPageField: string | null = null;
  public assistingOrganizerField: string | null = null;

  //==================================================
  //==== PREVIEW
  //==================================================

  public previewPage: IWebsitePageEditorDetail | null = null;

  //==================================================
  //==== MEDIA
  //==================================================

  mediaModal: Signal<MediaModal | undefined> = signal(undefined);

  public pageMedia: WebsitePageEditorMediaDraft[] = [];

  public readonly pageMediaAccept = PAGE_MEDIA_ACCEPT;

  public mediaValidationAttempted = false;

  public activeHomeMediaRole: string | null = null;

  //==================================================
  //==== PUBLICATION
  //==================================================

  public publicationChoice: WebsitePageEditorPublicationChoice =
    this.mode() === 'edit' ? 'current' : 'draft';

  public publicationPublishAt = '';

  public publicationUnpublishAt = '';

  public publicationValidationAttempted = false;

  public publicationPublishDate: NgbDateStruct | null = null;

  public publicationPublishTime: NgbTimeStruct | null = null;

  public publicationUnpublishDate: NgbDateStruct | null = null;

  public publicationUnpublishTime: NgbTimeStruct | null = null;

  //==================================================
  //==== CONTENT EDITOR
  //==================================================

  public readonly contentEditor = signal<Editor | null>(null);

  public readonly contentEditorToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],

    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],

    ['ordered_list', 'bullet_list'],

    ['blockquote', 'horizontal_rule'],

    ['link'],

    ['align_left', 'align_center', 'align_right', 'align_justify'],

    ['format_clear'],
  ];

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

  public readonly gadgetHomeMediaRules = GADGET_HOME_MEDIA_RULES;

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

  public readonly gadgetHomeMediaRoles = GADGET_HOME_MEDIA_ROLES;

  // Pure helpers the template calls.
  readonly gadgetHomeMediaRequirement = gadgetHomeMediaRequirement;
  readonly gadgetHomeMediaIssue = gadgetHomeMediaIssue;
  readonly gadgetHomeMediaActionIssue = gadgetHomeMediaActionIssue;
  readonly previewLanguageLabelKey = previewLanguageLabelKey;
  readonly previewVisibilityKey = previewVisibilityKey;
  readonly publicationDateValue = publicationDateValue;
  readonly gadgetHomeMediaRule = getGadgetHomeMediaRule;

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
    afterNextRender(() => {
      this.contentEditor.set(new Editor());
    });

    this.destroyRef.onDestroy(() => {
      this.contentEditor()?.destroy();
    });

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

      this.publicationChoice = 'current';
      this.patchPublicationDateTime('publish', data.website_page_publish_at);

      this.patchPublicationDateTime(
        'unpublish',
        data.website_page_unpublish_at,
      );

      this.publicationValidationAttempted = false;
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

  get isMetadataOnlyFixedPage(): boolean {
    return (
      this.isSystemPage &&
      ['contact', 'faq', 'terms', 'career'].includes(
        this.form.controls.website_page_key.value,
      )
    );
  }

  get isOperationalDataPage(): boolean {
    return (
      this.isSystemPage &&
      ['contact', 'faq'].includes(this.form.controls.website_page_key.value)
    );
  }

  get operationalDataHelpKey(): string {
    return this.form.controls.website_page_key.value === 'contact'
      ? 'website_page.operational_contact_help'
      : 'website_page.operational_faq_help';
  }

  get mediaRoleOptions(): { value: string; label: string }[] {
    if (this.isGadgetHomeTemplate) return this.gadgetHomeMediaRoles;

    if (this.isAboutTemplate) {
      return [
        { value: 'about_content', label: 'Gambar konten Tentang MATEX' },
        { value: 'og', label: 'Open Graph / share image' },
      ];
    }

    if (this.isMetadataOnlyFixedPage) {
      return [{ value: 'og', label: 'Open Graph / share image' }];
    }

    return [
      { value: 'hero', label: 'Hero image' },
      { value: 'gallery', label: 'Gallery' },
      { value: 'og', label: 'Open Graph / share image' },
    ];
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

  private firstInvalidAboutLocale(): WebsitePageEditorLocale | null {
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

  assistOrganizerDescription(
    kind: 'latex' | 'latex_item' | 'advertisement' | 'about_item',
    index = 0,
  ): void {
    if (this.assistingOrganizerField) return;
    const locale = this.activeLocale;
    const sourceLocale: WebsitePageEditorLocale = 'id-ID';
    const translateFromIndonesia = locale === 'en-US';
    const taskKey = `${kind}-${index}`;
    let current = '';
    let source = '';
    let userWrittenTitle = '';

    if (kind === 'latex') {
      current = this.homeLatexContent[locale].description;
      source = this.homeLatexContent[sourceLocale].description;
      userWrittenTitle = this.homeLatexContent[locale].title;
    } else if (kind === 'latex_item') {
      current = this.homeLatexContent[locale].items[index]?.description || '';
      source =
        this.homeLatexContent[sourceLocale].items[index]?.description || '';
      userWrittenTitle =
        this.homeLatexContent[locale].items[index]?.title || '';
    } else if (kind === 'advertisement') {
      current = this.homeAdvertisementContent[locale].description;
      source = this.homeAdvertisementContent[sourceLocale].description;
      userWrittenTitle = this.homeAdvertisementContent[locale].title;
    } else {
      current = this.aboutFeatures[locale][index]?.description || '';
      source = this.aboutFeatures[sourceLocale][index]?.description || '';
      userWrittenTitle = this.aboutFeatures[locale][index]?.title || '';
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
            this.homeLatexContent[locale].description = description;
          } else if (kind === 'latex_item') {
            this.updateHomeLatexItem(locale, index, 'description', description);
          } else if (kind === 'advertisement') {
            this.homeAdvertisementContent[locale].description = description;
          } else {
            this.updateAboutFeature(locale, index, 'description', description);
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

  private showContentAssistantError(error: any): void {
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

  addLanguage(locale: WebsitePageEditorLocale): void {
    this.enableLanguage(locale);

    this.activeLocale = locale;
  }

  removeLanguage(locale: WebsitePageEditorLocale): void {
    if (this.isDefaultLocale(locale)) {
      return;
    }

    this.resetTranslationForm(locale);

    this.translationForm(locale).disable({
      emitEvent: false,
    });

    if (this.activeLocale === locale) {
      const defaultLocale =
        parseLocale(this.form.controls.website_page_default_locale.value) ??
        'id-ID';

      this.activeLocale = defaultLocale;
    }
  }

  private resetTranslationForm(locale: WebsitePageEditorLocale): void {
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

  generateTranslationSlug(locale: WebsitePageEditorLocale): void {
    const group = this.translationForm(locale);

    if (group.controls.slug.value.trim()) {
      return;
    }

    group.controls.slug.setValue(slugify(group.controls.title.value));
  }

  normalizeTranslationSlug(locale: WebsitePageEditorLocale): void {
    const control = this.translationForm(locale).controls.slug;

    control.setValue(slugify(control.value));
  }

  //==================================================
  //==== NEXT SEO
  //==================================================

  goToSeo(): void {
    const invalidAboutLocale = this.firstInvalidAboutLocale();
    if (invalidAboutLocale) {
      this.activeLocale = invalidAboutLocale;
      this.activeTab = 'content';
      return;
    }

    let invalidLocale: WebsitePageEditorLocale | null = null;

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

  //==================================================
  //==== NEXT MEDIA
  //==================================================

  goToPublication(): void {
    this.activeTab = 'publication';
  }

  //==================================================
  //==== MEDIA
  //==================================================

  openMedia(): void {
    this.activeHomeMediaRole = null;
    void this.mediaModal()?.openModal();
  }

  openHomeMedia(rule: GadgetHomeMediaRule): void {
    this.activeHomeMediaRole = rule.value;
    const current = this.gadgetHomeMediaForRole(rule.value);
    const disabledSelectionIds = this.pageMedia
      .filter((media) => media.role !== rule.value)
      .map((media) => media.attachment.id_attachment);

    void this.mediaModal()?.openModal({
      selection: current?.attachment ?? null,
      title: `Pilih gambar · ${rule.label}`,
      description: gadgetHomeMediaRequirement(rule),
      multiple: false,
      maxSelection: 1,
      disabledSelectionIds,
      validateSelection: (attachment) =>
        gadgetHomeAttachmentIssue(attachment, rule),
    });
  }

  openHomeOgMedia(): void {
    const role = 'og';
    this.activeHomeMediaRole = role;
    const current = this.gadgetHomeMediaForRole(role);
    const disabledSelectionIds = this.pageMedia
      .filter((media) => media.role !== role)
      .map((media) => media.attachment.id_attachment);

    void this.mediaModal()?.openModal({
      selection: current?.attachment ?? null,
      title: this.translate.instant('website_page.home_media_og_title'),
      description: this.translate.instant(
        'website_page.home_media_og_requirement',
      ),
      multiple: false,
      maxSelection: 1,
      disabledSelectionIds,
      validateSelection: (attachment) =>
        this.pageMediaAccept.includes(attachment.mime_type)
          ? null
          : this.translate.instant('website_page.home_media_format_error'),
    });
  }

  get selectedMedia(): IAttachment[] {
    if (this.isGadgetHomeTemplate && this.activeHomeMediaRole) {
      const current = this.gadgetHomeMediaForRole(this.activeHomeMediaRole);
      return current ? [current.attachment] : [];
    }

    return this.pageMedia.map((item) => item.attachment);
  }

  selectMedia(selection: MediaSelection): void {
    if (this.isGadgetHomeTemplate && this.activeHomeMediaRole) {
      const [attachment] = toAttachmentArray(selection);
      if (!attachment) return;

      const role = this.activeHomeMediaRole;
      const currentIndex = this.pageMedia.findIndex(
        (media) => media.role === role,
      );

      if (currentIndex >= 0) {
        this.pageMedia[currentIndex] = {
          ...this.pageMedia[currentIndex],
          attachment,
        };
      } else {
        this.pageMedia.push(createMediaDraft(attachment, role));
      }

      this.pageMedia = sortGadgetHomeMedia(this.pageMedia);
      this.activeHomeMediaRole = null;
      return;
    }

    const selected = this.isGadgetHomeTemplate
      ? toAttachmentArray(selection).slice(0, this.gadgetHomeMediaRoles.length)
      : toAttachmentArray(selection);

    const oldMap = new Map(
      this.pageMedia.map((item) => [item.attachment.id_attachment, item]),
    );

    const assignedRoles = new Set(
      selected
        .map((attachment) => oldMap.get(attachment.id_attachment)?.role)
        .filter((role): role is string => Boolean(role)),
    );

    this.pageMedia = selected.map((attachment) => {
      const existing = oldMap.get(attachment.id_attachment);

      if (existing) {
        return existing;
      }

      const role = this.isGadgetHomeTemplate
        ? (this.gadgetHomeMediaRoles.find(
            (option) => !assignedRoles.has(option.value),
          )?.value ?? this.gadgetHomeMediaRoles[0].value)
        : this.isAboutTemplate
          ? assignedRoles.has('about_content')
            ? 'og'
            : 'about_content'
          : this.isMetadataOnlyFixedPage
            ? 'og'
            : assignedRoles.has('hero')
              ? 'gallery'
              : 'hero';

      assignedRoles.add(role);

      return createMediaDraft(attachment, role);
    });
  }

  setHero(index: number): void {
    this.pageMedia = this.pageMedia.map((item, currentIndex) => ({
      ...item,

      role: currentIndex === index ? 'hero' : 'gallery',
    }));
  }

  updateMediaRole(index: number, role: string): void {
    if (this.isGadgetHomeTemplate) {
      if (!this.gadgetHomeMediaRoles.some((option) => option.value === role)) {
        return;
      }

      const previousRole = this.pageMedia[index]?.role;

      this.pageMedia = this.pageMedia.map((item, currentIndex) => {
        if (currentIndex === index) return { ...item, role };
        if (item.role === role && previousRole) {
          return { ...item, role: previousRole };
        }
        return item;
      });

      return;
    }

    const uniqueRole = role !== 'gallery';

    this.pageMedia = this.pageMedia.map((item, currentIndex) => {
      if (currentIndex === index) return { ...item, role };
      if (uniqueRole && item.role === role) return { ...item, role: 'gallery' };
      return item;
    });
  }

  updateMediaActionType(
    index: number,
    actionType: 'none' | 'internal' | 'external' | 'product' | 'category',
  ): void {
    this.pageMedia[index] = {
      ...this.pageMedia[index],
      action_type: actionType,
      action_value:
        actionType === 'none' ? '' : this.pageMedia[index].action_value,
    };
    this.pageMedia = [...this.pageMedia];
  }

  updateMediaActionValue(index: number, actionValue: string): void {
    this.pageMedia[index] = {
      ...this.pageMedia[index],
      action_value: actionValue,
    };
    this.pageMedia = [...this.pageMedia];
  }

  mediaRoleLabel(role: string): string {
    return (
      this.mediaRoleOptions.find((option) => option.value === role)?.label ??
      role
    );
  }

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

  gadgetHomeMediaAssigned(role: string): boolean {
    return this.pageMedia.some(
      (media) => media.is_public && media.role === role,
    );
  }

  gadgetHomeMediaForRole(role: string): WebsitePageEditorMediaDraft | null {
    return this.pageMedia.find((media) => media.role === role) ?? null;
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

    return ['published', 'scheduled'].includes(this.previewEffectiveStatus());
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
      ['published', 'scheduled'].includes(this.previewEffectiveStatus())
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

  removeMedia(index: number): void {
    const wasHero = this.pageMedia[index]?.role === 'hero';

    this.pageMedia.splice(index, 1);

    this.pageMedia = [...this.pageMedia];

    if (wasHero && this.pageMedia.length && !this.isGadgetHomeTemplate) {
      this.setHero(0);
    }
  }

  moveMedia(index: number, direction: -1 | 1): void {
    const target = index + direction;

    if (target < 0 || target >= this.pageMedia.length) {
      return;
    }

    const next = [...this.pageMedia];

    [next[index], next[target]] = [next[target], next[index]];

    this.pageMedia = next;
  }

  updateMediaPublic(index: number, checked: boolean): void {
    this.pageMedia[index] = {
      ...this.pageMedia[index],

      is_public: checked,
    };

    this.pageMedia = [...this.pageMedia];
  }

  updateMediaTranslation(
    index: number,
    locale: WebsitePageEditorLocale,
    field: keyof WebsitePageEditorMediaTranslationDraft,
    value: string,
  ): void {
    const item = this.pageMedia[index];

    this.pageMedia[index] = {
      ...item,

      translations: {
        ...item.translations,

        [locale]: {
          ...item.translations[locale],

          [field]: value,
        },
      },
    };

    this.pageMedia = [...this.pageMedia];
  }

  //==================================================
  //==== PUBLICATION
  //==================================================

  selectPublicationChoice(choice: WebsitePageEditorPublicationChoice): void {
    this.publicationChoice = choice;

    this.publicationValidationAttempted = false;

    if (choice === 'schedule') {
      if (!this.publicationPublishAt) {
        this.initializePublicationSchedule();
      }
    } else {
      this.publicationPublishAt = '';
      this.publicationPublishDate = null;
      this.publicationPublishTime = null;
    }

    if (choice === 'draft' || choice === 'archive') {
      this.clearPublicationUnpublish();
    }
  }

  get defaultTranslationPublished(): boolean {
    const locale =
      parseLocale(this.form.controls.website_page_default_locale.value) ??
      'id-ID';

    return this.translationForm(locale).controls.status.value === 1;
  }

  get publicationRequiresPublishedTranslation(): boolean {
    if (
      this.publicationChoice === 'publish_now' ||
      this.publicationChoice === 'schedule'
    ) {
      return true;
    }

    return (
      this.publicationChoice === 'current' &&
      this.editData()?.website_page_status === 1
    );
  }

  get publicationScheduleInvalid(): boolean {
    if (this.publicationChoice !== 'schedule') {
      return false;
    }

    if (!this.publicationPublishDate || !this.publicationPublishTime) {
      return true;
    }

    if (!this.publicationPublishAt) {
      return true;
    }

    const publishAt = new Date(this.publicationPublishAt);

    if (Number.isNaN(publishAt.getTime())) {
      return true;
    }

    return publishAt.getTime() <= Date.now();
  }

  get publicationEndInvalid(): boolean {
    const hasPartialValue =
      this.publicationUnpublishDate !== null ||
      this.publicationUnpublishTime !== null;

    if (!hasPartialValue) {
      return false;
    }

    if (!this.publicationUnpublishDate || !this.publicationUnpublishTime) {
      return true;
    }

    if (!this.publicationUnpublishAt) {
      return true;
    }

    const unpublishAt = new Date(this.publicationUnpublishAt);

    if (Number.isNaN(unpublishAt.getTime())) {
      return true;
    }

    let startAt = new Date();

    if (this.publicationChoice === 'schedule' && this.publicationPublishAt) {
      startAt = new Date(this.publicationPublishAt);
    }

    return unpublishAt.getTime() <= startAt.getTime();
  }

  goToPreview(): void {
    this.publicationValidationAttempted = true;
    this.mediaValidationAttempted = true;

    const invalidAboutLocale = this.firstInvalidAboutLocale();
    if (invalidAboutLocale) {
      this.activeLocale = invalidAboutLocale;
      this.activeTab = 'content';
      return;
    }

    if (this.aboutMediaBlocksSave || this.gadgetHomeMediaBlocksSave) {
      this.activeTab = 'media';
      return;
    }

    if (
      this.publicationRequiresPublishedTranslation &&
      !this.defaultTranslationPublished
    ) {
      return;
    }

    if (this.publicationScheduleInvalid) {
      return;
    }

    if (this.publicationEndInvalid) {
      return;
    }

    this.refreshPreviewPage();

    this.activeTab = 'preview';
  }

  backFromPublication(): void {
    this.activeTab = this.canViewAttachments ? 'media' : 'seo';
  }

  //==================================================
  //==== PREVIEW NAVIGATION
  //==================================================

  onNavChange(event: NgbNavChangeEvent): void {
    if (event.nextId !== 'preview') {
      return;
    }

    this.publicationValidationAttempted = true;
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
      this.publicationRequiresPublishedTranslation &&
      !this.defaultTranslationPublished
    ) {
      event.preventDefault();

      this.activeTab = 'publication';

      return;
    }

    if (this.publicationScheduleInvalid || this.publicationEndInvalid) {
      event.preventDefault();

      this.activeTab = 'publication';

      return;
    }

    this.refreshPreviewPage();
  }

  //==================================================
  //==== PREVIEW PAGE
  //==================================================

  private refreshPreviewPage(): void {
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

      website_page_status: this.previewWebsitePageEditorStatus(),

      effective_status: this.previewEffectiveStatus(),

      website_page_visibility: Number(raw.website_page_visibility) as 0 | 1 | 2,

      website_page_is_system:
        source?.website_page_is_system ?? (raw.website_page_is_system ? 1 : 0),

      website_page_is_featured: raw.website_page_is_featured ? 1 : 0,

      website_page_sort_order: Number(raw.website_page_sort_order),

      website_page_publish_at: this.previewPublishAt(),

      website_page_unpublish_at: this.previewUnpublishAt(),

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

  private previewWebsitePageEditorStatus(): WebsitePageEditorStatus {
    switch (this.publicationChoice) {
      case 'publish_now':
      case 'schedule':
        return 1;

      case 'archive':
        return 2;

      case 'draft':
        return 0;

      default:
        return this.editData()?.website_page_status ?? 0;
    }
  }

  private previewEffectiveStatus(): WebsitePageEditorEffectiveStatus {
    switch (this.publicationChoice) {
      case 'publish_now':
        return 'published';

      case 'schedule':
        return 'scheduled';

      case 'archive':
        return 'archived';

      case 'draft':
        return 'draft';

      default:
        return this.editData()?.effective_status ?? 'draft';
    }
  }

  private previewPublishAt(): string | null {
    if (this.publicationChoice === 'schedule') {
      return toPreviewIso(this.publicationPublishAt);
    }

    if (this.publicationChoice === 'publish_now') {
      return new Date().toISOString();
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.website_page_publish_at ?? null;
    }

    return null;
  }

  private previewUnpublishAt(): string | null {
    if (
      this.publicationChoice === 'publish_now' ||
      this.publicationChoice === 'schedule'
    ) {
      return toPreviewIso(this.publicationUnpublishAt);
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.website_page_unpublish_at ?? null;
    }

    return null;
  }

  //==================================================
  //==== PREVIEW SUMMARY
  //==================================================

  get previewDefaultTranslation(): IWebsitePageEditorTranslation | null {
    if (!this.previewPage) {
      return null;
    }

    return (
      this.previewPage.translations.find(
        (item) =>
          item.website_page_locale ===
          this.previewPage?.website_page_default_locale,
      ) ??
      this.previewPage.translations[0] ??
      null
    );
  }

  get previewDraftTranslations(): IWebsitePageEditorTranslation[] {
    if (!this.previewPage || !this.publicationRequiresPublishedTranslation) {
      return [];
    }

    return this.previewPage.translations.filter(
      (item) =>
        item.website_page_locale !==
          this.previewPage?.website_page_default_locale &&
        item.website_page_i18n_status === 0,
    );
  }

  get previewHeroMediaName(): string {
    return (
      this.previewPage?.attachments.find(
        (item) =>
          item.website_page_attachment_role ===
          (this.isGadgetHomeTemplate ? 'home_main' : 'hero'),
      )?.original_name ?? '-'
    );
  }

  previewPublicationChoiceKey(): string {
    switch (this.publicationChoice) {
      case 'publish_now':
        return 'website_page.publication_publish_now';

      case 'schedule':
        return 'website_page.publication_schedule';

      case 'archive':
        return 'website_page.publication_archive';

      case 'draft':
        return 'website_page.publication_draft';

      default:
        return 'website_page.publication_keep_current';
    }
  }

  previewResultStatusKey(): string {
    return `website_page.status_${this.previewPage?.effective_status ?? 'draft'}`;
  }

  //==================================================
  //==== SAVE
  //==================================================

  submitForm(): void {
    this.publicationValidationAttempted = true;
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
      this.publicationRequiresPublishedTranslation &&
      !this.defaultTranslationPublished
    ) {
      this.activeTab = 'publication';

      this.notification.showError(
        'Publikasikan bahasa utama terlebih dahulu sebelum menerapkan status halaman.',
      );
      this.formIssues.focusFirstInvalid();

      return;
    }

    if (this.publicationScheduleInvalid || this.publicationEndInvalid) {
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

      publicationActions: this.buildPublicationActions(),
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

  private buildPublicationActions(): IWebsitePageEditorPublicationPayload[] {
    const currentStatus = this.editData()?.effective_status ?? 'draft';

    const unpublishAt = toPreviewIso(this.publicationUnpublishAt);

    switch (this.publicationChoice) {
      case 'current':
        return [];

      case 'draft':
        if (this.mode() === 'create' || currentStatus === 'draft') {
          return [];
        }

        if (currentStatus === 'scheduled') {
          return [
            {
              action: 'cancel_schedule',
            },
          ];
        }

        if (currentStatus === 'published' || currentStatus === 'expired') {
          return [
            {
              action: 'unpublish',
            },
          ];
        }

        if (currentStatus === 'archived') {
          return [
            {
              action: 'restore',
            },
          ];
        }

        return [];

      case 'archive':
        if (this.mode() === 'create' || currentStatus === 'archived') {
          return [];
        }

        return [
          {
            action: 'archive',
          },
        ];

      case 'publish_now': {
        const action: IWebsitePageEditorPublicationPayload = {
          action: 'publish',

          website_page_unpublish_at: unpublishAt,
        };

        return currentStatus === 'archived'
          ? [
              {
                action: 'restore',
              },
              action,
            ]
          : [action];
      }

      case 'schedule': {
        const action: IWebsitePageEditorPublicationPayload = {
          action: 'schedule',

          website_page_publish_at: toPreviewIso(this.publicationPublishAt),

          website_page_unpublish_at: unpublishAt,
        };

        return currentStatus === 'archived'
          ? [
              {
                action: 'restore',
              },
              action,
            ]
          : [action];
      }
    }
  }

  //==================================================
  //==== DATETIME INPUT
  //==================================================

  get publicationMinDate(): NgbDateStruct {
    const now = new Date();

    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }

  syncPublicationPublishDateTime(): void {
    this.publicationPublishAt = composePublicationDateTime(
      this.publicationPublishDate,
      this.publicationPublishTime,
    );
  }

  syncPublicationUnpublishDateTime(): void {
    this.publicationUnpublishAt = composePublicationDateTime(
      this.publicationUnpublishDate,
      this.publicationUnpublishTime,
    );
  }

  clearPublicationUnpublish(): void {
    this.publicationUnpublishDate = null;
    this.publicationUnpublishTime = null;
    this.publicationUnpublishAt = '';
  }

  private initializePublicationSchedule(): void {
    const date = new Date();

    date.setSeconds(0, 0);

    const currentMinute = date.getMinutes();

    const nextMinute = Math.floor(currentMinute / 5) * 5 + 5;

    date.setMinutes(nextMinute);

    this.publicationPublishDate = dateToNgbDate(date);

    this.publicationPublishTime = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: 0,
    };

    this.syncPublicationPublishDateTime();
  }

  private patchPublicationDateTime(
    type: 'publish' | 'unpublish',
    value: string | null,
  ): void {
    const localValue = toLocalDateTimeInput(value);

    if (!localValue) {
      if (type === 'publish') {
        this.publicationPublishAt = '';
        this.publicationPublishDate = null;
        this.publicationPublishTime = null;
      } else {
        this.publicationUnpublishAt = '';
        this.publicationUnpublishDate = null;
        this.publicationUnpublishTime = null;
      }

      return;
    }

    const date = new Date(value!);

    const dateStruct = dateToNgbDate(date);

    const timeStruct: NgbTimeStruct = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: 0,
    };

    if (type === 'publish') {
      this.publicationPublishAt = localValue;
      this.publicationPublishDate = dateStruct;
      this.publicationPublishTime = timeStruct;

      return;
    }

    this.publicationUnpublishAt = localValue;
    this.publicationUnpublishDate = dateStruct;
    this.publicationUnpublishTime = timeStruct;
  }

  //==================================================
  //==== NORMALIZE KEY
  //==================================================

  //==================================================
  //==== NEXT
  //==================================================
}
