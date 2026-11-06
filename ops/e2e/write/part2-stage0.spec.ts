import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, apiContext, expectCode, login, runId, saveRecording } from './api-contract';
import { stack } from './stack.mjs';

// V1.2 Part 2, stage 0 (docs/rencana-v1.2-part2.md): what the public API shows, the data sent
// with a server-rendered page, the phone footer and product cards, and the form fixes.
test.describe.configure({ mode: 'serial' });

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let categoryId = '';
let categorySlug = '';
const sku = `S0-${runId}`.toUpperCase();
const ids: string[] = [];

const FORBIDDEN = [
  'hs_code',
  'manufacturer_code',
  'lead_time_days',
  'quantity',
  'manage_stock',
  'file_name',
];

/** Any id-like field must be a hash, and the fields kept internal must be gone. */
function assertPublicShape(value: unknown, where: string): void {
  if (Array.isArray(value)) {
    value.forEach((item) => assertPublicShape(item, where));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    expect(FORBIDDEN, `${where}: ${key}`).not.toContain(key);
    if (/^(id|parent_id|.*_id)$/.test(key) && item != null) {
      expect(typeof item, `${where}: ${key}`).toBe('string');
    }
    assertPublicShape(item, `${where}.${key}`);
  }
}

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `s0-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `s0-${runId}-id`, name: `Kategori S0 ${runId}` },
          { locale: 'en-US', slug: `s0-${runId}-en`, name: `Category S0 ${runId}` },
        ],
      },
    }),
    201,
  );
  categoryId = category.data.id;
  categorySlug = `s0-${runId}-id`;
  for (const n of [1, 2]) {
    const product = await expectCode(
      await owner.post('/api/v1/products', {
        data: {
          key: `s0-${runId}-${n}`,
          sku: `${sku}-${n}`,
          status: 'published',
          category_ids: [categoryId],
          price_visibility: 'displayed',
          manage_stock: 1,
          stock_quantity: 77,
          hs_code: '9404.21',
          lead_time_days: 5,
          prices: [
            { type: 'end_user', currency: 'IDR', amount: 150000, is_public: true },
            { type: 'end_user', currency: 'USD', amount: 10, is_public: true },
          ],
          translations: [
            { locale: 'id-ID', slug: `s0-${runId}-${n}-id`, name: `Produk S0 ${n}` },
            { locale: 'en-US', slug: `s0-${runId}-${n}-en`, name: `Product S0 ${n}` },
          ],
        },
      }),
      201,
    );
    ids.push(product.data.id);
  }
});

test.afterAll(async () => {
  await saveRecording('part2-stage0', []);
  for (const id of ids) await owner.delete(`/api/v1/products/${id}`);
  await owner.delete(`/api/v1/product-categories/${categoryId}`);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('public responses carry hashes, not database ids or internal fields', async () => {
  const urls = [
    '/api/public/products/id-ID',
    `/api/public/products/id-ID/s0-${runId}-1-id`,
    '/api/public/product-categories/id-ID',
    `/api/public/product-categories/id-ID/${categorySlug}`,
    '/api/public/articles/id-ID',
    '/api/public/faq/id-ID',
    '/api/public/contact/id-ID',
    '/api/public/navigation/primary/id-ID',
    '/api/public/website-page/id-ID/home',
  ];
  for (const url of urls) {
    const response = await anonymous.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()['cache-control'], url).not.toContain('no-store');
    assertPublicShape((await response.json()).data, url);
  }
});

test('filters accept hashes only, so raw numbers cannot be walked through', async () => {
  const list = async (params: Record<string, string>) =>
    (
      await expectCode(
        await anonymous.get('/api/public/products/id-ID', { params: { search: sku, ...params } }),
        200,
      )
    ).data as { id: string }[];
  const all = await list({});
  expect(all).toHaveLength(2);
  const [first] = all;
  expect(await list({ ids: '1,2,3' })).toEqual([]);
  expect(await list({ category_ids: '1,2,3' })).toEqual([]);
  expect((await list({ ids: first.id })).map((item) => item.id)).toEqual([first.id]);
  expect((await list({ exclude_id: first.id })).map((item) => item.id)).not.toContain(first.id);
  expect(await list({ exclude_id: '1' })).toHaveLength(2);
});

test('the server rejects codes and sizes that make no sense', async () => {
  const base = {
    sku: `${sku}-BAD`,
    status: 'draft',
    category_ids: [categoryId],
    translations: [
      { locale: 'id-ID', slug: `s0-${runId}-bad-id`, name: 'Buruk' },
      { locale: 'en-US', slug: `s0-${runId}-bad-en`, name: 'Bad' },
    ],
  };
  for (const bad of [
    { barcode: 'ada spasi' },
    { manufacturer_code: 'q#1' },
    { hs_code: 'abc' },
    { origin_province: 'q432qea !#' },
    { width_mm: 100001 },
    { weight_grams: 10000001 },
    { min_order_qty: 1000001 },
    { lead_time_days: 3651 },
    { stock_quantity: 1000000000 },
  ]) {
    await expectCode(
      await owner.post('/api/v1/products', { data: { ...base, ...bad } }),
      400,
      'PRODUCT_PAYLOAD_INVALID',
    );
  }
});

test('a server-rendered page brings its data along', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (
      /\/api\/public\/(navigation|website-page|products|product-categories|articles)\//.test(
        request.url(),
      )
    ) {
      calls.push(request.url());
    }
  });
  const html = await (await page.request.get(`${stack.publicOrigin}/`)).text();
  expect(html).toContain('NAVIGATION_FOUND');
  for (const path of ['/', '/katalog']) {
    await page.goto(`${stack.publicOrigin}${path}`);
    await expect(page.locator('footer')).toBeVisible();
    await page.waitForTimeout(2000);
    expect(calls, path).toEqual([]);
  }
});

test('on a phone the footer opens and home shows two product cards per row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${stack.publicOrigin}/`);
  const title = page.locator('footer .footer-title').first();
  const links = page.locator('footer .footer-list').first();
  await title.scrollIntoViewIfNeeded();
  await expect(links).toBeHidden();
  await title.click();
  await expect(links).toBeVisible();
  await title.click();
  await expect(links).toBeHidden();

  const cards = page.locator('.product-card');
  if ((await cards.count()) >= 2) {
    const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    expect(a!.y).toBe(b!.y);
    expect(a!.width).toBeLessThan(195);
  }
});

async function signIn(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

async function openTab(page: Page, name: string): Promise<void> {
  await page.locator('app-form-product .nav-link', { hasText: name }).first().click();
  await expect(page.locator('app-form-product .nav-link.active')).toContainText(name);
}

test('checking an address never covers the form with the page loader', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  await page.route('**/api/v1/slug-check*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await openTab(page, 'Konten & Bahasa');
  const slugCheck = page.waitForRequest('**/api/v1/slug-check*');
  await page
    .locator('app-form-product input[id$="name"], app-form-product app-title-slug input')
    .first()
    .fill(`Lambat ${runId}`);
  await slugCheck;
  await expect(page.locator('app-loader')).toHaveCount(0);
  await expect(page.locator('app-form-product app-title-slug input').first()).toBeVisible();
});

test('price rows: errors stay on the open row, no undefined, a warning for odd wholesale', async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  await openTab(page, 'Harga & Kanal');
  const idr = page.locator('[data-testid=prices-idr]');

  await idr.locator('[data-testid=inline-add]').click();
  await idr.locator('td[data-column=amount] input').fill('100000');
  await idr.locator('[data-testid=inline-save]').click();
  await expect(idr.locator('[data-testid=inline-row]')).toHaveCount(1);

  // The new row is invalid: only it shows the message.
  await idr.locator('[data-testid=inline-add]').click();
  await idr.locator('td[data-column=amount] input').fill('abc');
  await idr.locator('[data-testid=inline-save]').click();
  await expect(idr.locator('.form-kit-error')).toHaveCount(1);
  await expect(
    idr.locator('[data-testid=inline-row]').first().locator('.form-kit-error'),
  ).toHaveCount(0);

  // A wholesale price above the consumer price is only a warning.
  await idr.locator('td[data-column=amount] input').fill('900000');
  await idr.locator('td[data-column=type] .inline-table-toggle').click();
  await page.locator('.inline-table-menu button', { hasText: 'Grosir' }).click();
  for (const input of await idr.locator('input.form-control').all()) {
    expect(await input.inputValue()).not.toBe('undefined');
  }
  await idr.locator('[data-testid=inline-save]').click();
  await expect(idr.locator('[data-testid=wholesale-warning]')).toBeVisible();

  const markets = page.locator('[data-testid=marketplaces]');
  await markets.locator('[data-testid=inline-add]').click();
  for (const input of await markets.locator('input.form-control').all()) {
    expect(await input.inputValue()).not.toBe('undefined');
  }
});

test('the form marks codes and origins that make no sense', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  for (const [name, bad] of [
    ['barcode', 'ada spasi'],
    ['hs_code', 'abc'],
    ['origin_province', 'q432qea !#'],
  ]) {
    const input = page.locator(`[formcontrolname=${name}]`);
    await input.fill(bad);
    await input.blur();
    await expect(input).toHaveClass(/is-invalid/);
    await input.fill('');
  }
});

test('website pages and offices show the state of each tab', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/website-page/about`);
  await expect(page.locator('.website-page-sidebar app-form-heading')).toBeVisible();
  await expect(page.locator('.website-page-form app-tab-status').first()).toBeVisible();
  await expect(page.locator('.website-page-form app-tab-status')).toHaveCount(5);
  await page.goto(`${stack.adminOrigin}/office/create`);
  await expect(page.locator('app-form-office app-tab-status')).toHaveCount(5);
});

test('a table switch and its label stay on one line', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/faq`);
  const cell = page.locator('.status-switch-cell').first();
  const label = cell.locator('.status-switch-label');
  await expect(label).toBeVisible();
  const [a, b] = [await cell.locator('.switch').boundingBox(), await label.boundingBox()];
  expect(Math.abs(a!.y + a!.height / 2 - (b!.y + b!.height / 2))).toBeLessThan(2);
  expect(b!.x).toBeGreaterThan(a!.x + a!.width);
});
