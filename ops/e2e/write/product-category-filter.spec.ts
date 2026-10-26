import { expect, test, type APIRequestContext, type Page, type Request } from '@playwright/test';

import {
  admin,
  adminReferences,
  createAccessProfile,
  createAdminAccount,
  login as apiLogin,
  runId,
} from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the category panel on the product list
// (frontend/admin/src/app/components/product/product-category-filter, U-13): "Semua produk"
// and every category with its product count; a click filters the list through ?category=,
// which the "Kembali" button brings back; the panel search keeps parents of matches; an
// account without category rights sees the list without the panel.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
const ids: Record<string, string> = {};

async function login(page: Page, identity = admin.identity, password = admin.password) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(identity);
    await page.locator('#password').fill(password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

/** Waits for the next product list request and returns its query. */
const nextList = (page: Page) =>
  page
    .waitForRequest(
      (r: Request) => r.method() === 'GET' && new URL(r.url()).pathname === '/api/v1/products',
    )
    .then((r) => new URL(r.url()).searchParams);

const panel = (page: Page) => page.locator('app-product-category-filter');
const row = (page: Page, key: string) =>
  panel(page).locator(`.product-category-filter__item[data-id="${ids[key]}"]`);
const productNames = (page: Page) => page.locator('app-table tbody tr').allTextContents();

async function createCategory(key: string, label: string, parent?: string) {
  const response = await owner.post('/api/v1/product-categories', {
    data: {
      key: `${key}-${runId}`,
      status: 'published',
      parent_id: parent ?? null,
      translations: [
        { locale: 'id-ID', slug: `${key}-${runId}-id`, name: `${label} ${runId}` },
        { locale: 'en-US', slug: `${key}-${runId}-en`, name: `${label} ${runId} EN` },
      ],
    },
  });
  expect(response.status()).toBe(201);
  ids[key] = (await response.json()).data.id;
}

async function createProduct(key: string, category: string | null) {
  const response = await owner.post('/api/v1/products', {
    data: {
      key: `${key}-${runId}`,
      sku: `${key}-${runId}`.toUpperCase(),
      status: 'draft',
      category_ids: category ? [ids[category]] : [],
      translations: [
        { locale: 'id-ID', slug: `${key}-${runId}-id`, name: `Barang ${key} ${runId}` },
        { locale: 'en-US', slug: `${key}-${runId}-en`, name: `Item ${key} ${runId}` },
      ],
    },
  });
  expect(response.status()).toBe(201);
  ids[key] = (await response.json()).data.id;
}

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  await createCategory('saring', 'Saring Induk');
  await createCategory('saring-anak', 'Saring Anak', ids['saring']);
  await createProduct('fa', 'saring');
  await createProduct('fb', 'saring-anak');
  await createProduct('fc', 'saring-anak');
});

test.afterAll(async () => {
  for (const key of ['fa', 'fb', 'fc']) await owner.delete(`/api/v1/products/${ids[key]}`);
  for (const key of ['saring-anak', 'saring']) {
    await owner.delete(`/api/v1/product-categories/${ids[key]}`);
  }
  await owner.dispose();
});

test('a category filters the list through the URL, and Kembali keeps it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/product`);

  const all = panel(page).locator('.product-category-filter__item').first();
  await expect(all).toContainText('Semua produk');
  await expect(all).toHaveClass(/active/);
  await expect(row(page, 'saring').locator('small')).toHaveText('1');
  await expect(row(page, 'saring-anak').locator('small')).toHaveText('2');

  let query = nextList(page);
  await row(page, 'saring-anak').click();
  expect((await query).get('category')).toBe(ids['saring-anak']);
  await expect(page).toHaveURL(new RegExp(`[?&]category=${ids['saring-anak']}`));
  await expect(row(page, 'saring-anak')).toHaveClass(/active/);
  await expect(page.locator('app-table tbody tr')).toHaveCount(2);
  for (const text of await productNames(page)) expect(text).toMatch(/Barang f[bc]/);

  // Edit a product, then "Kembali": the same category is shown again.
  await page.locator('app-table tbody tr').first().locator('.action-dropdown-toggle').click();
  await page
    .locator('.action-dropdown-menu.show .action-dropdown-item', { hasText: /Edit/ })
    .click();
  await page.waitForURL(/\/product\/edit\//);
  query = nextList(page);
  await page.locator('.title-header app-back-button a').click();
  expect((await query).get('category')).toBe(ids['saring-anak']);
  await expect(row(page, 'saring-anak')).toHaveClass(/active/);

  // "Semua produk" drops the filter.
  query = nextList(page);
  await all.click();
  expect((await query).has('category')).toBe(false);
  await expect(page).not.toHaveURL(/category=/);
  expect(errors).toEqual([]);
});

test('the panel search keeps the parents of matching categories', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/product`);
  await panel(page).locator('#product_category_search').fill(`Saring Anak ${runId}`);
  await expect(row(page, 'saring-anak')).toBeVisible();
  await expect(row(page, 'saring')).toBeVisible();
  await expect(panel(page).locator('.product-category-filter__item')).toHaveCount(3);
  await panel(page).locator('#product_category_search').fill('tidak-ada-kategori-ini');
  await expect(panel(page).locator('.product-category-filter__empty')).toBeVisible();
});

test('without category rights the list shows without the panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const access = await createAccessProfile(owner, 'Produk Tanpa Kategori', ['product.view']);
  const account = await createAdminAccount(
    owner,
    'Panelkat',
    await adminReferences(owner, { id_access: access }),
  );
  const denied: string[] = [];
  page.on('response', (r) => {
    // The dashboard after login asks for analytics too; that is a separate finding.
    if (r.status() === 403 && /\/api\/v1\/product/.test(r.url())) denied.push(r.url());
  });
  await login(page, account.identity, account.password);
  await page.goto(`${stack.adminOrigin}/product`);
  await expect(page.locator('app-table')).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  expect(denied).toEqual([]);
  expect(errors).toEqual([]);
});
