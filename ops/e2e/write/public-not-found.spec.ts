import { expect, test, type APIRequestContext } from '@playwright/test';

import { admin, login, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for missing public pages (FE-012, 6E): a product, category, or article that
// does not exist answers status 404 and shows the 404 view at the address the visitor asked for
// (no redirect, no server error), in both languages. Existing ones still answer 200.
test.describe.configure({ mode: 'serial' });

const missing = [
  { url: '/produk/tidak-ada-e2e-404', title: 'Halaman tidak ditemukan' },
  { url: '/en/product/missing-e2e-404', title: 'Page not found' },
  { url: '/kategori/tidak-ada-e2e-404', title: 'Halaman tidak ditemukan' },
  { url: '/en/category/missing-e2e-404', title: 'Page not found' },
  { url: '/artikel/tidak-ada-e2e-404', title: 'Halaman tidak ditemukan' },
  { url: '/en/article/missing-e2e-404', title: 'Page not found' },
];

let owner: APIRequestContext;
const ids: Record<string, string> = {};
const slug = (key: string) => `ada-${key}-${runId}`;

/** Creates a published item through the admin API and keeps its id for clean-up. */
async function create(path: string, key: string, data: Record<string, unknown>) {
  const response = await owner.post(path, { data: { key: `${key}-${runId}`, ...data } });
  expect(response.status(), `${path}: ${await response.text()}`).toBe(201);
  ids[key] = (await response.json()).data.id;
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  await create('/api/v1/product-categories', 'kat404', {
    status: 'published',
    translations: [
      { locale: 'id-ID', slug: slug('kat404'), name: `Kategori Ada ${runId}` },
      { locale: 'en-US', slug: `${slug('kat404')}-en`, name: `Category Ada ${runId}` },
    ],
  });
  await create('/api/v1/products', 'prd404', {
    sku: `PRD404-${runId}`.toUpperCase(),
    status: 'published',
    category_ids: [ids['kat404']],
    translations: [
      { locale: 'id-ID', slug: slug('prd404'), name: `Produk Ada ${runId}` },
      { locale: 'en-US', slug: `${slug('prd404')}-en`, name: `Product Ada ${runId}` },
    ],
  });
  await create('/api/v1/articles', 'art404', {
    status: 'published',
    translations: [
      { locale: 'id-ID', slug: slug('art404'), title: 'Artikel Ada', body: '<p>Isi</p>' },
      { locale: 'en-US', slug: `${slug('art404')}-en`, title: 'Article Ada', body: '<p>Body</p>' },
    ],
  });
});

test.afterAll(async () => {
  if (ids['prd404']) await owner.delete(`/api/v1/products/${ids['prd404']}`);
  if (ids['art404']) await owner.delete(`/api/v1/articles/${ids['art404']}`);
  if (ids['kat404']) await owner.delete(`/api/v1/product-categories/${ids['kat404']}`);
  await owner?.dispose();
});

for (const item of missing) {
  test(`${item.url} answers 404 in place`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(`${stack.publicOrigin}${item.url}`);

    expect(response?.status()).toBe(404);
    expect(response?.request().redirectedFrom()).toBeNull();
    expect(new URL(page.url()).pathname).toBe(item.url);
    await expect(page).toHaveTitle(new RegExp(item.title));
    await expect(page.locator('.page-error-box')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(errors).toEqual([]);
  });
}

test('existing product, category, and article still answer 200', async ({ page }) => {
  for (const url of [
    `/produk/${slug('prd404')}`,
    `/kategori/${slug('kat404')}`,
    `/artikel/${slug('art404')}`,
  ]) {
    const response = await page.goto(`${stack.publicOrigin}${url}`);
    expect(response?.status(), url).toBe(200);
    await expect(page.locator('.page-error-box')).toHaveCount(0);
  }
});

test('moving from a missing page to an existing one leaves the 404 view', async ({ page }) => {
  await page.goto(`${stack.publicOrigin}/produk/tidak-ada-e2e-404`);
  await expect(page.locator('.page-error-box')).toBeVisible();

  // Client-side navigation through the Angular router (no new server render).
  await page.evaluate(
    (url) => {
      history.pushState({}, '', url);
      dispatchEvent(new PopStateEvent('popstate'));
    },
    `/produk/${slug('prd404')}`,
  );

  await expect(page.locator('.page-error-box')).toHaveCount(0);
  await expect(page.locator('app-product-thumbnail')).toBeVisible();
});
