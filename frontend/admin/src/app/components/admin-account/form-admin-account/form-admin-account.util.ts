import { Select2Data } from 'ng-select2-component';

import {
  ADMIN_DEFAULT_COUNTRY_CODE,
  AdminPasswordStrength,
} from './form-admin-account.model';
import { countryCodes } from '../../../shared/data/country-code';
import {
  IAdminAccountSelectOption,
  IAdminAccountSelectResponse,
} from '../../../shared/interface/admin-account.interface';

// Stateless helpers of the admin account form.

//==================================================
//==== SPLIT PHONE NUMBER
//==================================================

export function splitPhoneNumber(value: string | null): {
  countryCode: string;
  phone: string;
} {
  //==================================================
  //==== EMPTY
  //==================================================

  if (!value) {
    return {
      countryCode: ADMIN_DEFAULT_COUNTRY_CODE,
      phone: '',
    };
  }

  //==================================================
  //==== NORMALIZE
  //==================================================

  const normalized = String(value).replace(/\D/g, '');

  //==================================================
  //==== LEGACY LOCAL NUMBER
  //==================================================

  if (normalized.startsWith('0')) {
    return {
      countryCode: ADMIN_DEFAULT_COUNTRY_CODE,

      phone: normalized.substring(1),
    };
  }

  //==================================================
  //==== MATCH COUNTRY (longest code first)
  //==================================================

  const codes = (countryCodes as any[])
    .map((item) => String(item.value ?? ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const countryCode = codes.find((code) => normalized.startsWith(code));

  //==================================================
  //==== FALLBACK
  //==================================================

  if (!countryCode) {
    return {
      countryCode: ADMIN_DEFAULT_COUNTRY_CODE,
      phone: normalized,
    };
  }

  return {
    countryCode,

    phone: normalized.substring(countryCode.length),
  };
}

//==================================================
//==== PASSWORD STRENGTH
//==================================================

export function getPasswordStrength(value: string): AdminPasswordStrength {
  if (!value) {
    return null;
  }

  let score = 0;

  if (value.length >= 8) {
    score++;
  }

  if (value.length >= 12) {
    score++;
  }

  if (/\p{Ll}/u.test(value)) {
    score++;
  }

  if (/\p{Lu}/u.test(value)) {
    score++;
  }

  if (/\d/.test(value)) {
    score++;
  }

  if (/[^\p{L}\d]/u.test(value)) {
    score++;
  }

  if (score <= 3) {
    return 'weak';
  }

  if (score <= 5) {
    return 'normal';
  }

  return 'strong';
}

//==================================================
//==== FIELD SANITIZERS
//==================================================

/** Keeps letters, spaces, and . , ' - */
export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s.,'-]/gu, '');
}

/** Trims, collapses spaces, and capitalizes each word. */
export function normalizeName(value: string): string {
  return value
    .trim()

    .replace(/\s+/g, ' ')

    .replace(
      /(^|[\s'-])(\p{L})/gu,

      (_match, prefix: string, letter: string) => prefix + letter.toUpperCase(),
    );
}

/** Keeps ASCII letters and digits. */
export function sanitizeAlias(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

/** Keeps digits and drops leading zeros (the country code is separate). */
export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

//==================================================
//==== LOOKUP OPTIONS
//==================================================

/** Merges two option lists by value; incoming options replace current ones. */
export function mergeLookupOptions(
  current: Select2Data,
  incoming: IAdminAccountSelectOption[],
): Select2Data {
  const result = new Map<string, IAdminAccountSelectOption>();

  (current as IAdminAccountSelectOption[]).forEach((item) => {
    result.set(String(item.value), item);
  });

  incoming.forEach((item) => {
    result.set(String(item.value), item);
  });

  return Array.from(result.values());
}

/** The response a company-bound lookup returns while no company is chosen. */
export function emptyLookupResponse(
  limit: number,
): IAdminAccountSelectResponse {
  return {
    success: true,

    data: [],

    pagination: {
      page: 1,
      limit,
      total: 0,
      has_more: false,
    },
  };
}
