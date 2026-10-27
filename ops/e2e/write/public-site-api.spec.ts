import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  adminReferences,
  apiContext,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
  saveRecording,
} from './api-contract';
import { stack } from './stack.mjs';

// API contract for the public site endpoints without a module spec of their own: fixed pages
// (backend/src/ctrl/public/website-page.ts), robots.txt and the sitemap (public/seo.ts), the
// analytics beacon (public/analytics.ts), and the admin analytics overview (admin/analytics.ts).
test.describe.configure({ mode: 'serial' });

let anonymous: APIRequestContext;
let owner: APIRequestContext;

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('public-site-api', []);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('fixed pages by language and address', async () => {
  const page = await expectCode(
    await anonymous.get('/api/public/website-page/id-ID/tentang-matex'),
    200,
    'WEBSITE_PAGE_FOUND',
  );
  expect(page.data).toMatchObject({ key: 'about', locale: 'id-ID' });
  const english = await expectCode(
    await anonymous.get('/api/public/website-page/en-US/about-matex'),
    200,
  );
  expect(english.data.key).toBe('about');
  for (const path of [
    'fr-FR/tentang-matex',
    'id-ID/about-matex',
    'id-ID/Not_A_Slug',
    'id-ID/no-such-page',
  ]) {
    await expectCode(
      await anonymous.get(`/api/public/website-page/${path}`),
      404,
      'WEBSITE_PAGE_NOT_FOUND',
    );
  }
});

test('robots.txt and the sitemap', async () => {
  const robots = await anonymous.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toMatch(
    /^User-agent: \*\nAllow: \/\n[\s\S]*Sitemap: http.*\/sitemap\.xml\n$/,
  );

  const sitemap = await anonymous.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('application/xml');
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset');
  expect(xml).toContain('/tentang-matex');
  expect(xml).toContain('/en/about-matex');
});

test('the analytics beacon', async () => {
  const config = await expectCode(
    await anonymous.get('/api/public/analytics/config'),
    200,
    'ANALYTICS_CONFIG_FOUND',
  );
  expect(config.data).toEqual({ enabled: true });

  const event = {
    event_id: randomUUID(),
    session_id: randomUUID(),
    event_name: 'page_view',
    path: '/tentang-matex',
    locale: 'id-ID',
    occurred_at: new Date().toISOString(),
  };
  const send = (data: Record<string, unknown>, headers: Record<string, string> = {}) =>
    anonymous.post('/api/public/analytics/event', { data, headers });
  const stored = await expectCode(await send(event), 202, 'ANALYTICS_EVENT_ACCEPTED');
  expect(stored.data).toEqual({ stored: true });
  // The same event id is stored once.
  const repeated = await expectCode(await send(event), 202, 'ANALYTICS_EVENT_ACCEPTED');
  expect(repeated.data).toEqual({ stored: false });
  await expectCode(
    await send(event, { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }),
    202,
    'ANALYTICS_IGNORED',
  );
  for (const changes of [
    { event_id: 'not-a-uuid' },
    { event_name: 'purchase' },
    { path: 'no-slash' },
    { path: '//evil.example' },
    { locale: 'fr-FR' },
    { occurred_at: '2000-01-01T00:00:00Z' },
    { event_name: 'web_vital', target_key: 'FID', numeric_value: 1 },
  ]) {
    await expectCode(
      await send({ ...event, event_id: randomUUID(), ...changes }),
      400,
      'ANALYTICS_EVENT_INVALID',
    );
  }
  await expectCode(
    await send({
      ...event,
      event_id: randomUUID(),
      event_name: 'web_vital',
      target_key: 'lcp',
      numeric_value: 1234.5678,
    }),
    202,
    'ANALYTICS_EVENT_ACCEPTED',
  );
});

test('the admin analytics overview', async () => {
  await expectCode(await anonymous.get('/api/v1/analytics/overview'), 401, 'AUTH_TOKEN_REQUIRED');
  owner = await login(admin.identity, admin.password);
  const overview = await expectCode(await owner.get('/api/v1/analytics/overview'), 200);
  expect(overview.data).toEqual(expect.any(Object));
  for (const params of [
    { from: '2026-02-01', to: '2026-01-01' },
    { from: '2025-01-01', to: '2026-01-01' },
  ]) {
    await expectCode(
      await owner.get('/api/v1/analytics/overview', { params }),
      400,
      'ANALYTICS_RANGE_INVALID',
    );
  }

  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Dasbor', []);
  const account = await createAdminAccount(
    owner,
    'Dasbor',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(
      await limited.get('/api/v1/analytics/overview'),
      403,
      'AUTH_PERMISSION_DENIED',
    );
  } finally {
    await limited.dispose();
  }
});

test('the SSR servers do not announce Express (SEC-007)', async () => {
  const pages = await apiContext();
  try {
    for (const url of [
      `${stack.publicOrigin}/`,
      `${stack.publicOrigin}/produk/tidak-ada-sec-007`,
      `${stack.adminOrigin}/auth/login`,
    ]) {
      const response = await pages.get(url);
      expect(response.status(), url).toBeLessThan(500);
      expect(response.headers()['x-powered-by'], url).toBeUndefined();
    }
  } finally {
    await pages.dispose();
  }
});
