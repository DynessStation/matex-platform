import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for what V1.2 changed on Produk and Kategori: rules of the compact price
// tables, tab dots, the insight bands, and the audit filter that stays in the address.
test.describe.configure({ mode: 'serial' });

const screenshots = process.env.MATEX_E2E_SHOTS;
const categoryName = `Tabel Kat ${runId}`;

let owner: APIRequestContext;
let categoryId = '';
const products: string[] = [];

async function login(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

const tabDot = (page: Page, tab: string) =>
  page.locator('app-form-product .nav-link', { hasText: tab }).locator('.tab-status');

async function openTab(page: Page, name: string) {
  await page.locator('app-form-product .nav-link', { hasText: name }).first().click();
  await expect(page.locator('app-form-product .nav-link.active')).toContainText(name);
}

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  const category = await owner.post('/api/v1/product-categories', {
    data: {
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: `tabel-kat-${runId}`, name: categoryName },
        { locale: 'en-US', slug: `tabel-kat-${runId}-en`, name: `Table Cat ${runId}` },
      ],
    },
  });
  expect(category.status()).toBe(201);
  categoryId = (await category.json()).data.id;
  const product = await owner.post('/api/v1/products', {
    data: {
      sku: `TABEL-${runId}`.toUpperCase(),
      status: 'published',
      category_ids: [categoryId],
      prices: [
        { type: 'end_user', currency: 'IDR', amount: 150000, is_public: true },
        { type: 'wholesale', currency: 'IDR', amount: 120000, min_qty: 10 },
        { type: 'end_user', currency: 'USD', amount: 10, is_public: true },
      ],
      translations: [
        { locale: 'id-ID', slug: `tabel-${runId}`, name: `Produk Tabel ${runId}` },
        { locale: 'en-US', slug: `tabel-${runId}-en`, name: `Table Product ${runId}` },
      ],
    },
  });
  expect(product.status(), await product.text()).toBe(201);
  products.push((await product.json()).data.id);
});

test.afterAll(async () => {
  for (const id of products) await owner.delete(`/api/v1/products/${id}`);
  await owner.delete(`/api/v1/product-categories/${categoryId}`);
  await owner?.dispose();
});

test('a saved product shows its prices split by currency and keeps them on save', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/product/edit/${products[0]}`);
  await expect(page.getByTestId('form-heading')).toHaveText(`Produk Tabel ${runId}`);
  await openTab(page, 'Harga & Kanal');
  const idr = page.getByTestId('prices-idr');
  await expect(idr.getByTestId('inline-row')).toHaveCount(2);
  await expect(page.getByTestId('prices-usd').getByTestId('inline-row')).toHaveCount(1);

  // Minimum and maximum open only on a wholesale row.
  await idr.getByTestId('inline-row').nth(1).getByTestId('inline-edit').click();
  await expect(idr.getByTestId('inline-detail')).toHaveCount(1);
  await expect(idr.getByTestId('inline-detail').locator('input').first()).toHaveValue('10');
  await idr.locator('.inline-table-editing').getByTestId('inline-cancel').click();
  await idr.getByTestId('inline-row').nth(0).getByTestId('inline-edit').click();
  await expect(idr.getByTestId('inline-detail')).toHaveCount(0);

  // A wrong amount stays on its row.
  const amount = idr.locator('.inline-table-editing [data-column="amount"] input');
  await amount.fill('seratus');
  await idr.locator('.inline-table-editing').getByTestId('inline-save').click();
  await expect(amount).toHaveValue('');
  await expect(idr.locator('.inline-table-editing .form-kit-error')).toContainText('Wajib diisi');
  await amount.fill('175000');
  await idr.locator('.inline-table-editing').getByTestId('inline-save').click();
  await expect(
    idr.getByTestId('inline-row').nth(0).locator('[data-column="amount"]'),
  ).toContainText('175.000');

  const sent = page.waitForRequest(
    (r) => r.method() === 'PUT' && r.url().includes(`/api/v1/products/${products[0]}`),
  );
  await page.locator('#product_btn').click();
  const body = (await sent).postDataJSON();
  expect(body.key).toBeUndefined();
  expect(body.prices).toHaveLength(3);
  expect(body.prices[0]).toMatchObject({ currency: 'IDR', amount: 175000, is_public: true });
  expect(body.prices[1]).toMatchObject({ type: 'wholesale', is_public: false, min_qty: 10 });
  expect(body.prices[2]).toMatchObject({ currency: 'USD', amount: 10 });
  await page.waitForURL(/\/product(?:[?#]|$)/);
  expect(errors).toEqual([]);
});

test('showing prices needs both currencies, and the tab says so', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  await expect(tabDot(page, 'Umum')).toHaveAttribute('data-state', 'warn');
  await openTab(page, 'Harga & Kanal');
  await expect(tabDot(page, 'Harga')).toHaveAttribute('data-state', 'warn');
  await page
    .locator('.tab-pane.active [formcontrolname=price_visibility] .select2-selection')
    .click();
  await page
    .locator('.tab-pane.active [formcontrolname=price_visibility] .select2-results__option', {
      hasText: 'Tampilkan harga',
    })
    .click();
  await page.locator('#product_btn').click();
  // The category is asked for first; the price rule still marks its tab.
  await expect(tabDot(page, 'Harga')).toHaveAttribute('data-state', 'error');
  await expect(tabDot(page, 'Umum')).toHaveAttribute('data-state', 'error');
  await expect(page.getByTestId('form-submit-note')).toBeVisible();
  if (screenshots) {
    await openTab(page, 'Harga & Kanal');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: `${screenshots}/product-channels.png`, fullPage: true });
  }
});

test('the product list has its insight band, and a fix filters the list by address', async ({
  page,
}) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/product`);
  const panel = page.getByTestId('insight-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('insight-total')).not.toHaveText('0');
  if (screenshots) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${screenshots}/product-list.png` });
  }

  const listed = page.waitForRequest(
    (r) => r.url().includes('/api/v1/products?') && r.url().includes('audit=no_image'),
  );
  await panel
    .locator('.insight-check-warn', { hasText: 'tanpa gambar utama' })
    .locator('a')
    .click();
  await listed;
  await expect(page).toHaveURL(/audit=no_image/);
  await expect(page.getByTestId('audit-filter')).toBeVisible();

  const cleared = page.waitForRequest(
    (r) => r.url().includes('/api/v1/products') && !r.url().includes('audit='),
  );
  await page.getByTestId('audit-filter').getByRole('button').click();
  await cleared;
  await expect(page).not.toHaveURL(/audit=/);
  await expect(page.getByTestId('audit-filter')).toHaveCount(0);
});

test('the category page has its band, and a fix opens the first category with the problem', async ({
  page,
}) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/category`);
  const panel = page.getByTestId('insight-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('insight-column')).toHaveCount(3);
  await expect(panel.getByTestId('insight-column').nth(1)).toContainText('produk');
  if (screenshots) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${screenshots}/category.png` });
  }
  await panel.locator('.insight-check-warn a').first().click();
  await expect(page).toHaveURL(/\/category\/edit\//);
  await expect(page.locator('.category-nav .tab-status').first()).toBeVisible();
  await expect(page.getByTestId('internal-key').first()).toBeAttached();
});
