import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { admin, apiContext, expectCode, login, runId } from './api-contract';

// API contract for the insight bands of Kategori and Produk (backend/src/ctrl/admin/
// catalog-insight.ts): views and marketplace clicks counted, the audits, and the list filter.
test.describe.configure({ mode: 'serial' });

const products = '/api/v1/products';
const categories = '/api/v1/product-categories';
const slug = `wawasan-${runId}`;
const categorySlug = `wawasan-kat-${runId}`;

let owner: APIRequestContext;
let anonymous: APIRequestContext;
let categoryId = '';
let productId = '';

const event = (name: string, path: string, target?: string) =>
  anonymous.post('/api/public/analytics/event', {
    data: {
      event_id: randomUUID(),
      session_id: randomUUID(),
      event_name: name,
      path,
      target_key: target,
      locale: 'id-ID',
      occurred_at: new Date().toISOString(),
    },
  });

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  anonymous = await apiContext();
  const category = await owner.post(categories, {
    data: {
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: categorySlug, name: `Wawasan ${runId}` },
        { locale: 'en-US', slug: `${categorySlug}-en`, name: `Wawasan ${runId}` },
      ],
    },
  });
  expect(category.status()).toBe(201);
  categoryId = (await category.json()).data.id;
  const product = await owner.post(products, {
    data: {
      sku: `WAWASAN-${runId}`.toUpperCase(),
      status: 'published',
      category_ids: [categoryId],
      marketplaces: [{ provider: 'shopee', url: 'https://shopee.co.id/x', currency: 'IDR' }],
      translations: [
        { locale: 'id-ID', slug, name: `Produk Wawasan ${runId}` },
        { locale: 'en-US', slug: `${slug}-en`, name: `Insight Product ${runId}` },
      ],
    },
  });
  expect(product.status(), await product.text()).toBe(201);
  productId = (await product.json()).data.id;
});

test.afterAll(async () => {
  await owner.delete(`${products}/${productId}`);
  await owner.delete(`${categories}/${categoryId}`);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('the summaries need a session', async () => {
  await expectCode(await anonymous.get(`${products}/insight/audit`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.get(`${categories}/insight/audit`), 401, 'AUTH_TOKEN_REQUIRED');
});

test('product views and marketplace clicks are counted', async () => {
  for (const path of [`/produk/${slug}`, `/en/product/${slug}-en`, `/produk/${slug}?utm=x`]) {
    expect((await event('page_view', path)).status()).toBe(202);
  }
  expect((await event('outbound_click', `/produk/${slug}`, 'shopee.co.id')).status()).toBe(202);

  const top = (await expectCode(await owner.get(`${products}/insight/top`), 200)).data;
  const mine = top.find((item: { sku: string }) => item.sku === `WAWASAN-${runId}`.toUpperCase());
  expect(mine).toMatchObject({ name: `Produk Wawasan ${runId}`, views: 3 });

  const channels = (await expectCode(await owner.get(`${products}/insight/marketplaces`), 200))
    .data;
  const shopee = channels.find((item: { key: string }) => item.key === 'shopee');
  expect(shopee.clicks).toBeGreaterThanOrEqual(1);
  expect(shopee.products).toBeGreaterThanOrEqual(1);
});

test('the product audit counts, and its filter lists the same products', async () => {
  const audit = (await expectCode(await owner.get(`${products}/insight/audit`), 200)).data;
  expect(audit.total).toBe(audit.published + audit.draft + audit.archived);
  expect(audit.checks.no_image).toBeGreaterThan(0);
  expect(audit.checks.no_summary).toBeGreaterThan(0);

  const list = async (filter: string) =>
    (
      await expectCode(await owner.get(products, { params: { audit: filter, limit: '100' } }), 200)
    ).data.map((item: { id: string }) => item.id);
  expect(await list('no_image')).toContain(productId);
  expect(await list('no_channel')).not.toContain(productId);
  expect((await list('hacker')).length).toBeGreaterThan(0);
});

test('category views, products per category, and its audit', async () => {
  expect((await event('page_view', `/kategori/${categorySlug}`)).status()).toBe(202);
  const top = (await expectCode(await owner.get(`${categories}/insight/top`), 200)).data;
  expect(top.find((item: { id: string }) => item.id === categoryId)).toMatchObject({ views: 1 });

  const audit = (await expectCode(await owner.get(`${categories}/insight/audit`), 200)).data;
  expect(audit.total).toBe(audit.published + audit.draft + audit.archived);
  expect(audit.products.length).toBeGreaterThan(0);
  expect(audit.checks.untranslated.count).toBeGreaterThan(0);
  expect(audit.checks.untranslated.first_id).toBeTruthy();
  expect(audit.checks.no_image.count).toBeGreaterThan(0);
});
