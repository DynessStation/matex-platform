import assert from 'node:assert/strict';
import test from 'node:test';

import {
  googleSeoConfiguration,
  pageSpeedTarget,
  searchConsoleDateRange,
  searchConsoleTotals,
} from '../src/helper/google-seo.helper';

test('Google SEO integrations stay disabled until every required secret exists', () => {
  const empty = googleSeoConfiguration({
    PUBLIC_SITE_URL: 'https://matexindo.com',
  });
  assert.equal(empty.searchConsole.configured, false);
  assert.equal(empty.pageSpeed.configured, false);

  const configured = googleSeoConfiguration({
    PUBLIC_SITE_URL: 'https://matexindo.com',
    GOOGLE_SEARCH_CONSOLE_SITE_URL: 'sc-domain:matexindo.com',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'seo@example.iam.gserviceaccount.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'line-one\\nline-two',
    GOOGLE_PAGESPEED_API_KEY: 'pagespeed-key',
  });
  assert.equal(configured.searchConsole.configured, true);
  assert.equal(configured.searchConsole.privateKey, 'line-one\nline-two');
  assert.equal(configured.pageSpeed.configured, true);
});

test('Search Console uses finalized dates and only supported ranges', () => {
  assert.deepEqual(searchConsoleDateRange(7, new Date('2026-10-13T10:00:00Z')), {
    days: 7,
    startDate: '2026-10-04',
    endDate: '2026-10-10',
  });
  assert.equal(searchConsoleDateRange(30), null);
});

test('PageSpeed accepts only same-origin paths and supported strategies', () => {
  assert.deepEqual(pageSpeedTarget('https://matexindo.com', '/produk', 'desktop'), {
    url: 'https://matexindo.com/produk',
    strategy: 'desktop',
  });
  assert.equal(pageSpeedTarget('https://matexindo.com', 'https://evil.test', 'mobile'), null);
  assert.equal(pageSpeedTarget('https://matexindo.com', '/', 'tablet'), null);
});

test('Search Console totals use impression-weighted average position', () => {
  const totals = searchConsoleTotals([
    { clicks: 4, impressions: 10, position: 2 },
    { clicks: 6, impressions: 30, position: 6 },
  ]);
  assert.equal(totals.clicks, 10);
  assert.equal(totals.impressions, 40);
  assert.equal(totals.ctr, 0.25);
  assert.equal(totals.position, 5);
});
