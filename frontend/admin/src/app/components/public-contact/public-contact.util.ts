import { InlineRow } from '../../shared/components/ui/inline-table/inline-table.model';
import {
  IContactInquiryTopic,
  IPublicContactChannel,
  IPublicContactTranslation,
  IPublicSocialAccount,
  PublicContactType,
} from '../../shared/interface/public-contact.interface';

// Pure rules of the contact settings page: table rows from and to the API, and the checks.

const text = (row: InlineRow, key: string) => String(row[key] ?? '').trim();

/** Numbers for the WhatsApp link: 08.. is Indonesia, as the server stores it. */
function whatsappDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

/** The link a channel gets from its value. */
export function channelLink(type: string, value: string): string {
  const clean = value.trim();
  if (!clean) return '';
  if (type === 'whatsapp') return `https://wa.me/${whatsappDigits(clean)}`;
  if (type === 'email') return `mailto:${clean}`;
  if (type === 'phone') return `tel:${clean.replace(/[\s().-]/g, '')}`;
  if (/^https?:\/\//i.test(clean)) return clean;
  return type === 'website' || type === 'other' ? `https://${clean}` : '';
}

/** Message key when a channel's value does not fit its type, else null. */
export function channelValueError(type: string, value: string): string | null {
  const clean = value.trim();
  if (!clean) return 'form_kit.required';
  if (type === 'email' && !isEmail(clean)) return 'form_kit.invalid_email';
  if (
    (type === 'whatsapp' || type === 'phone') &&
    !/^\+?[\d\s().-]{8,20}$/.test(clean)
  ) {
    return 'public_contact.invalid_phone';
  }
  return null;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isHttpUrl(value: unknown): boolean {
  return /^https?:\/\/\S+\.\S+$/i.test(String(value ?? '').trim());
}

const translated = (
  values: IPublicContactTranslation[] | undefined,
  locale: string,
) => values?.find((item) => item.locale === locale);

const translations = (row: InlineRow): IPublicContactTranslation[] => [
  {
    locale: 'id-ID',
    label: text(row, 'id_label'),
    description: text(row, 'id_description') || null,
    status: 1,
  },
  {
    locale: 'en-US',
    label: text(row, 'en_label'),
    description: text(row, 'en_description') || null,
    status: 1,
  },
];

const translationRow = (values?: IPublicContactTranslation[]) => ({
  id_label: translated(values, 'id-ID')?.label ?? '',
  id_description: translated(values, 'id-ID')?.description ?? '',
  en_label: translated(values, 'en-US')?.label ?? '',
  en_description: translated(values, 'en-US')?.description ?? '',
});

export const channelRow = (item: IPublicContactChannel): InlineRow => ({
  key: item.key,
  type: item.type,
  value: item.value,
  rank: item.is_primary === 1 ? 'primary' : 'normal',
  shown: item.is_public === 1 ? 'shown' : 'hidden',
  ...translationRow(item.translations),
});

export const channelPayload = (row: InlineRow): IPublicContactChannel => {
  const type = text(row, 'type') as PublicContactType;
  const value = text(row, 'value');
  return {
    key: text(row, 'key'),
    type,
    value,
    url: ['whatsapp', 'email', 'phone'].includes(type)
      ? null
      : channelLink(type, value) || null,
    is_primary: row['rank'] === 'primary' ? 1 : 0,
    is_public: row['shown'] === 'shown' ? 1 : 0,
    translations: translations(row),
  };
};

export const topicRow = (item: IContactInquiryTopic): InlineRow => ({
  key: item.key,
  recipient_email: item.recipient_email ?? '',
  shown: item.status === 1 ? 'shown' : 'hidden',
  ...translationRow(item.translations),
});

export const topicPayload = (row: InlineRow): IContactInquiryTopic => ({
  key: text(row, 'key'),
  recipient_email: text(row, 'recipient_email') || null,
  status: row['shown'] === 'shown' ? 1 : 0,
  translations: translations(row),
});

export const socialRow = (item: IPublicSocialAccount): InlineRow => ({
  key: item.key,
  platform: item.platform,
  name: item.name,
  url: item.url,
  status: item.is_active === 1 ? 'active' : 'inactive',
  shown: item.is_public === 1 ? 'shown' : 'hidden',
  followers: item.followers ?? '',
  content_count: item.content_count ?? '',
  stats_updated_at: item.stats_updated_at ?? '',
});

const countOrNull = (value: unknown): number | null => {
  const clean = String(value ?? '').trim();
  return clean === '' ? null : Number(clean);
};

export const socialPayload = (row: InlineRow): IPublicSocialAccount => {
  const active = row['status'] === 'active';
  return {
    key: text(row, 'key'),
    platform: text(row, 'platform'),
    name: text(row, 'name'),
    url: text(row, 'url'),
    is_active: active ? 1 : 0,
    // An inactive account is never shown.
    is_public: active && row['shown'] === 'shown' ? 1 : 0,
    followers: countOrNull(row['followers']),
    content_count: countOrNull(row['content_count']),
  };
};

/** The list with the row put in its place (or added), ready to send. */
export function withRow(
  rows: InlineRow[],
  row: InlineRow,
  index: number,
): InlineRow[] {
  const list = [...rows];
  list[index] = row;
  return list;
}

/** One main channel per type: this row's being main makes the others of its type normal. */
export function oneMainPerType(
  rows: InlineRow[],
  changed: InlineRow,
): InlineRow[] {
  if (changed['rank'] !== 'primary') return rows;
  return rows.map((row) =>
    row !== changed && row['type'] === changed['type']
      ? { ...row, rank: 'normal' }
      : row,
  );
}
