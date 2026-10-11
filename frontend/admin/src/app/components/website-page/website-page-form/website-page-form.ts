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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';
import { finalize } from 'rxjs';

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
import { LocalizationService } from '../../../shared/services/localization.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthState } from '../../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../../shared/utils/permission.util';
import { WebsitePagePreview } from '../website-page-preview/website-page-preview';

type WebsitePageEditorLocale = 'id-ID' | 'en-US';

type WebsitePageEditorPublicationChoice =
  'current' | 'draft' | 'publish_now' | 'schedule' | 'archive';

const HOME_SECTION_KEYS = [
  'latex_features',
  'categories',
  'products',
  'articles',
  'tags',
  'newsletter',
  'advertisement',
] as const;

type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];
type HomeSectionVisibility = Record<HomeSectionKey, boolean>;

const HOME_SECTION_DEFAULTS: HomeSectionVisibility = {
  latex_features: true,
  categories: true,
  products: true,
  articles: true,
  tags: false,
  newsletter: false,
  advertisement: false,
};

interface HomeLatexFeatureDraft {
  title: string;
  description: string;
}

interface HomeLatexContentDraft {
  eyebrow: string;
  title: string;
  description: string;
  items: HomeLatexFeatureDraft[];
}

interface HomeAdvertisementDraft {
  label: string;
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
}

interface AboutFeatureDraft {
  title: string;
  description: string;
}

const ABOUT_CONTRACT_VERSION = 1;
const ABOUT_HIGHLIGHT_TITLE_MAX_LENGTH = 160;
const ABOUT_HIGHLIGHT_DESCRIPTION_MAX_LENGTH = 1000;

//==================================================
//==== MEDIA DRAFT
//==================================================

interface WebsitePageEditorMediaTranslationDraft {
  caption: string;

  alt_text: string;
}

interface WebsitePageEditorMediaDraft {
  attachment: IAttachment;

  role: string;

  is_public: boolean;

  action_type: 'none' | 'internal' | 'external' | 'product' | 'category';

  action_value: string;

  translations: Record<
    WebsitePageEditorLocale,
    WebsitePageEditorMediaTranslationDraft
  >;
}

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-website-page-form',

  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    NgxEditorModule,
    MediaModal,
    WebsitePagePreview,
  ],

  templateUrl: './website-page-form.html',

  styleUrl: './website-page-form.scss',
})
export class WebsitePageForm {
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

  //==================================================
  //==== INPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IWebsitePageEditorDetail | null>(null);

  readonly saving = input(false);

  readonly submitted = output<IWebsitePageEditorSaveRequest>();

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab = 'general';

  public activeLocale: WebsitePageEditorLocale = 'id-ID';
  public translatingPage = false;
  public generatingPage = false;

  //==================================================
  //==== PREVIEW
  //==================================================

  public previewPage: IWebsitePageEditorDetail | null = null;

  //==================================================
  //==== MEDIA
  //==================================================

  readonly mediaModal = viewChild<MediaModal>('mediaModal');

  public pageMedia: WebsitePageEditorMediaDraft[] = [];

  public readonly pageMediaAccept = ['image/jpeg', 'image/png', 'image/webp'];

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

  public readonly templateOptions = [
    { value: 'standard', label: 'Standard page' },
    { value: 'home', label: 'Home utama' },
    { value: 'company-profile', label: 'Company profile' },
    { value: 'contact', label: 'Contact page' },
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
    'id-ID': this.createHomeSectionVisibility(),
    'en-US': this.createHomeSectionVisibility(),
  };

  public homeLatexContent: Record<
    WebsitePageEditorLocale,
    HomeLatexContentDraft
  > = {
    'id-ID': this.createHomeLatexContent('id-ID'),
    'en-US': this.createHomeLatexContent('en-US'),
  };

  public homeAdvertisementContent: Record<
    WebsitePageEditorLocale,
    HomeAdvertisementDraft
  > = {
    'id-ID': this.createHomeAdvertisementContent('id-ID'),
    'en-US': this.createHomeAdvertisementContent('en-US'),
  };

  public aboutFeatures: Record<WebsitePageEditorLocale, AboutFeatureDraft[]> = {
    'id-ID': this.createAboutFeatures(),
    'en-US': this.createAboutFeatures(),
  };

  public readonly gadgetHomeMediaRoles = [
    ...GADGET_HOME_MEDIA_RULES.map((rule) => ({
      value: rule.value,
      label: `${rule.label} (${rule.recommendedWidth} × ${rule.recommendedHeight})`,
    })),
    { value: 'og', label: 'Open Graph / share image' },
  ];

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
        'id-ID': this.createHomeSectionVisibility(),
        'en-US': this.createHomeSectionVisibility(),
      };

      this.homeLatexContent = {
        'id-ID': this.createHomeLatexContent('id-ID'),
        'en-US': this.createHomeLatexContent('en-US'),
      };
      this.homeAdvertisementContent = {
        'id-ID': this.createHomeAdvertisementContent('id-ID'),
        'en-US': this.createHomeAdvertisementContent('en-US'),
      };

      this.aboutFeatures = {
        'id-ID': this.createAboutFeatures(),
        'en-US': this.createAboutFeatures(),
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
        const locale = this.parseLocale(translation.website_page_locale);

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

        this.homeSectionVisibility[locale] = this.readHomeSectionVisibility(
          translation.website_page_content_json,
        );

        this.homeLatexContent[locale] = this.readHomeLatexContent(
          locale,
          translation.website_page_content_json,
        );
        this.homeAdvertisementContent[locale] =
          this.readHomeAdvertisementContent(
            locale,
            translation.website_page_content_json,
          );

        this.aboutFeatures[locale] = this.readAboutFeatures(
          translation.website_page_content_json,
        );
      });

      const defaultLocale =
        this.parseLocale(data.website_page_default_locale) ?? 'id-ID';

      this.enableLanguage(defaultLocale);

      this.activeLocale = defaultLocale;

      //==================================================
      //==== PATCH MEDIA
      //==================================================

      this.pageMedia = data.attachments.map((item) => {
        const translations = this.createEmptyMediaTranslations();

        item.translations.forEach((translation) => {
          const locale = this.parseLocale(
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

  private createHomeSectionVisibility(): HomeSectionVisibility {
    return { ...HOME_SECTION_DEFAULTS };
  }

  private readHomeSectionVisibility(content: unknown): HomeSectionVisibility {
    const visibility = this.createHomeSectionVisibility();
    if (!this.isRecord(content)) return visibility;

    const keys = [2, 3].includes(Number(content['home_contract_version']))
      ? HOME_SECTION_KEYS
      : (['tags', 'newsletter'] as const);

    for (const key of keys) {
      const section = content[key];
      if (this.isRecord(section) && typeof section['status'] === 'boolean') {
        visibility[key] = section['status'];
      }
    }

    return visibility;
  }

  private buildHomeContentJson(
    locale: WebsitePageEditorLocale,
    existing: unknown,
  ): Record<string, unknown> {
    const source = this.isRecord(existing) ? existing : {};
    const content: Record<string, unknown> = { home_contract_version: 3 };

    for (const key of HOME_SECTION_KEYS) {
      const current = this.isRecord(source[key]) ? source[key] : {};
      content[key] = {
        ...current,
        status: this.homeSectionVisibility[locale][key],
      };
    }

    content['latex_features'] = {
      ...(this.isRecord(content['latex_features'])
        ? content['latex_features']
        : {}),
      ...this.homeLatexContent[locale],
      items: this.homeLatexContent[locale].items
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        }))
        .filter((item) => item.title && item.description),
      status: this.homeSectionVisibility[locale].latex_features,
    };
    content['advertisement'] = {
      ...(this.isRecord(content['advertisement'])
        ? content['advertisement']
        : {}),
      ...this.homeAdvertisementContent[locale],
      status: this.homeSectionVisibility[locale].advertisement,
    };

    return content;
  }

  private createHomeLatexContent(
    locale: WebsitePageEditorLocale,
  ): HomeLatexContentDraft {
    const english = locale === 'en-US';
    const items = english
      ? [
          [
            'High Elasticity & Responsiveness',
            'Natural latex features a molecular structure that is exceptionally springy and instantly responsive to pressure, offering optimal bounce-back resilience without sagging even under intensive daily use.',
          ],
          [
            'Damping & Load Support',
            'Superior weight distribution makes this material exceptional at absorbing vibrations and stabilizing load support—ideal for furniture, automotive cushioning, and custom pads.',
          ],
          [
            'Hypoallergenic & Hygienic',
            'Naturally resistant to mold, bacteria, mildew, and dust mites. Keeps products fresh, clean, and safe for babies, pets, and sensitive skin.',
          ],
          [
            'Harmful Chemical Free',
            'Crafted purely from select natural sap without hazardous synthetic mixtures or toxic gas emissions, guaranteeing total health safety for indoor environments.',
          ],
          [
            'Airflow & Pinhole Structure',
            'Equipped with an open-cell structure and specialized pinhole molds that maximize natural airflow, actively preventing heat buildup and maintaining a cool surface.',
          ],
          [
            'Versatile Applications',
            'From flexible sheet materials for industrial raw goods, creative crafts, ergonomic pillows, to pet accessories and room furnishings, MATEX latex easily adapts.',
          ],
          [
            'Long-Lasting Durability',
            'Renowned for high structural density and exceptional wear resistance. MATEX latex products maintain structural integrity and comfort over years of use.',
          ],
          [
            'Eco-Friendly & Sustainable',
            'Sourced from renewable natural rubber trees and biodegradable by nature, contributing meaningfully to plastic waste reduction and environmental preservation.',
          ],
        ]
      : [
          [
            'Elastisitas & Respon Tinggi',
            'Lateks alami memiliki struktur molekul yang sangat kenyal dan responsif secara instan terhadap tekanan, memberikan daya pantul optimal yang kembali ke bentuk semula tanpa mudah amblas meskipun digunakan secara intensif setiap hari.',
          ],
          [
            'Peredam & Penopang Beban',
            'Kemampuan mendistribusikan bobot secara merata menjadikan material ini unggul dalam meredam getaran serta menopang berat secara stabil—sangat ideal diaplikasikan pada furnitur, jok otomotif, hingga alas produk kesayangan Anda.',
          ],
          [
            'Hipoalergenik & Higienis',
            'Secara alami bersifat resisten terhadap pertumbuhan jamur, bakteri, lumut, dan tungau debu. Menjaga produk tetap bersih, higienis, serta aman digunakan bahkan untuk bayi, hewan peliharaan, dan pemilik kulit sensitif.',
          ],
          [
            'Bebas Bahan Kimia Berbahaya',
            'Diproduksi murni dari getah pilihan tanpa campuran bahan sintetis berbahaya atau emisi gas beracun. Menjamin keamanan total bagi kesehatan keluarga sekaligus ramah untuk berbagai fungsi penggunaan di dalam ruangan.',
          ],
          [
            'Sirkulasi Udara & Pinhole',
            'Dilengkapi struktur sel terbuka serta pori-pori cetakan (pinhole) yang memaksimalkan sirkulasi udara alami. Fitur ini secara efektif mencegah penumpukan kelembapan dan panas, sehingga material tetap sejuk saat disentuh.',
          ],
          [
            'Fleksibel Berbagai Aplikasi',
            'Mulai dari bentuk lembaran fleksibel untuk bahan baku industri, kerajinan kreatif, bantal ergonomis, hingga aksesori peliharaan dan properti ruangan, lateks MATEX mudah dibentuk dan disesuaikan dengan berbagai kebutuhan manufaktur.',
          ],
          [
            'Daya Tahan Jangka Panjang',
            'Dikenal memiliki durabilitas tingkat tinggi yang tahan terhadap keausan struktural. Produk berbahan lateks MATEX mampu mempertahankan performa, keempukan, dan bentuk aslinya hingga bertahun-tahun pemakaian.',
          ],
          [
            'Ramah Lingkungan (Eco-Friendly)',
            'Bersumber dari getah pohon karet alami yang dapat diperbarui (renewable resource) dan bersifat biodegradable. Pemilihan material ini ikut berkontribusi nyata dalam menekan limbah sintetis demi kelestarian bumi.',
          ],
        ];

    return {
      eyebrow: english ? 'MATEX EXCELLENCE' : 'KEUNGGULAN MATEX',
      title: english
        ? 'Why Choose 100% Natural Latex?'
        : 'Kenapa Harus 100% Natural Latex?',
      description: english
        ? 'The ultimate high-standard universal material solution, engineered to deliver exceptional flexibility, safety, and comfort for diverse industrial, property, and lifestyle needs.'
        : 'Solusi material universal berstandar tinggi yang dirancang untuk memberikan fleksibilitas, keamanan, dan kenyamanan terbaik bagi berbagai kebutuhan industri, properti, hingga gaya hidup.',
      items: items.map(([title, description]) => ({ title, description })),
    };
  }

  private readHomeLatexContent(
    locale: WebsitePageEditorLocale,
    content: unknown,
  ): HomeLatexContentDraft {
    const defaults = this.createHomeLatexContent(locale);
    if (!this.isRecord(content) || !this.isRecord(content['latex_features']))
      return defaults;
    const section = content['latex_features'];
    const items = Array.isArray(section['items'])
      ? section['items']
          .filter((item): item is Record<string, unknown> =>
            this.isRecord(item),
          )
          .map((item) => ({
            title: typeof item['title'] === 'string' ? item['title'] : '',
            description:
              typeof item['description'] === 'string'
                ? item['description']
                : '',
          }))
          .filter((item) => item.title || item.description)
          .slice(0, 8)
      : [];

    return {
      eyebrow:
        typeof section['eyebrow'] === 'string'
          ? section['eyebrow']
          : defaults.eyebrow,
      title:
        typeof section['title'] === 'string'
          ? section['title']
          : defaults.title,
      description:
        typeof section['description'] === 'string'
          ? section['description']
          : defaults.description,
      items: items.length ? items : defaults.items,
    };
  }

  private createHomeAdvertisementContent(
    locale: WebsitePageEditorLocale,
  ): HomeAdvertisementDraft {
    return locale === 'en-US'
      ? {
          label: 'MATEX PROMOTION',
          title: 'Need a natural latex solution for your business?',
          description:
            'Talk with our team about product specifications, availability, and partnership opportunities.',
          cta_label: 'Contact MATEX',
          cta_url: '/en/contact-us',
        }
      : {
          label: 'PROMOSI MATEX',
          title: 'Butuh solusi lateks alami untuk bisnis Anda?',
          description:
            'Diskusikan spesifikasi produk, ketersediaan, dan peluang kerja sama bersama tim kami.',
          cta_label: 'Hubungi MATEX',
          cta_url: '/kontak',
        };
  }

  private readHomeAdvertisementContent(
    locale: WebsitePageEditorLocale,
    content: unknown,
  ): HomeAdvertisementDraft {
    const defaults = this.createHomeAdvertisementContent(locale);
    if (!this.isRecord(content) || !this.isRecord(content['advertisement']))
      return defaults;
    const section = content['advertisement'];
    const field = (key: keyof HomeAdvertisementDraft): string =>
      typeof section[key] === 'string' ? section[key] : defaults[key];
    return {
      label: field('label'),
      title: field('title'),
      description: field('description'),
      cta_label: field('cta_label'),
      cta_url: field('cta_url'),
    };
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

  private createAboutFeatures(): AboutFeatureDraft[] {
    return Array.from({ length: 3 }, () => ({ title: '', description: '' }));
  }

  private readAboutFeatures(content: unknown): AboutFeatureDraft[] {
    const result = this.createAboutFeatures();
    if (!this.isRecord(content)) return result;

    const highlights =
      content['about_contract_version'] === ABOUT_CONTRACT_VERSION &&
      Array.isArray(content['highlights'])
        ? content['highlights']
        : Array.isArray(content['features'])
          ? content['features']
          : [];

    highlights.slice(0, 3).forEach((item, index) => {
      if (!this.isRecord(item)) return;
      result[index] = {
        title: typeof item['title'] === 'string' ? item['title'] : '',
        description:
          typeof item['description'] === 'string' ? item['description'] : '',
      };
    });

    return result;
  }

  private buildAboutContentJson(
    locale: WebsitePageEditorLocale,
    _existing: unknown,
  ): Record<string, unknown> {
    return {
      about_contract_version: ABOUT_CONTRACT_VERSION,
      highlights: this.aboutFeatures[locale]
        .map((feature) => ({
          title: feature.title.trim(),
          description: feature.description.trim(),
        }))
        .filter((feature) => feature.title && feature.description),
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  //==================================================
  //==== EMPTY MEDIA TRANSLATIONS
  //==================================================

  private createEmptyMediaTranslations(): Record<
    WebsitePageEditorLocale,
    WebsitePageEditorMediaTranslationDraft
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

  copyAndTranslatePageToEnglish(): void {
    const source = this.translationForm('id-ID').getRawValue();
    const fields: Record<string, string> = {
      title: source.title,
      excerpt: source.excerpt,
      content: source.content,
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      meta_keywords: source.meta_keywords,
      og_title: source.og_title,
      og_description: source.og_description,
    };

    if (this.isGadgetHomeTemplate) {
      const latex = this.homeLatexContent['id-ID'];
      fields['home_latex_eyebrow'] = latex.eyebrow;
      fields['home_latex_title'] = latex.title;
      fields['home_latex_description'] = latex.description;
      latex.items.forEach((item, index) => {
        fields[`home_latex_${index}_title`] = item.title;
        fields[`home_latex_${index}_description`] = item.description;
      });
      const ad = this.homeAdvertisementContent['id-ID'];
      fields['home_ad_label'] = ad.label;
      fields['home_ad_title'] = ad.title;
      fields['home_ad_description'] = ad.description;
      fields['home_ad_cta_label'] = ad.cta_label;
    }

    if (this.isAboutTemplate) {
      this.aboutFeatures['id-ID'].forEach((feature, index) => {
        fields[`about_${index}_title`] = feature.title;
        fields[`about_${index}_description`] = feature.description;
      });
    }

    this.translatingPage = true;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: this.isGadgetHomeTemplate
          ? 'home page and section organizer'
          : 'website page',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields,
      })
      .pipe(finalize(() => (this.translatingPage = false)))
      .subscribe({
        next: (translated) => {
          this.enableLanguage('en-US');
          this.translationForm('en-US').patchValue({
            title: translated['title'],
            slug: this.slugifyAssistant(translated['title'] || source.title),
            excerpt: translated['excerpt'],
            content: translated['content'],
            meta_title: translated['meta_title'],
            meta_description: translated['meta_description'],
            meta_keywords: translated['meta_keywords'],
            og_title: translated['og_title'],
            og_description: translated['og_description'],
            status: source.status,
          });

          if (this.isGadgetHomeTemplate) {
            const idLatex = this.homeLatexContent['id-ID'];
            this.homeLatexContent = {
              ...this.homeLatexContent,
              'en-US': {
                eyebrow: translated['home_latex_eyebrow'] || '',
                title: translated['home_latex_title'] || '',
                description: translated['home_latex_description'] || '',
                items: idLatex.items.map((_item, index) => ({
                  title: translated[`home_latex_${index}_title`] || '',
                  description:
                    translated[`home_latex_${index}_description`] || '',
                })),
              },
            };
            const idAd = this.homeAdvertisementContent['id-ID'];
            this.homeAdvertisementContent = {
              ...this.homeAdvertisementContent,
              'en-US': {
                label: translated['home_ad_label'] || '',
                title: translated['home_ad_title'] || '',
                description: translated['home_ad_description'] || '',
                cta_label: translated['home_ad_cta_label'] || '',
                cta_url: idAd.cta_url,
              },
            };
            this.homeSectionVisibility = {
              ...this.homeSectionVisibility,
              'en-US': { ...this.homeSectionVisibility['id-ID'] },
            };
          }

          if (this.isAboutTemplate) {
            this.aboutFeatures = {
              ...this.aboutFeatures,
              'en-US': this.aboutFeatures['id-ID'].map((_feature, index) => ({
                title: translated[`about_${index}_title`] || '',
                description: translated[`about_${index}_description`] || '',
              })),
            };
          }

          this.activeLocale = 'en-US';
          this.notification.showSuccess(
            'Versi English dan organizer bagiannya sudah diisi. Periksa hasil terjemahan sebelum menyimpan.',
          );
        },
        error: (error) => this.showContentAssistantError(error),
      });
  }

  generatePageDescriptions(): void {
    const locale = this.activeLocale;
    const group = this.translationForm(locale);
    const value = group.getRawValue();
    this.generatingPage = true;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: this.isGadgetHomeTemplate ? 'home page' : 'website page',
        target_locale: locale,
        context: JSON.stringify({
          title: value.title,
          page_key: this.form.controls.website_page_key.value,
        }),
        fields: {
          excerpt: value.excerpt,
          content: value.content,
          meta_description: value.meta_description,
          og_description: value.og_description,
        },
      })
      .pipe(finalize(() => (this.generatingPage = false)))
      .subscribe({
        next: (generated) => {
          group.patchValue({
            excerpt: generated['excerpt'],
            content: generated['content'],
            meta_description: generated['meta_description'],
            og_description: generated['og_description'],
          });
          this.notification.showSuccess(
            'Draf deskripsi halaman sudah diisi. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showContentAssistantError(error),
      });
  }

  private slugifyAssistant(value: string): string {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 255);
  }

  private showContentAssistantError(error: any): void {
    this.notification.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Bantuan AI belum aktif. Tambahkan OPENAI_API_KEY pada konfigurasi backend.'
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
        this.parseLocale(
          this.form.controls.website_page_default_locale.value,
        ) ?? 'id-ID';

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

  private parseLocale(value: string): WebsitePageEditorLocale | null {
    if (value === 'id-ID' || value === 'en-US') {
      return value;
    }

    return null;
  }

  //==================================================
  //==== TRANSLATION SLUG
  //==================================================

  generateTranslationSlug(locale: WebsitePageEditorLocale): void {
    const group = this.translationForm(locale);

    if (group.controls.slug.value.trim()) {
      return;
    }

    group.controls.slug.setValue(this.slugify(group.controls.title.value));
  }

  normalizeTranslationSlug(locale: WebsitePageEditorLocale): void {
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
    let invalidLocale: WebsitePageEditorLocale | null = null;

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
      description: this.gadgetHomeMediaRequirement(rule),
      multiple: false,
      maxSelection: 1,
      disabledSelectionIds,
      validateSelection: (attachment) =>
        this.gadgetHomeAttachmentIssue(attachment, rule),
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
      const [attachment] = this.toAttachmentArray(selection);
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
        this.pageMedia.push(this.createMediaDraft(attachment, role));
      }

      this.pageMedia = this.sortGadgetHomeMedia(this.pageMedia);
      this.activeHomeMediaRole = null;
      return;
    }

    const selected = this.isGadgetHomeTemplate
      ? this.toAttachmentArray(selection).slice(
          0,
          this.gadgetHomeMediaRoles.length,
        )
      : this.toAttachmentArray(selection);

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

      return this.createMediaDraft(attachment, role);
    });
  }

  private createMediaDraft(
    attachment: IAttachment,
    role: string,
  ): WebsitePageEditorMediaDraft {
    return {
      attachment,
      role,
      is_public: true,
      action_type: 'none',
      action_value: '',
      translations: this.createEmptyMediaTranslations(),
    };
  }

  private sortGadgetHomeMedia(
    media: WebsitePageEditorMediaDraft[],
  ): WebsitePageEditorMediaDraft[] {
    const order = new Map(
      this.gadgetHomeMediaRoles.map((option, index) => [option.value, index]),
    );

    return [...media].sort(
      (left, right) =>
        (order.get(left.role) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.role) ?? Number.MAX_SAFE_INTEGER),
    );
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

  gadgetHomeMediaRule(role: string): GadgetHomeMediaRule | null {
    return getGadgetHomeMediaRule(role);
  }

  gadgetHomeMediaRequirement(rule: GadgetHomeMediaRule): string {
    return `Rekomendasi ${rule.recommendedWidth} × ${rule.recommendedHeight}px · minimal ${rule.minWidth} × ${rule.minHeight}px`;
  }

  gadgetHomeMediaIssue(media: WebsitePageEditorMediaDraft): string | null {
    const rule = getGadgetHomeMediaRule(media.role);

    if (!rule) {
      return media.role === 'og'
        ? null
        : 'Slot gambar tidak dikenali. Pilih slot desain yang tersedia.';
    }

    return this.gadgetHomeAttachmentIssue(media.attachment, rule);
  }

  gadgetHomeAttachmentIssue(
    attachment: IAttachment,
    rule: GadgetHomeMediaRule,
  ): string | null {
    if (!this.pageMediaAccept.includes(attachment.mime_type)) {
      return 'Format harus JPEG, PNG, atau WebP.';
    }

    const width = attachment.width;
    const height = attachment.height;

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

  gadgetHomeMediaActionIssue(
    media: WebsitePageEditorMediaDraft,
  ): string | null {
    const target = media.action_value;

    if (media.action_type === 'none') {
      return target
        ? 'Banner tanpa aksi tidak boleh memiliki tujuan tautan.'
        : null;
    }

    if (!target) {
      return 'Tujuan tautan wajib diisi untuk aksi banner ini.';
    }

    if (
      media.action_type === 'external' &&
      !/^https:\/\/[^\s]+$/i.test(target)
    ) {
      return 'Tautan eksternal harus berupa alamat HTTPS lengkap.';
    }

    if (
      media.action_type === 'internal' &&
      (!/^\/(?!\/)[^\s]*$/.test(target) || target.includes('..'))
    ) {
      return 'Halaman website harus diawali / dan tidak boleh memuat ..';
    }

    if (
      (media.action_type === 'product' || media.action_type === 'category') &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)
    ) {
      return 'Gunakan slug huruf kecil, angka, dan tanda hubung.';
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
      this.pageMedia.some((media) => this.gadgetHomeMediaIssue(media) !== null)
    );
  }

  get gadgetHomeMediaHasInvalidActions(): boolean {
    return (
      this.isGadgetHomeTemplate &&
      this.pageMedia.some(
        (media) => this.gadgetHomeMediaActionIssue(media) !== null,
      )
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
      this.parseLocale(this.form.controls.website_page_default_locale.value) ??
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

          const slug = value.slug.trim() || this.slugify(title);

          return {
            website_page_locale: language.locale,

            website_page_slug: slug,

            website_page_title: title,

            website_page_excerpt: value.excerpt.trim() || null,

            website_page_content: value.content || null,

            website_page_content_json: this.isGadgetHomeTemplate
              ? this.buildHomeContentJson(
                  language.locale,
                  existing?.website_page_content_json,
                )
              : this.isAboutTemplate
                ? this.buildAboutContentJson(
                    language.locale,
                    existing?.website_page_content_json,
                  )
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
      return this.toPreviewIso(this.publicationPublishAt);
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
      return this.toPreviewIso(this.publicationUnpublishAt);
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.website_page_unpublish_at ?? null;
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

  previewLanguageLabelKey(locale: string): string {
    return locale === 'en-US'
      ? 'website_page.language_english'
      : 'website_page.language_indonesian';
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

      return;
    }

    if (this.gadgetHomeMediaBlocksSave || this.aboutMediaBlocksSave) {
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

    this.submitted.emit({
      payload,

      publicationActions: this.buildPublicationActions(),
    });
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

          website_page_publish_at: this.toPreviewIso(this.publicationPublishAt),

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
    const control = this.form.controls.website_page_key;

    const normalized = control.value.trim().toLowerCase().replace(/\s+/g, '-');

    control.setValue(normalized);
  }

  //==================================================
  //==== NEXT
  //==================================================

  goToContent(): void {
    const controls = this.form.controls;

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
      this.activeTab = 'general';

      return;
    }

    this.activeTab = 'content';
  }
}
