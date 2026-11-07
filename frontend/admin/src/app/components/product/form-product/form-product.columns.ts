import { formatPrice } from './form-product.util';
import {
  InlineColumn,
  InlineOption,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import {
  IProductMarketplace,
  IProductPrice,
} from '../../../shared/interface/product.interface';

// The compact tables of the product form: their columns, and rows from and to the API.

const required = (value: unknown) =>
  String(value ?? '').trim() ? null : 'form_kit.required';

const AMOUNT = /^\d+(\.\d+)?$/;

const amountError = (value: unknown) => {
  const clean = String(value ?? '').trim();
  if (!clean) return 'form_kit.required';
  return AMOUNT.test(clean) ? null : 'product_form.invalid_amount';
};

const optionalAmountError = (value: unknown) =>
  String(value ?? '').trim() ? amountError(value) : null;

const STATUS_OPTIONS: InlineOption[] = [
  { value: 'active', label: 'Aktif', tone: 'success' },
  { value: 'inactive', label: 'Inaktif', tone: 'danger' },
];
const SHOWN_OPTIONS: InlineOption[] = [
  { value: 'shown', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
];

export const SPEC_COLUMNS: InlineColumn[] = [
  {
    key: 'label',
    label: 'product_form.spec_name',
    placeholder: 'Berat',
    validate: required,
  },
  {
    key: 'value',
    label: 'product_form.spec_value',
    placeholder: '0,6 kg',
    validate: required,
  },
];

const money = (value: unknown, currency: 'IDR' | 'USD') => {
  const clean = String(value ?? '').trim();
  return clean === '' || !AMOUNT.test(clean)
    ? clean
    : formatPrice(Number(clean), currency);
};

export const priceColumns = (currency: 'IDR' | 'USD'): InlineColumn[] => [
  {
    key: 'type',
    label: 'product_form.price_type',
    type: 'select',
    width: '120px',
    options: [
      { value: 'end_user', label: 'Konsumen' },
      { value: 'wholesale', label: 'Grosir' },
    ],
  },
  { key: 'label', label: 'product_form.price_label' },
  {
    key: 'amount',
    label: 'product_form.price_amount',
    type: 'number',
    decimals: 2,
    validate: amountError,
    placeholder: currency === 'USD' ? '12,50' : '150.000',
    compute: (row) => money(row['amount'], currency),
  },
  {
    key: 'compare_at',
    label: 'product_form.price_compare',
    type: 'number',
    decimals: 2,
    validate: optionalAmountError,
    compute: (row) => money(row['compare_at'], currency),
  },
  {
    key: 'status',
    label: 'product_form.status',
    type: 'select',
    width: '110px',
    options: STATUS_OPTIONS,
  },
  {
    key: 'shown',
    label: 'product_form.publication',
    type: 'select',
    width: '110px',
    options: SHOWN_OPTIONS,
  },
];

export const marketplaceColumns = (
  providers: { value: string; label: string }[],
): InlineColumn[] => [
  {
    key: 'provider',
    label: 'product_form.platform',
    type: 'select',
    width: '150px',
    options: providers,
  },
  {
    key: 'label',
    label: 'product_form.display_name',
    placeholder: 'MATEX Official Store',
  },
  {
    key: 'url',
    label: 'product_form.product_link',
    link: true,
    placeholder: 'https://',
    validate: (value) =>
      /^https?:\/\/\S+$/i.test(String(value ?? '').trim())
        ? null
        : 'form_kit.invalid_url',
  },
  {
    key: 'rank',
    label: 'product_form.channel_status',
    type: 'select',
    width: '110px',
    options: [
      { value: 'primary', label: 'Utama', tone: 'success' },
      { value: 'normal', label: 'Biasa', tone: 'info' },
    ],
  },
  {
    key: 'shown',
    label: 'product_form.publication',
    type: 'select',
    width: '110px',
    options: SHOWN_OPTIONS,
  },
];

const text = (value: unknown) => String(value ?? '').trim();
const numberOrNull = (value: unknown) =>
  text(value) === '' ? null : Number(text(value));

export const priceRow = (item: Partial<IProductPrice>): InlineRow => ({
  type: item.type ?? 'end_user',
  label: item.label ?? '',
  amount: item.amount ?? '',
  compare_at: item.compare_at ?? '',
  min_qty: item.min_qty ?? '',
  max_qty: item.max_qty ?? '',
  status: item.is_active === false ? 'inactive' : 'active',
  shown: item.is_public === false ? 'hidden' : 'shown',
});

export const pricePayload = (
  row: InlineRow,
  currency: 'IDR' | 'USD',
): IProductPrice =>
  ({
    type: text(row['type']),
    label: text(row['label']) || null,
    currency,
    amount: Number(text(row['amount'])),
    compare_at: numberOrNull(row['compare_at']),
    min_qty: numberOrNull(row['min_qty']),
    max_qty: numberOrNull(row['max_qty']),
    is_active: row['status'] === 'active',
    // Only an active consumer price can be on the website.
    is_public:
      row['type'] === 'end_user' &&
      row['status'] === 'active' &&
      row['shown'] === 'shown',
  }) as IProductPrice;

export const marketplaceRow = (
  item: Partial<IProductMarketplace>,
): InlineRow => ({
  provider: item.provider ?? 'shopee',
  label: item.label ?? '',
  url: item.url ?? '',
  sku: item.sku ?? '',
  price: item.price ?? '',
  currency: item.currency ?? 'IDR',
  rank: item.is_primary ? 'primary' : 'normal',
  shown: item.is_active === false ? 'hidden' : 'shown',
});

export const marketplacePayload = (row: InlineRow): IProductMarketplace =>
  ({
    provider: text(row['provider']),
    label: text(row['label']) || null,
    url: text(row['url']),
    sku: text(row['sku']) || null,
    price: numberOrNull(row['price']),
    currency: (text(row['currency']) || 'IDR').toUpperCase(),
    is_active: row['shown'] === 'shown',
    is_primary: row['rank'] === 'primary' && row['shown'] === 'shown',
  }) as IProductMarketplace;

/** One recommended channel: this row's being main makes the others normal. */
export function oneMainChannel(
  rows: InlineRow[],
  changed: InlineRow,
): InlineRow[] {
  if (changed['rank'] !== 'primary') return rows;
  return rows.map((row) =>
    row === changed ? row : { ...row, rank: 'normal' },
  );
}
