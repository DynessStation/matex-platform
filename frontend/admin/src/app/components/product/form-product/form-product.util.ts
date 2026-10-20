import {
  PRODUCT_GALLERY_LIMIT,
  ProductAssistField,
  ProductSpecificationRow,
} from './form-product.model';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { ContentAssistantFieldType } from '../../../shared/services/content-assistant.service';

// Stateless helpers of the product form.

//==================================================
//==== SPECIFICATIONS
//==================================================

/** Reads stored specifications (object, array, JSON text, or plain text) as editor rows. */
export function specificationRows(value: unknown): ProductSpecificationRow[] {
  let parsed = value;
  for (let depth = 0; depth < 2 && typeof parsed === 'string'; depth++) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = { Informasi: parsed };
      break;
    }
  }
  if (Array.isArray(parsed))
    return parsed.map((item: any, index) => ({
      label: String(item?.label ?? item?.key ?? `Spesifikasi ${index + 1}`),
      value: String(item?.value ?? item?.text ?? ''),
    }));
  if (parsed && typeof parsed === 'object')
    return Object.entries(parsed as Record<string, unknown>).map(
      ([label, itemValue]) => ({
        label: label === 'text' ? 'Informasi' : label,
        value:
          typeof itemValue === 'object'
            ? JSON.stringify(itemValue)
            : String(itemValue ?? ''),
      }),
    );
  return [];
}

/** Editor rows as the stored label -> value object, or null when nothing is filled. */
export function specificationPayload(
  rows: ProductSpecificationRow[],
): Record<string, string> | null {
  const entries = rows
    .map((row) => [row.label.trim(), row.value.trim()] as const)
    .filter(([label, value]) => label && value);
  return entries.length ? Object.fromEntries(entries) : null;
}

//==================================================
//==== MEDIA
//==================================================

/** Drops duplicate and empty gallery items and keeps the first ten. */
export function uniqueGallery(value: IAttachment[]): IAttachment[] {
  const seen = new Set<string>();
  return value
    .filter((item: IAttachment) => {
      const id = String(item?.id_attachment ?? '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, PRODUCT_GALLERY_LIMIT);
}

//==================================================
//==== FORMAT
//==================================================

/** Grams as kilograms, millimetres as centimetres, in the admin's number format. */
export function formatMeasurement(
  raw: number,
  unit: 'grams' | 'mm',
  locale: string,
): string {
  if (unit === 'grams') {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(raw / 1000)} kg`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(raw / 10)} cm`;
}

export function formatPrice(amount: number, currency: 'IDR' | 'USD'): string {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

/** How the content assistant should treat a product field. */
export function assistFieldType(
  field: ProductAssistField,
): ContentAssistantFieldType {
  return field === 'description'
    ? 'rich_text_html'
    : field === 'short_description'
      ? 'multiline_text'
      : 'seo_description';
}
