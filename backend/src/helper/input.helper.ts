import { normalizePublicContentKey } from '../config/public-content.config';

// Normalizers and validators for request input, shared by the route modules.

/** Trimmed string, or null when the value is not a string or is blank. */
export const nullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const clean = value.trim();

  return clean || null;
};

/** Any value as a trimmed string cut to `max` characters ('' for null/undefined). */
export const trimTo = (value: unknown, max: number): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

/** 1/0 from true/false, 1/0, '1'/'0', 'true'/'false'; anything else gives `fallback`. */
export const toFlag = (value: unknown, fallback: 0 | 1 = 0): 0 | 1 => parseFlag(value) ?? fallback;

/** 1/0 from true/false, 1/0, '1'/'0', 'true'/'false'; anything else gives null. */
export const parseFlag = (value: unknown): 0 | 1 | null => {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return 1;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return 0;
  }

  return null;
};

/** URL slug from free text: accents removed, lowercase, words joined by '-' ("Kantor É" -> "kantor-e"). */
export const slugFromText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/** Public content key or slug (see normalizePublicContentKey), at most 255 characters. */
export const contentSlug = (value: unknown): string =>
  normalizePublicContentKey(value).slice(0, 255);

export const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
