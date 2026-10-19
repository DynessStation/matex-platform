import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import { AddressInfo } from 'node:net';

import { pool } from '../src/db';

const router = require('../src/ctrl/public/seo').default;
const originalQuery = pool.query;
const originalCompany = process.env.PUBLIC_COMPANY_ID;
const originalSiteUrl = process.env.PUBLIC_SITE_URL;
const app = express();
app.use(router);
const server = app.listen(0, '127.0.0.1');

let base = '';
let calls: { sql: string; params: unknown[] }[] = [];
let rows: any[][] = [];

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once('listening', resolve));
  }
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  pool.query = (async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });
    return [rows.shift() || [], []];
  }) as any;
});

after(async () => {
  pool.query = originalQuery;
  if (originalCompany === undefined) delete process.env.PUBLIC_COMPANY_ID;
  else process.env.PUBLIC_COMPANY_ID = originalCompany;
  if (originalSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = originalSiteUrl;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});

function reset() {
  process.env.PUBLIC_COMPANY_ID = '7';
  process.env.PUBLIC_SITE_URL = 'https://matexindo.com';
  calls = [];
  rows = [];
}

test('robots identifies the sitemap and keeps version two routes out of search', async () => {
  reset();
  const response = await fetch(`${base}/robots.txt`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^text\/plain/);
  assert.match(body, /Sitemap: https:\/\/matexindo\.com\/sitemap\.xml/);
  assert.match(body, /Disallow: \/cart/);
  assert.match(body, /Disallow: \/en\/cart/);
  assert.match(body, /Disallow: \/wishlist/);
  assert.equal(calls.length, 0);
});

test('sitemap fails closed when the deployment company is missing', async () => {
  reset();
  delete process.env.PUBLIC_COMPANY_ID;
  const response = await fetch(`${base}/sitemap.xml`);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 0);
});

test('sitemap contains only public v1 routes with localized content paths', async () => {
  reset();
  rows = [
    [
      {
        content_type: 'home',
        locale: 'id-ID',
        slug_or_path: 'home',
        last_modified: '2026-10-13T00:00:00.000Z',
      },
      {
        content_type: 'about',
        locale: 'en-US',
        slug_or_path: 'about-matex',
        last_modified: '2026-10-12T00:00:00.000Z',
      },
    ],
    [
      {
        content_type: 'product',
        locale: 'id-ID',
        slug_or_path: 'kasur-lateks',
        last_modified: '2026-10-11T00:00:00.000Z',
      },
    ],
    [
      {
        content_type: 'category',
        locale: 'en-US',
        slug_or_path: 'latex-mattress',
        last_modified: '2026-10-10T00:00:00.000Z',
      },
    ],
    [
      {
        content_type: 'article',
        locale: 'en-US',
        slug_or_path: 'natural-latex',
        last_modified: '2026-10-09T00:00:00.000Z',
      },
    ],
  ];

  const response = await fetch(`${base}/sitemap.xml`);
  const xml = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^application\/xml/);
  assert.match(xml, /<loc>https:\/\/matexindo\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/matexindo\.com\/en\/about-matex<\/loc>/);
  assert.match(xml, /<loc>https:\/\/matexindo\.com\/produk\/kasur-lateks<\/loc>/);
  assert.match(xml, /<loc>https:\/\/matexindo\.com\/en\/category\/latex-mattress<\/loc>/);
  assert.match(xml, /<loc>https:\/\/matexindo\.com\/en\/article\/natural-latex<\/loc>/);
  assert.doesNotMatch(xml, /\/cart|\/wishlist|\/checkout/);
  assert.match(xml, /<lastmod>2026-10-13<\/lastmod>/);
  assert.equal(calls.length, 4);
  assert.deepEqual(
    calls.map((call) => call.params),
    [[7], [7], [7], [7]],
  );
  assert.match(calls[0].sql, /NOT LIKE '%noindex%'/);
  assert.match(calls[0].sql, /website_page_is_published = 1/);
  assert.match(calls[1].sql, /product_status = 'published'/);
  assert.match(calls[3].sql, /article_status = 'published'/);
});
