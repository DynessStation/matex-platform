import { createHmac } from 'node:crypto';

import { isPublicContentLocale } from '../config/public-content.config';

export const PUBLIC_ANALYTICS_EVENTS = [
  'page_view',
  'outbound_click',
  'contact_start',
  'contact_submit',
  'web_vital',
] as const;

export type PublicAnalyticsEventName = (typeof PUBLIC_ANALYTICS_EVENTS)[number];

export interface PublicAnalyticsInput {
  eventId: string;
  sessionHash: string;
  eventName: PublicAnalyticsEventName;
  path: string;
  locale: 'id-ID' | 'en-US';
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  targetKey: string | null;
  numericValue: number | null;
  occurredAt: Date;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eventNames = new Set<string>(PUBLIC_ANALYTICS_EVENTS);
const webVitalNames = new Set(['LCP', 'INP', 'CLS']);

const text = (value: unknown, maxLength: number): string | null => {
  const clean = String(value ?? '')
    // Strip control characters from visitor-supplied text before storing it.
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return clean ? clean.slice(0, maxLength) : null;
};

const referrerHost = (value: unknown): string | null => {
  const clean = text(value, 2000);
  if (!clean) return null;
  try {
    const parsed = new URL(clean);
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.hostname.toLowerCase().slice(0, 255)
      : null;
  } catch {
    return null;
  }
};

export const normalizePublicAnalyticsInput = (
  value: unknown,
  hashSecret: string,
  now = new Date(),
): PublicAnalyticsInput | null => {
  if (!value || typeof value !== 'object' || hashSecret.length < 32) return null;
  const body = value as Record<string, unknown>;
  const eventId = text(body.event_id, 36);
  const sessionId = text(body.session_id, 64);
  const eventName = text(body.event_name, 40);
  const rawPath = text(body.path, 1000);
  const locale = text(body.locale, 10);
  const occurredAt = new Date(String(body.occurred_at ?? ''));
  const targetKey = text(body.target_key, 120);
  const rawNumericValue =
    body.numeric_value === null || body.numeric_value === undefined
      ? null
      : Number(body.numeric_value);

  if (
    !eventId ||
    !uuidPattern.test(eventId) ||
    !sessionId ||
    !uuidPattern.test(sessionId) ||
    !eventName ||
    !eventNames.has(eventName) ||
    !rawPath ||
    !rawPath.startsWith('/') ||
    rawPath.startsWith('//') ||
    !locale ||
    !isPublicContentLocale(locale) ||
    Number.isNaN(occurredAt.getTime())
  ) {
    return null;
  }

  const ageMs = now.getTime() - occurredAt.getTime();
  if (ageMs > 24 * 60 * 60 * 1000 || ageMs < -5 * 60 * 1000) return null;

  let numericValue: number | null = null;
  let normalizedTargetKey = targetKey;
  if (eventName === 'web_vital') {
    normalizedTargetKey = targetKey?.toUpperCase() ?? null;
    const maximum = normalizedTargetKey === 'CLS' ? 100 : 600_000;
    if (
      !normalizedTargetKey ||
      !webVitalNames.has(normalizedTargetKey) ||
      rawNumericValue === null ||
      !Number.isFinite(rawNumericValue) ||
      rawNumericValue < 0 ||
      rawNumericValue > maximum
    ) {
      return null;
    }
    numericValue = Math.round(rawNumericValue * 1000) / 1000;
  }

  return {
    eventId,
    sessionHash: createHmac('sha256', hashSecret).update(sessionId).digest('hex'),
    eventName: eventName as PublicAnalyticsEventName,
    path: rawPath.split(/[?#]/, 1)[0] || '/',
    locale,
    referrerHost: referrerHost(body.referrer),
    utmSource: text(body.utm_source, 120),
    utmMedium: text(body.utm_medium, 120),
    utmCampaign: text(body.utm_campaign, 160),
    targetKey: normalizedTargetKey,
    numericValue,
    occurredAt,
  };
};

export const isLikelyBot = (userAgent: unknown): boolean =>
  /bot|crawler|spider|slurp|headless|lighthouse|pagespeed/i.test(String(userAgent ?? ''));

export const trustedCountryCode = (headerValue: unknown, trustHeader: boolean): string | null => {
  if (!trustHeader) return null;
  const code = String(headerValue ?? '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : null;
};
