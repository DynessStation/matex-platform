// Pure helpers of the fixed website page form: content drafts, media checks, slugs, and
// publication dates. No component state.
import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

import {
  WebsitePageEditorLocale,
  HOME_SECTION_KEYS,
  HomeSectionVisibility,
  HOME_SECTION_DEFAULTS,
  HomeLatexContentDraft,
  HomeAdvertisementDraft,
  AboutFeatureDraft,
  ABOUT_CONTRACT_VERSION,
  WebsitePageEditorMediaTranslationDraft,
  WebsitePageEditorMediaDraft,
  PAGE_MEDIA_ACCEPT,
  GADGET_HOME_MEDIA_ROLES,
} from './website-page-form.model';
import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';
import {
  GadgetHomeMediaRule,
  getGadgetHomeMediaRule,
} from '../../../shared/data/gadget-home-media';
import { IAttachment } from '../../../shared/interface/attachment.interface';

export function createHomeSectionVisibility(): HomeSectionVisibility {
  return { ...HOME_SECTION_DEFAULTS };
}

export function readHomeSectionVisibility(
  content: unknown,
): HomeSectionVisibility {
  const visibility = createHomeSectionVisibility();
  if (!isRecord(content)) return visibility;

  const keys = [2, 3].includes(Number(content['home_contract_version']))
    ? HOME_SECTION_KEYS
    : (['tags', 'newsletter'] as const);

  for (const key of keys) {
    const section = content[key];
    if (isRecord(section) && typeof section['status'] === 'boolean') {
      visibility[key] = section['status'];
    }
  }

  return visibility;
}

export function buildHomeContentJson(
  existing: unknown,
  visibility: HomeSectionVisibility,
  latex: HomeLatexContentDraft,
  advertisement: HomeAdvertisementDraft,
): Record<string, unknown> {
  const source = isRecord(existing) ? existing : {};
  const content: Record<string, unknown> = { home_contract_version: 3 };

  for (const key of HOME_SECTION_KEYS) {
    const current = isRecord(source[key]) ? source[key] : {};
    content[key] = {
      ...current,
      status: visibility[key],
    };
  }

  content['latex_features'] = {
    ...(isRecord(content['latex_features']) ? content['latex_features'] : {}),
    ...latex,
    items: latex.items
      .map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
      }))
      .filter((item) => item.title && item.description),
    status: visibility.latex_features,
  };
  content['advertisement'] = {
    ...(isRecord(content['advertisement']) ? content['advertisement'] : {}),
    ...advertisement,
    status: visibility.advertisement,
  };

  return content;
}

export function createHomeLatexContent(
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

export function readHomeLatexContent(
  locale: WebsitePageEditorLocale,
  content: unknown,
): HomeLatexContentDraft {
  const defaults = createHomeLatexContent(locale);
  if (!isRecord(content) || !isRecord(content['latex_features']))
    return defaults;
  const section = content['latex_features'];
  const items = Array.isArray(section['items'])
    ? section['items']
        .filter((item): item is Record<string, unknown> => isRecord(item))
        .map((item) => ({
          title: typeof item['title'] === 'string' ? item['title'] : '',
          description:
            typeof item['description'] === 'string' ? item['description'] : '',
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
      typeof section['title'] === 'string' ? section['title'] : defaults.title,
    description:
      typeof section['description'] === 'string'
        ? section['description']
        : defaults.description,
    items: items.length ? items : defaults.items,
  };
}

export function createHomeAdvertisementContent(
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

export function readHomeAdvertisementContent(
  locale: WebsitePageEditorLocale,
  content: unknown,
): HomeAdvertisementDraft {
  const defaults = createHomeAdvertisementContent(locale);
  if (!isRecord(content) || !isRecord(content['advertisement']))
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

export function createAboutFeatures(): AboutFeatureDraft[] {
  return Array.from({ length: 3 }, () => ({ title: '', description: '' }));
}

export function readAboutFeatures(content: unknown): AboutFeatureDraft[] {
  const result = createAboutFeatures();
  if (!isRecord(content)) return result;

  const highlights =
    content['about_contract_version'] === ABOUT_CONTRACT_VERSION &&
    Array.isArray(content['highlights'])
      ? content['highlights']
      : Array.isArray(content['features'])
        ? content['features']
        : [];

  highlights.slice(0, 3).forEach((item, index) => {
    if (!isRecord(item)) return;
    result[index] = {
      title: typeof item['title'] === 'string' ? item['title'] : '',
      description:
        typeof item['description'] === 'string' ? item['description'] : '',
    };
  });

  return result;
}

export function buildAboutContentJson(
  features: AboutFeatureDraft[],
): Record<string, unknown> {
  return {
    about_contract_version: ABOUT_CONTRACT_VERSION,
    highlights: features
      .map((feature) => ({
        title: feature.title.trim(),
        description: feature.description.trim(),
      }))
      .filter((feature) => feature.title && feature.description),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createEmptyMediaTranslations(): Record<
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

export function parseLocale(value: string): WebsitePageEditorLocale | null {
  if (value === 'id-ID' || value === 'en-US') {
    return value;
  }

  return null;
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createMediaDraft(
  attachment: IAttachment,
  role: string,
): WebsitePageEditorMediaDraft {
  return {
    attachment,
    role,
    is_public: true,
    action_type: 'none',
    action_value: '',
    translations: createEmptyMediaTranslations(),
  };
}

export function sortGadgetHomeMedia(
  media: WebsitePageEditorMediaDraft[],
): WebsitePageEditorMediaDraft[] {
  const order = new Map(
    GADGET_HOME_MEDIA_ROLES.map((option, index) => [option.value, index]),
  );

  return [...media].sort(
    (left, right) =>
      (order.get(left.role) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.role) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function gadgetHomeMediaRequirement(rule: GadgetHomeMediaRule): string {
  return `Rekomendasi ${rule.recommendedWidth} × ${rule.recommendedHeight}px · minimal ${rule.minWidth} × ${rule.minHeight}px`;
}

export function gadgetHomeMediaIssue(
  media: WebsitePageEditorMediaDraft,
): string | null {
  const rule = getGadgetHomeMediaRule(media.role);

  if (!rule) {
    return media.role === 'og'
      ? null
      : 'Slot gambar tidak dikenali. Pilih slot desain yang tersedia.';
  }

  return gadgetHomeAttachmentIssue(media.attachment, rule);
}

export function gadgetHomeAttachmentIssue(
  attachment: IAttachment,
  rule: GadgetHomeMediaRule,
): string | null {
  if (!PAGE_MEDIA_ACCEPT.includes(attachment.mime_type)) {
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
  const ratioDifference = Math.abs(actualRatio - expectedRatio) / expectedRatio;

  if (ratioDifference > rule.ratioTolerance) {
    return `Rasio gambar tidak sesuai slot. Gunakan rasio ${rule.recommendedWidth}:${rule.recommendedHeight}.`;
  }

  return null;
}

export function gadgetHomeMediaActionIssue(
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

  if (media.action_type === 'external' && !/^https:\/\/[^\s]+$/i.test(target)) {
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

export function toAttachmentArray(selection: MediaSelection): IAttachment[] {
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

export function toPreviewIso(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function previewLanguageLabelKey(locale: string): string {
  return locale === 'en-US'
    ? 'website_page.language_english'
    : 'website_page.language_indonesian';
}

export function previewVisibilityKey(value: number): string {
  if (value === 0) {
    return 'private';
  }

  if (value === 2) {
    return 'unlisted';
  }

  return 'public';
}

export function toLocalDateTimeInput(value: string | null): string {
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

export function publicationDateValue(value: NgbDateStruct | null): Date | null {
  if (!value) {
    return null;
  }

  return new Date(value.year, value.month - 1, value.day, 0, 0, 0, 0);
}

export function composePublicationDateTime(
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

export function dateToNgbDate(date: Date): NgbDateStruct {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}
