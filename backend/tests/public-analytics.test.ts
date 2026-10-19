import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLikelyBot,
  normalizePublicAnalyticsInput,
  trustedCountryCode,
} from '../src/helper/public-analytics.helper';

const secret = 'local-test-secret-with-at-least-32-characters';
const now = new Date('2026-10-13T05:00:00.000Z');
const validPayload = {
  event_id: '123e4567-e89b-42d3-a456-426614174000',
  session_id: '123e4567-e89b-42d3-a456-426614174001',
  event_name: 'page_view',
  path: '/en/products/latex-mattress?ignored=yes#details',
  locale: 'en-US',
  referrer: 'https://www.google.com/search?q=matex-secret-query',
  utm_source: 'google',
  utm_medium: 'organic',
  utm_campaign: 'launch',
  target_key: null,
  occurred_at: '2026-10-13T04:59:30.000Z',
};

test('normalizes an analytics event without retaining the anonymous session id', () => {
  const result = normalizePublicAnalyticsInput(validPayload, secret, now);

  assert.ok(result);
  assert.equal(result.path, '/en/products/latex-mattress');
  assert.equal(result.referrerHost, 'www.google.com');
  assert.equal(result.sessionHash.length, 64);
  assert.notEqual(result.sessionHash, validPayload.session_id);
  assert.equal(
    normalizePublicAnalyticsInput(validPayload, secret, now)?.sessionHash,
    result.sessionHash,
  );
});

test('rejects malformed, expired, future, and protocol-relative analytics events', () => {
  const invalidValues = [
    { ...validPayload, event_id: 'not-a-uuid' },
    { ...validPayload, session_id: 'not-a-uuid' },
    { ...validPayload, event_name: 'password_entered' },
    { ...validPayload, path: 'https://example.com/private' },
    { ...validPayload, path: '//example.com/private' },
    { ...validPayload, locale: 'fr-FR' },
    { ...validPayload, occurred_at: '2026-10-12T04:59:59.000Z' },
    { ...validPayload, occurred_at: '2026-10-13T05:05:01.000Z' },
  ];

  for (const value of invalidValues) {
    assert.equal(normalizePublicAnalyticsInput(value, secret, now), null);
  }
  assert.equal(normalizePublicAnalyticsInput(validPayload, 'too-short', now), null);
});

test('keeps only safe bounded campaign values and a referrer hostname', () => {
  const result = normalizePublicAnalyticsInput(
    {
      ...validPayload,
      referrer: 'mailto:private@example.com',
      utm_source: `google\u0000${'x'.repeat(200)}`,
    },
    secret,
    now,
  );

  assert.ok(result);
  assert.equal(result.referrerHost, null);
  assert.equal(result.utmSource?.length, 120);
  assert.equal(result.utmSource?.includes('\u0000'), false);
});

test('accepts only bounded LCP, INP, and CLS web vital values', () => {
  const metric = normalizePublicAnalyticsInput(
    {
      ...validPayload,
      event_name: 'web_vital',
      target_key: 'lcp',
      numeric_value: 2487.4459,
    },
    secret,
    now,
  );

  assert.ok(metric);
  assert.equal(metric.targetKey, 'LCP');
  assert.equal(metric.numericValue, 2487.446);
  assert.equal(
    normalizePublicAnalyticsInput(
      {
        ...validPayload,
        event_name: 'web_vital',
        target_key: 'TTFB',
        numeric_value: 100,
      },
      secret,
      now,
    ),
    null,
  );
  assert.equal(
    normalizePublicAnalyticsInput(
      {
        ...validPayload,
        event_name: 'web_vital',
        target_key: 'CLS',
        numeric_value: -1,
      },
      secret,
      now,
    ),
    null,
  );
});

test('trusts a country header only when explicitly enabled', () => {
  assert.equal(trustedCountryCode('id', false), null);
  assert.equal(trustedCountryCode('id', true), 'ID');
  assert.equal(trustedCountryCode('XX', true), null);
  assert.equal(trustedCountryCode('Indonesia', true), null);
});

test('identifies common automated traffic user agents', () => {
  assert.equal(isLikelyBot('Mozilla/5.0 Chrome/140 Safari/537.36'), false);
  assert.equal(isLikelyBot('Googlebot/2.1'), true);
  assert.equal(isLikelyBot('Mozilla/5.0 HeadlessChrome Lighthouse'), true);
});
