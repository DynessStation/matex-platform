// Office input rules, shared by create and update, including uniqueness. Invalid input throws
// HttpError.
import { PoolConnection } from 'mysql2/promise';

import { HttpError } from '../../../helper/http-error.helper';
import {
  isValidEmail,
  isValidHttpUrl,
  nullableString,
  slugFromText,
  toFlag,
} from '../../../helper/input.helper';

export interface NormalizedOfficeOperatingHour {
  day_of_week: number;
  sequence: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: 0 | 1;
}

export interface OfficeInput {
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  email: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  attendanceEnabled: 0 | 1;
  /** Stored radius: null while attendance is off. */
  attendanceRadiusMeter: number | null;
  websiteUrl: string | null;
  isPublic: 0 | 1;
  publicSlug: string | null;
  publicSortOrder: number;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  googleBusinessUrl: string | null;
  operatingHours: NormalizedOfficeOperatingHour[];
  /** Raw photo list; resolved against the database by resolveOfficeAttachments(). */
  attachments: unknown;
}

const invalid = (code: string, message: string) => new HttpError(400, code, message);

const optionalNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

export const readOfficeInput = (body: any): OfficeInput => {
  const code = String(body?.office_code ?? '')
    .trim()
    .toUpperCase();
  const name = String(body?.office_name ?? '').trim();
  const email = nullableString(body?.email);
  const websiteUrl = nullableString(body?.website_url);
  const googleMapsUrl = nullableString(body?.google_maps_url);
  const googleBusinessUrl = nullableString(body?.google_business_url);

  if (!code) throw invalid('OFFICE_CODE_REQUIRED', 'Office code is required');
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw invalid('OFFICE_CODE_INVALID', 'Office code contains invalid characters');
  }
  if (code.length > 50) throw invalid('OFFICE_CODE_TOO_LONG', 'Office code is too long');
  if (!name) throw invalid('OFFICE_NAME_REQUIRED', 'Office name is required');
  if (name.length > 255) throw invalid('OFFICE_NAME_TOO_LONG', 'Office name is too long');
  if (email && !isValidEmail(email)) {
    throw invalid('OFFICE_EMAIL_INVALID', 'Invalid office email address');
  }
  if ([websiteUrl, googleMapsUrl, googleBusinessUrl].some((url) => url && !isValidHttpUrl(url))) {
    throw invalid('OFFICE_URLS_INVALID', 'One or more office URLs are invalid');
  }

  const lat = optionalNumber(body?.lat);
  const lng = optionalNumber(body?.lng);
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
    throw invalid('OFFICE_LATITUDE_INVALID', 'Invalid latitude');
  }
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
    throw invalid('OFFICE_LONGITUDE_INVALID', 'Invalid longitude');
  }

  const attendanceEnabled = toFlag(body?.attendance_enabled, 0);
  const radius = optionalNumber(body?.attendance_radius_meter);
  if (radius !== null && (!Number.isInteger(radius) || radius <= 0)) {
    throw invalid(
      'OFFICE_ATTENDANCE_RADIUS_INVALID',
      'Attendance radius must be greater than zero',
    );
  }
  if (attendanceEnabled === 1 && (lat === null || lng === null || radius === null)) {
    throw invalid(
      'OFFICE_LOCATION_AND_ATTENDANCE_RADIUS_REQUIRED',
      'Location and attendance radius are required when attendance is enabled',
    );
  }

  const isPublic = toFlag(body?.is_public, 0);
  const publicSlug =
    isPublic === 1 ? slugFromText(nullableString(body?.public_slug) ?? name) : null;
  if (isPublic === 1 && !publicSlug) {
    throw invalid('OFFICE_PUBLIC_SLUG_REQUIRED', 'Public slug is required for public office');
  }
  const sortOrder = Number(body?.public_sort_order ?? 0);

  return {
    code,
    name,
    description: nullableString(body?.office_description),
    address: nullableString(body?.address),
    city: nullableString(body?.city),
    province: nullableString(body?.province),
    postalCode: nullableString(body?.postal_code),
    email,
    phone: nullableString(body?.phone),
    lat,
    lng,
    attendanceEnabled,
    attendanceRadiusMeter: attendanceEnabled === 1 ? radius : null,
    websiteUrl,
    isPublic,
    publicSlug,
    publicSortOrder: Number.isInteger(sortOrder) && sortOrder >= 0 ? sortOrder : 0,
    googlePlaceId: nullableString(body?.google_place_id),
    googleMapsUrl,
    googleBusinessUrl,
    operatingHours: validateOperatingHours(body?.operating_hours ?? []),
    attachments: body?.attachments ?? [],
  };
};

/** Office columns in the order used by INSERT and UPDATE. */
export const OFFICE_COLUMNS = [
  'office_code',
  'office_name',
  'office_description',
  'address',
  'city',
  'province',
  'postal_code',
  'email',
  'phone',
  'lat',
  'lng',
  'attendance_enabled',
  'attendance_radius_meter',
  'website_url',
  'is_public',
  'public_slug',
  'public_sort_order',
  'google_place_id',
  'google_maps_url',
  'google_business_url',
] as const;

export const officeColumnValues = (input: OfficeInput) => [
  input.code,
  input.name,
  input.description,
  input.address,
  input.city,
  input.province,
  input.postalCode,
  input.email,
  input.phone,
  input.lat,
  input.lng,
  input.attendanceEnabled,
  input.attendanceRadiusMeter,
  input.websiteUrl,
  input.isPublic,
  input.publicSlug,
  input.publicSortOrder,
  input.googlePlaceId,
  input.googleMapsUrl,
  input.googleBusinessUrl,
];

/** Audit view of the core office fields, from input or from an office row. */
export const officeCoreAudit = (input: OfficeInput) => ({
  office_code: input.code,
  office_name: input.name,
  office_description: input.description,
  address: input.address,
  city: input.city,
  province: input.province,
  postal_code: input.postalCode,
  email: input.email,
  phone: input.phone,
  lat: input.lat,
  lng: input.lng,
  attendance_enabled: input.attendanceEnabled,
  attendance_radius_meter: input.attendanceRadiusMeter,
  google_place_id: input.googlePlaceId,
  google_maps_url: input.googleMapsUrl,
  google_business_url: input.googleBusinessUrl,
});

export const officeCoreAuditFromRow = (row: any) => ({
  office_code: row.office_code,
  office_name: row.office_name,
  office_description: row.office_description ?? null,
  address: row.address ?? null,
  city: row.city ?? null,
  province: row.province ?? null,
  postal_code: row.postal_code ?? null,
  email: row.email ?? null,
  phone: row.phone ?? null,
  lat: row.lat === null ? null : Number(row.lat),
  lng: row.lng === null ? null : Number(row.lng),
  attendance_enabled: Number(row.attendance_enabled),
  attendance_radius_meter:
    row.attendance_radius_meter === null ? null : Number(row.attendance_radius_meter),
  google_place_id: row.google_place_id ?? null,
  google_maps_url: row.google_maps_url ?? null,
  google_business_url: row.google_business_url ?? null,
});

/** Audit view of the publication fields, from input or from an office row. */
export const officePublicationAudit = (input: OfficeInput) => ({
  website_url: input.websiteUrl,
  is_public: input.isPublic,
  public_slug: input.publicSlug,
  public_sort_order: input.publicSortOrder,
});

export const officePublicationAuditFromRow = (row: any) => ({
  website_url: row.website_url ?? null,
  is_public: Number(row.is_public),
  public_slug: row.public_slug ?? null,
  public_sort_order: Number(row.public_sort_order ?? 0),
});

export const normalizeTime = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}:${match[3] ?? '00'}` : null;
};

/** Up to 30 entries; days 1-7, sequences 1-10; a closed day has one entry with sequence 1. */
export const validateOperatingHours = (value: unknown): NormalizedOfficeOperatingHour[] => {
  if (!Array.isArray(value)) {
    throw invalid('OFFICE_OPERATING_HOURS_ARRAY_INVALID', 'Operating hours must be an array');
  }
  if (value.length > 30) {
    throw invalid('OFFICE_OPERATING_HOURS_AMOUNT_INVALID', 'Too many operating hour entries');
  }

  const result: NormalizedOfficeOperatingHour[] = [];
  const keys = new Set<string>();
  const closedDays = new Set<number>();
  const entriesPerDay = new Map<number, number>();

  for (const item of value) {
    const day = Number(item?.day_of_week);
    const sequence = item?.sequence === undefined ? 1 : Number(item.sequence);
    const isClosed = toFlag(item?.is_closed, 0);

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw invalid('OFFICE_OPERATING_DAY_INVALID', 'Invalid operating day');
    }
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10) {
      throw invalid('OFFICE_OPERATING_HOURS_SEQUENCE_INVALID', 'Invalid operating hour sequence');
    }
    const key = `${day}:${sequence}`;
    if (keys.has(key)) {
      throw invalid('OFFICE_OPERATING_HOURS_DUPLICATED', 'Duplicate operating hour entry');
    }
    keys.add(key);
    entriesPerDay.set(day, (entriesPerDay.get(day) ?? 0) + 1);

    if (isClosed === 1) {
      if (sequence !== 1) {
        throw invalid('OFFICE_OPERATING_DAY_SEQUENCE_INVALID', 'Closed day must use sequence 1');
      }
      closedDays.add(day);
      result.push({ day_of_week: day, sequence, open_time: null, close_time: null, is_closed: 1 });
      continue;
    }

    const openTime = normalizeTime(item?.open_time);
    const closeTime = normalizeTime(item?.close_time);
    if (!openTime || !closeTime) {
      throw invalid(
        'OFFICE_OPERATING_HOURS_OPEN_CLOSE_INVALID',
        'Open and close time are required for operating days',
      );
    }
    if (openTime === closeTime) {
      throw invalid(
        'OFFICE_OPERATING_HOURS_SAME_OPEN_CLOSE',
        'Open time and close time cannot be the same',
      );
    }
    result.push({
      day_of_week: day,
      sequence,
      open_time: openTime,
      close_time: closeTime,
      is_closed: 0,
    });
  }

  for (const day of closedDays) {
    if ((entriesPerDay.get(day) ?? 0) > 1) {
      throw invalid(
        'OFFICE_OPERATING_HOURS_CONTAIN_ANOTHER_OPERATING_TIME',
        'Closed day cannot contain another operating time',
      );
    }
  }

  return result.sort((a, b) => a.day_of_week - b.day_of_week || a.sequence - b.sequence);
};

/** Throws 409 when another active or inactive office uses the code, name, or public slug. */
export const assertOfficeUnique = async (
  connection: PoolConnection,
  idMasterComp: number,
  input: OfficeInput,
  excludeIdOffice?: number,
): Promise<void> => {
  const exclude = excludeIdOffice ? 'AND id_office != ?' : '';
  const excludeParams = excludeIdOffice ? [excludeIdOffice] : [];

  const [duplicates] = await connection.query(
    `SELECT id_office FROM office
     WHERE id_master_comp = ? ${exclude} AND status IN (0, 1)
       AND (UPPER(COALESCE(office_code, '')) = UPPER(?) OR LOWER(office_name) = LOWER(?))
     LIMIT 1`,
    [idMasterComp, ...excludeParams, input.code, input.name],
  );
  if ((duplicates as unknown[]).length) {
    throw new HttpError(
      409,
      'OFFICE_ALREADY_EXISTS',
      'Office code or office name is already in use',
    );
  }

  if (!input.publicSlug) return;
  const [slugs] = await connection.query(
    `SELECT id_office FROM office
     WHERE id_master_comp = ? ${exclude} AND public_slug = ? AND status IN (0, 1)
     LIMIT 1`,
    [idMasterComp, ...excludeParams, input.publicSlug],
  );
  if ((slugs as unknown[]).length) {
    throw new HttpError(409, 'OFFICE_PUBLIC_SLUG_EXISTS', 'Public office slug is already in use');
  }
};
