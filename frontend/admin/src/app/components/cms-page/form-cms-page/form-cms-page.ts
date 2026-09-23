import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  NgbDateStruct,
  NgbModule,
  NgbNavChangeEvent,
  NgbTimeStruct,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';

import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';
import { MediaModal } from '../../../shared/components/ui/modal/media-modal/media-modal';
import {
  GADGET_HOME_MEDIA_RULES,
  GadgetHomeMediaRule,
  getGadgetHomeMediaRule,
} from '../../../shared/data/gadget-home-media';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  CmsPageEffectiveStatus,
  CmsPageI18nStatus,
  CmsPageStatus,
  ICmsPageAttachment,
  ICmsPageDetail,
  ICmsPageTranslation,
  ICmsPagePayload,
  ICmsPagePublicationPayload,
  ICmsPageSaveRequest,
} from '../../../shared/interface/cms-page.interface';
import { LocalizationService } from '../../../shared/services/localization.service';
import { AuthState } from '../../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../../shared/utils/permission.util';
import { CmsPagePreview } from '../cms-page-preview/cms-page-preview';

type CmsPageLocale = 'id-ID' | 'en-US';

type CmsPagePublicationChoice =
  'current' | 'draft' | 'publish_now' | 'schedule' | 'archive';

//==================================================
//==== MEDIA DRAFT
//==================================================

interface CmsPageMediaTranslationDraft {
  caption: string;

  alt_text: string;
}

interface CmsPageMediaDraft {
  attachment: IAttachment;

  role: string;

  is_public: boolean;

  translations: Record<CmsPageLocale, CmsPageMediaTranslationDraft>;
}

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-form-cms-page',

  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    NgxEditorModule,
    MediaModal,
    CmsPagePreview,
  ],

  templateUrl: './form-cms-page.html',

  styleUrl: './form-cms-page.scss',
})
export class FormCmsPage {
  //==================================================
  //==== INJECT
  //==================================================

  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  public readonly localization = inject(LocalizationService);

  //==================================================
  //==== INPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<ICmsPageDetail | null>(null);

  readonly saving = input(false);

  readonly submitted = output<ICmsPageSaveRequest>();

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  public activeLocale: CmsPageLocale = 'id-ID';

  //==================================================
  //==== PREVIEW
  //==================================================

  public previewPage: ICmsPageDetail | null = null;

  //==================================================
  //==== MEDIA
  //==================================================

  readonly mediaModal = viewChild<MediaModal>('mediaModal');

  public pageMedia: CmsPageMediaDraft[] = [];

  public readonly pageMediaAccept = ['image/jpeg', 'image/png', 'image/webp'];

  public mediaValidationAttempted = false;

  //==================================================
  //==== PUBLICATION
  //==================================================

  public publicationChoice: CmsPagePublicationChoice =
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

  public readonly templateOptions = [
    { value: 'standard', label: 'Standard page' },
    { value: 'home', label: 'Gadget store home' },
    { value: 'company-profile', label: 'Company profile' },
    { value: 'contact', label: 'Contact page' },
  ];

  public readonly gadgetHomeMediaRules = GADGET_HOME_MEDIA_RULES;

  public readonly gadgetHomeMediaRoles = [
    ...GADGET_HOME_MEDIA_RULES.map((rule) => ({
      value: rule.value,
      label: `${rule.label} (${rule.recommendedWidth} × ${rule.recommendedHeight})`,
    })),
    { value: 'og', label: 'Open Graph / share image' },
    { value: 'gallery', label: 'Galeri tambahan' },
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

      //==================================================
      //==== PATCH MEDIA
      //==================================================

      this.pageMedia = data.attachments.map((item) => {
        const translations = this.createEmptyMediaTranslations();

        item.translations.forEach((translation) => {
          const locale = this.parseLocale(
            translation.cms_page_attachment_locale,
          );

          if (!locale) {
            return;
          }

          translations[locale] = {
            caption: translation.cms_page_attachment_caption ?? '',
            alt_text: translation.cms_page_attachment_alt_text ?? '',
          };
        });

        return {
          attachment: item,

          role:
            this.isGadgetHomeTemplate &&
            item.cms_page_attachment_role === 'hero'
              ? 'home_main'
              : item.cms_page_attachment_role || 'gallery',

          is_public: item.cms_page_attachment_is_public === 1,

          translations,
        };
      });

      //==================================================
      //==== PATCH PUBLICATION
      //==================================================

      this.publicationChoice = 'current';
      this.patchPublicationDateTime('publish', data.cms_page_publish_at);

      this.patchPublicationDateTime('unpublish', data.cms_page_unpublish_at);

      this.publicationValidationAttempted = false;
    });
  }

  //==================================================
  //==== SYSTEM PAGE
  //==================================================

  get isSystemPage(): boolean {
    return this.mode() === 'edit' && this.editData()?.cms_page_is_system === 1;
  }

  get canViewAttachments(): boolean {
    return hasPermissionAccess(
      'attachment.view',
      this.store.selectSnapshot(AuthState.permissions) ?? [],
      this.store.selectSnapshot(AuthState.isAllAccess) === true,
    );
  }

  get isGadgetHomeTemplate(): boolean {
    const template = this.form.controls.cms_page_template.value;
    return template === 'home' || template === 'gadget-home-v1';
  }

  get mediaRoleOptions(): { value: string; label: string }[] {
    if (this.isGadgetHomeTemplate) return this.gadgetHomeMediaRoles;

    return [
      { value: 'hero', label: 'Hero image' },
      { value: 'gallery', label: 'Gallery' },
      { value: 'og', label: 'Open Graph / share image' },
    ];
  }

  //==================================================
  //==== EMPTY MEDIA TRANSLATIONS
  //==================================================

  private createEmptyMediaTranslations(): Record<
    CmsPageLocale,
    CmsPageMediaTranslationDraft
  > {
    return {
      'id-ID': {
        caption: '',
        alt_text: '',
      },

      'en-US': {
        caption: '',
        alt_text: '',
      },
    };
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

    this.activeTab = this.canViewAttachments ? 'media' : 'publication';
  }

  goToPublication(): void {
    this.activeTab = 'publication';
  }

  //==================================================
  //==== MEDIA
  //==================================================

  openMedia(): void {
    void this.mediaModal()?.openModal();
  }

  get selectedMedia(): IAttachment[] {
    return this.pageMedia.map((item) => item.attachment);
  }

  selectMedia(selection: MediaSelection): void {
    const selected = this.toAttachmentArray(selection);

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
            (option) =>
              option.value !== 'og' &&
              option.value !== 'gallery' &&
              !assignedRoles.has(option.value),
          )?.value ?? 'gallery')
        : assignedRoles.has('hero')
          ? 'gallery'
          : 'hero';

      assignedRoles.add(role);

      return {
        attachment,

        role,

        is_public: true,

        translations: this.createEmptyMediaTranslations(),
      };
    });
  }

  setHero(index: number): void {
    this.pageMedia = this.pageMedia.map((item, currentIndex) => ({
      ...item,

      role: currentIndex === index ? 'hero' : 'gallery',
    }));
  }

  updateMediaRole(index: number, role: string): void {
    const uniqueRole = role !== 'gallery';

    this.pageMedia = this.pageMedia.map((item, currentIndex) => {
      if (currentIndex === index) return { ...item, role };
      if (uniqueRole && item.role === role) return { ...item, role: 'gallery' };
      return item;
    });
  }

  mediaRoleLabel(role: string): string {
    return (
      this.mediaRoleOptions.find((option) => option.value === role)?.label ??
      role
    );
  }

  gadgetHomeMediaRule(role: string): GadgetHomeMediaRule | null {
    return getGadgetHomeMediaRule(role);
  }

  gadgetHomeMediaRequirement(rule: GadgetHomeMediaRule): string {
    return `Rekomendasi ${rule.recommendedWidth} × ${rule.recommendedHeight}px · minimal ${rule.minWidth} × ${rule.minHeight}px`;
  }

  gadgetHomeMediaIssue(media: CmsPageMediaDraft): string | null {
    const rule = getGadgetHomeMediaRule(media.role);

    if (!rule) return null;

    if (!this.pageMediaAccept.includes(media.attachment.mime_type)) {
      return 'Format harus JPEG, PNG, atau WebP.';
    }

    const width = media.attachment.width;
    const height = media.attachment.height;

    if (!width || !height) {
      return 'Dimensi gambar tidak terbaca. Unggah ulang gambar yang valid.';
    }

    if (width < rule.minWidth || height < rule.minHeight) {
      return `Gambar terlalu kecil. Minimal ${rule.minWidth} × ${rule.minHeight}px.`;
    }

    const expectedRatio = rule.recommendedWidth / rule.recommendedHeight;
    const actualRatio = width / height;
    const ratioDifference =
      Math.abs(actualRatio - expectedRatio) / expectedRatio;

    if (ratioDifference > rule.ratioTolerance) {
      return `Rasio gambar tidak sesuai slot. Gunakan rasio ${rule.recommendedWidth}:${rule.recommendedHeight}.`;
    }

    return null;
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

  get gadgetHomeMediaHasInvalidFiles(): boolean {
    return (
      this.isGadgetHomeTemplate &&
      this.pageMedia.some((media) => this.gadgetHomeMediaIssue(media) !== null)
    );
  }

  get gadgetHomeRequiresCompleteMedia(): boolean {
    if (!this.isGadgetHomeTemplate) return false;

    return ['published', 'scheduled'].includes(this.previewEffectiveStatus());
  }

  get gadgetHomeMediaBlocksSave(): boolean {
    return (
      this.gadgetHomeMediaHasInvalidFiles ||
      (this.gadgetHomeRequiresCompleteMedia &&
        this.gadgetHomeMissingMediaRules.length > 0)
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
    locale: CmsPageLocale,
    field: keyof CmsPageMediaTranslationDraft,
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

  private toAttachmentArray(selection: MediaSelection): IAttachment[] {
    if (!selection) {
      return [];
    }

    if (Array.isArray(selection)) {
      return selection.filter(
        (item): item is IAttachment =>
          typeof item === 'object' && item !== null && 'id_attachment' in item,
      );
    }

    if (typeof selection === 'object' && 'id_attachment' in selection) {
      return [selection as IAttachment];
    }

    return [];
  }

  //==================================================
  //==== PUBLICATION
  //==================================================

  selectPublicationChoice(choice: CmsPagePublicationChoice): void {
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
      this.parseLocale(this.form.controls.cms_page_default_locale.value) ??
      'id-ID';

    return this.translationForm(locale).controls.status.value === 1;
  }

  get publicationRequiresPublishedTranslation(): boolean {
    return (
      this.publicationChoice === 'publish_now' ||
      this.publicationChoice === 'schedule'
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

  private buildPreviewPage(): ICmsPageDetail {
    const raw = this.form.getRawValue();

    const source = this.editData();

    const now = new Date().toISOString();

    const translations: ICmsPageTranslation[] = this.supportedLanguages
      .filter((language) => this.isLanguageEnabled(language.locale))
      .map((language) => {
        const group = this.translationForm(language.locale);

        const value = group.getRawValue();

        const existing = source?.translations.find(
          (item) => item.cms_page_locale === language.locale,
        );

        const title = value.title.trim();

        const slug = value.slug.trim() || this.slugify(title);

        return {
          cms_page_locale: language.locale,

          cms_page_slug: slug,

          cms_page_title: title,

          cms_page_excerpt: value.excerpt.trim() || null,

          cms_page_content: value.content || null,

          cms_page_content_json: existing?.cms_page_content_json ?? null,

          cms_page_meta_title: value.meta_title.trim() || null,

          cms_page_meta_description: value.meta_description.trim() || null,

          cms_page_meta_keywords: value.meta_keywords.trim() || null,

          cms_page_meta_robots: value.meta_robots.trim() || null,

          cms_page_canonical_url: value.canonical_url.trim() || null,

          cms_page_og_title: value.og_title.trim() || null,

          cms_page_og_description: value.og_description.trim() || null,

          cms_page_schema_json: existing?.cms_page_schema_json ?? null,

          cms_page_i18n_status: value.status,

          created: existing?.created ?? now,

          updated: now,
        };
      });

    const attachments: ICmsPageAttachment[] = this.pageMedia.map(
      (item, index) => {
        const existing = source?.attachments.find(
          (attachment) =>
            attachment.id_attachment === item.attachment.id_attachment,
        );

        return {
          ...item.attachment,

          cms_page_attachment_role: item.role,

          cms_page_attachment_sort_order: index,

          cms_page_attachment_is_public: item.is_public ? 1 : 0,

          translations: this.supportedLanguages
            .filter((language) => this.isLanguageEnabled(language.locale))
            .map((language) => {
              const existingTranslation = existing?.translations.find(
                (translation) =>
                  translation.cms_page_attachment_locale === language.locale,
              );

              const mediaTranslation = item.translations[language.locale];

              return {
                cms_page_attachment_locale: language.locale,

                cms_page_attachment_caption:
                  mediaTranslation.caption.trim() || null,

                cms_page_attachment_alt_text:
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
      id_cms_page: source?.id_cms_page ?? 'preview',

      id_parent_cms_page: source?.id_parent_cms_page ?? null,

      cms_page_key: raw.cms_page_key.trim(),

      cms_page_type: raw.cms_page_type.trim(),

      cms_page_template: raw.cms_page_template.trim() || null,

      cms_page_content_mode: raw.cms_page_content_mode.trim(),

      cms_page_default_locale: raw.cms_page_default_locale,

      cms_page_status: this.previewCmsPageStatus(),

      effective_status: this.previewEffectiveStatus(),

      cms_page_visibility: Number(raw.cms_page_visibility) as 0 | 1 | 2,

      cms_page_is_system:
        source?.cms_page_is_system ?? (raw.cms_page_is_system ? 1 : 0),

      cms_page_is_featured: raw.cms_page_is_featured ? 1 : 0,

      cms_page_sort_order: Number(raw.cms_page_sort_order),

      cms_page_publish_at: this.previewPublishAt(),

      cms_page_unpublish_at: this.previewUnpublishAt(),

      cms_page_settings_json: source?.cms_page_settings_json ?? null,

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

  private previewCmsPageStatus(): CmsPageStatus {
    switch (this.publicationChoice) {
      case 'publish_now':
      case 'schedule':
        return 1;

      case 'archive':
        return 2;

      case 'draft':
        return 0;

      default:
        return this.editData()?.cms_page_status ?? 0;
    }
  }

  private previewEffectiveStatus(): CmsPageEffectiveStatus {
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
      return this.toPreviewIso(this.publicationPublishAt);
    }

    if (this.publicationChoice === 'publish_now') {
      return new Date().toISOString();
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.cms_page_publish_at ?? null;
    }

    return null;
  }

  private previewUnpublishAt(): string | null {
    if (
      this.publicationChoice === 'publish_now' ||
      this.publicationChoice === 'schedule'
    ) {
      return this.toPreviewIso(this.publicationUnpublishAt);
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.cms_page_unpublish_at ?? null;
    }

    return null;
  }

  private toPreviewIso(value: string): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  //==================================================
  //==== PREVIEW SUMMARY
  //==================================================

  get previewDefaultTranslation(): ICmsPageTranslation | null {
    if (!this.previewPage) {
      return null;
    }

    return (
      this.previewPage.translations.find(
        (item) =>
          item.cms_page_locale === this.previewPage?.cms_page_default_locale,
      ) ??
      this.previewPage.translations[0] ??
      null
    );
  }

  get previewDraftTranslations(): ICmsPageTranslation[] {
    if (!this.previewPage || !this.publicationRequiresPublishedTranslation) {
      return [];
    }

    return this.previewPage.translations.filter(
      (item) =>
        item.cms_page_locale !== this.previewPage?.cms_page_default_locale &&
        item.cms_page_i18n_status === 0,
    );
  }

  get previewHeroMediaName(): string {
    return (
      this.previewPage?.attachments.find(
        (item) =>
          item.cms_page_attachment_role ===
          (this.isGadgetHomeTemplate ? 'home_main' : 'hero'),
      )?.original_name ?? '-'
    );
  }

  previewLanguageLabelKey(locale: string): string {
    return locale === 'en-US'
      ? 'cms_page.language_english'
      : 'cms_page.language_indonesian';
  }

  previewVisibilityKey(value: number): string {
    if (value === 0) {
      return 'private';
    }

    if (value === 2) {
      return 'unlisted';
    }

    return 'public';
  }

  previewPublicationChoiceKey(): string {
    switch (this.publicationChoice) {
      case 'publish_now':
        return 'cms_page.publication_publish_now';

      case 'schedule':
        return 'cms_page.publication_schedule';

      case 'archive':
        return 'cms_page.publication_archive';

      case 'draft':
        return 'cms_page.publication_draft';

      default:
        return 'cms_page.publication_keep_current';
    }
  }

  previewResultStatusKey(): string {
    return `cms_page.status_${this.previewPage?.effective_status ?? 'draft'}`;
  }

  //==================================================
  //==== SAVE
  //==================================================

  submitForm(): void {
    this.publicationValidationAttempted = true;
    this.mediaValidationAttempted = true;

    if (this.gadgetHomeMediaBlocksSave) {
      this.activeTab = 'media';

      return;
    }

    if (
      this.publicationRequiresPublishedTranslation &&
      !this.defaultTranslationPublished
    ) {
      this.activeTab = 'publication';

      return;
    }

    if (this.publicationScheduleInvalid || this.publicationEndInvalid) {
      this.activeTab = 'publication';

      return;
    }

    const page = this.buildPreviewPage();

    const payload: ICmsPagePayload = {
      id_parent_cms_page: page.id_parent_cms_page,

      cms_page_key: page.cms_page_key,

      cms_page_type: page.cms_page_type,

      cms_page_template: page.cms_page_template,

      cms_page_content_mode: page.cms_page_content_mode,

      cms_page_default_locale: page.cms_page_default_locale,

      // Base save tidak mengubah lifecycle.
      cms_page_status:
        this.mode() === 'edit' ? (this.editData()?.cms_page_status ?? 0) : 0,

      cms_page_visibility: page.cms_page_visibility,

      cms_page_is_system: page.cms_page_is_system,

      cms_page_is_featured: page.cms_page_is_featured,

      cms_page_sort_order: page.cms_page_sort_order,

      cms_page_publish_at:
        this.mode() === 'edit'
          ? (this.editData()?.cms_page_publish_at ?? null)
          : null,

      cms_page_unpublish_at:
        this.mode() === 'edit'
          ? (this.editData()?.cms_page_unpublish_at ?? null)
          : null,

      cms_page_settings_json: this.editData()?.cms_page_settings_json ?? null,

      translations: page.translations.map((translation) => ({
        locale: translation.cms_page_locale,

        slug: translation.cms_page_slug,

        title: translation.cms_page_title,

        excerpt: translation.cms_page_excerpt,

        content: translation.cms_page_content,

        content_json: translation.cms_page_content_json,

        meta_title: translation.cms_page_meta_title,

        meta_description: translation.cms_page_meta_description,

        meta_keywords: translation.cms_page_meta_keywords,

        meta_robots: translation.cms_page_meta_robots,

        canonical_url: translation.cms_page_canonical_url,

        og_title: translation.cms_page_og_title,

        og_description: translation.cms_page_og_description,

        schema_json: translation.cms_page_schema_json,

        status: translation.cms_page_i18n_status,
      })),

      attachments: page.attachments.map((attachment) => ({
        id_attachment: attachment.id_attachment,

        role: attachment.cms_page_attachment_role,

        sort_order: attachment.cms_page_attachment_sort_order,

        is_public: attachment.cms_page_attachment_is_public,

        translations: attachment.translations.map((translation) => ({
          locale: translation.cms_page_attachment_locale,

          caption: translation.cms_page_attachment_caption,

          alt_text: translation.cms_page_attachment_alt_text,
        })),
      })),
    };

    this.submitted.emit({
      payload,

      publicationActions: this.buildPublicationActions(),
    });
  }

  private buildPublicationActions(): ICmsPagePublicationPayload[] {
    const currentStatus = this.editData()?.effective_status ?? 'draft';

    const unpublishAt = this.toPreviewIso(this.publicationUnpublishAt);

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
        const action: ICmsPagePublicationPayload = {
          action: 'publish',

          cms_page_unpublish_at: unpublishAt,
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
        const action: ICmsPagePublicationPayload = {
          action: 'schedule',

          cms_page_publish_at: this.toPreviewIso(this.publicationPublishAt),

          cms_page_unpublish_at: unpublishAt,
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

  private toLocalDateTimeInput(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hour = String(date.getHours()).padStart(2, '0');

    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  publicationDateValue(value: NgbDateStruct | null): Date | null {
    if (!value) {
      return null;
    }

    return new Date(value.year, value.month - 1, value.day, 0, 0, 0, 0);
  }

  get publicationMinDate(): NgbDateStruct {
    const now = new Date();

    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }

  syncPublicationPublishDateTime(): void {
    this.publicationPublishAt = this.composePublicationDateTime(
      this.publicationPublishDate,
      this.publicationPublishTime,
    );
  }

  syncPublicationUnpublishDateTime(): void {
    this.publicationUnpublishAt = this.composePublicationDateTime(
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

    this.publicationPublishDate = this.dateToNgbDate(date);

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
    const localValue = this.toLocalDateTimeInput(value);

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

    const dateStruct = this.dateToNgbDate(date);

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

  private composePublicationDateTime(
    date: NgbDateStruct | null,
    time: NgbTimeStruct | null,
  ): string {
    if (!date || !time) {
      return '';
    }

    const year = String(date.year);

    const month = String(date.month).padStart(2, '0');

    const day = String(date.day).padStart(2, '0');

    const hour = String(time.hour).padStart(2, '0');

    const minute = String(time.minute).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private dateToNgbDate(date: Date): NgbDateStruct {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
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
