import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, expectCode, login, runId, saveRecording } from './api-contract';
import { stack } from './stack.mjs';

// The one door for a product (docs/rencana-v1.2-part2.md): from a blank form to a price, with the
// HPP in the product form, and number fields that only take numbers.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let categoryId = '';
const categoryName = `Kategori Alur ${runId}`;
const sku = `ALUR-${runId}`.toUpperCase();
const materialName = `Bahan Alur ${runId}`;
let productUrl = '';

async function signIn(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

async function openTab(page: Page, name: string) {
  await page.locator('app-form-product .nav-link', { hasText: name }).first().click();
  await expect(page.locator('app-form-product .nav-link.active')).toContainText(name);
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `alur-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `alur-${runId}-id`, name: categoryName },
          { locale: 'en-US', slug: `alur-${runId}-en`, name: `Flow ${runId}` },
        ],
      },
    }),
    201,
  );
  categoryId = category.data.id;
  await expectCode(
    await owner.post('/api/v1/costing/materials', {
      data: { name: materialName, kind: 'material', unit: 'kg', price: 10000 },
    }),
    201,
  );
});

test.afterAll(async () => {
  await saveRecording('product-flow', []);
  await owner?.dispose();
});

test('a new product with one language goes on to its HPP after the first save', async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  const tabs = page.locator('app-form-product');
  await tabs.locator('[formcontrolname=sku]').fill(sku);
  const categories = tabs.locator('app-advance-dropdown');
  await categories.locator('.category-breadcrumb-select').click();
  await categories
    .locator('.select-category-box li', { hasText: categoryName })
    .getByRole('link', { name: 'Select' })
    .click();

  await openTab(page, 'Harga & Kanal');
  await expect(page.locator('[data-testid=cost-panel-unsaved]')).toBeVisible();
  await expect(page.locator('[data-testid=cost-panel-unsaved] strong')).toHaveCSS(
    'display',
    'block',
  );
  await expect(page.locator('[data-testid=cost-panel-unsaved] p')).toHaveCSS('display', 'block');
  // Displaying the price must not stop a draft: its price comes after the first save.
  const visibility = page.locator('app-form-product select2[formcontrolname=price_visibility]');
  await visibility.locator('.select2-selection').click();
  await visibility.locator('.select2-results__option', { hasText: 'Tampilkan harga' }).click();
  await expect(visibility.locator('.select2-selection__rendered')).toContainText('Tampilkan harga');

  await openTab(page, 'Konten & Bahasa');
  // The page can still be settling right after the tab switch: type again if it was lost.
  const title = page.locator('app-form-product #id_title');
  await expect(async () => {
    await title.fill(`Produk Alur ${runId}`);
    await expect(title).toHaveValue(`Produk Alur ${runId}`, { timeout: 1000 });
    await expect(page.locator('app-form-product app-form-heading')).toContainText('Produk Alur', {
      timeout: 1000,
    });
  }).toPass();
  await page.locator('app-form-product button[type=submit]').click();

  await page.waitForURL(/\/product\/edit\/.+tab=channels/);
  productUrl = page.url();
  await expect(page.locator('app-form-product .nav-link.active')).toContainText('Harga & Kanal');
  await expect(page.locator('[data-testid=cost-panel-start]')).toBeVisible();
});

test('a draft may wait for its price, publishing it may not', async () => {
  const slug = `tanpa-harga-${runId}`;
  const data = {
    key: slug,
    sku: `HARGA-${runId}`.toUpperCase(),
    status: 'draft',
    price_visibility: 'displayed',
    category_ids: [categoryId],
    translations: [
      { locale: 'id-ID', slug: `${slug}-id`, name: 'Tanpa Harga ID', short_description: 'Singkat' },
      { locale: 'en-US', slug: `${slug}-en`, name: 'Tanpa Harga EN', short_description: 'Short' },
    ],
  };
  const made = await expectCode(await owner.post('/api/v1/products', { data }), 201);
  await expectCode(
    await owner.patch(`/api/v1/products/${made.data.id}/status`, { data: { status: 'published' } }),
    400,
    'PRODUCT_PRICE_REQUIRED',
  );
  await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        ...data,
        key: `${slug}-2`,
        sku: `HARGA2-${runId}`.toUpperCase(),
        status: 'published',
        translations: data.translations.map((t) => ({ ...t, slug: `${t.slug}-2` })),
      },
    }),
    400,
    'PRODUCT_PAYLOAD_INVALID',
  );
  await expectCode(
    await owner.put(`/api/v1/products/${made.data.id}`, {
      data: {
        ...data,
        prices: [
          { type: 'end_user', currency: 'IDR', amount: 150000, is_public: true },
          { type: 'end_user', currency: 'USD', amount: 10, is_public: true },
        ],
      },
    }),
    200,
  );
  await expectCode(
    await owner.patch(`/api/v1/products/${made.data.id}/status`, { data: { status: 'published' } }),
    200,
  );
});

test('recipe, margin, and price live in the product form', async ({ page }) => {
  await signIn(page);
  await page.goto(productUrl);
  await page.locator('[data-testid=cost-start]').click();
  const panel = page.locator('[data-testid=cost-panel]');
  await expect(panel.locator('[data-testid=cost-status]')).toHaveText('Belum ada HPP');

  await panel.locator('[data-testid=inline-add]').click();
  await panel.locator('td[data-column=material] .inline-table-toggle').click();
  await page.locator('.inline-table-menu button', { hasText: materialName }).click();
  const qty = panel.locator('td[data-column=qty] input');
  await qty.fill('10');
  await panel.locator('[data-testid=inline-save]').click();
  await expect(panel.locator('[data-testid=recipe-total]')).toContainText(/100\.000/);
  await panel.locator('[data-testid=recipe-save]').click();

  await expect(panel.locator('[data-testid=costing-ladder]')).toContainText(/Rp\s*164\.474/);
  await expect(panel.locator('[data-testid=cost-status]')).toHaveText('Perlu ditinjau');
  await expect(panel.locator('[data-testid=cost-breakdown]')).toContainText('Bahan');
  await expect(panel.locator('[data-testid=cost-channels]')).toContainText('Shopee');
  // Following the calculation: the price rows cannot be typed over.
  await expect(page.locator('[data-testid=prices-locked]')).toBeVisible();
  await expect(page.locator('[data-testid=prices-idr] [data-testid=inline-add]')).toHaveCount(0);

  await panel.locator('[data-testid=cost-apply]').click();
  await expect(panel.locator('[data-testid=cost-status]')).toHaveText('Ikut hitungan');
  await expect(page.locator('[data-testid=prices-idr]')).toContainText(/Rp\s*164\.474/);
  await expect(page.locator('[data-testid=prices-idr]')).toContainText(/Rp\s*156\.250/);

  // By hand: the rows open, and the status says so.
  await panel.locator('[data-testid=cost-mode-manual]').check();
  await expect(panel.locator('[data-testid=cost-status]')).toHaveText('Harga manual');
  await expect(page.locator('[data-testid=prices-locked]')).toHaveCount(0);
  await expect(page.locator('[data-testid=prices-idr] [data-testid=inline-add]')).toBeVisible();
});

test('a material price change asks for a review, and nothing moves by itself', async ({ page }) => {
  const materials = await expectCode(await owner.get('/api/v1/costing/materials'), 200);
  const material = materials.data.find((item: any) => item.name === materialName);
  await signIn(page);
  await page.goto(productUrl);
  const panel = page.locator('[data-testid=cost-panel]');
  await panel.locator('[data-testid=cost-mode-follow]').check();
  await expect(panel.locator('[data-testid=cost-status]')).toHaveText('Ikut hitungan');

  await expectCode(
    await owner.post(`/api/v1/costing/materials/${material.id}/prices`, {
      data: { amount: 20000 },
    }),
    200,
  );
  await page.reload();
  await expect(panel.locator('[data-testid=cost-status]')).toHaveText('Perlu ditinjau');
  await expect(page.locator('[data-testid=prices-idr]')).toContainText(/Rp\s*164\.474/);
});

test('number fields take numbers only and group them as typed', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  const stock = page.locator('[formcontrolname=stock_quantity]');
  await stock.pressSequentially('12a3.b4,5');
  await expect(stock).toHaveValue('12.345');
  await stock.fill('Rp 1.000.000');
  await expect(stock).toHaveValue('1.000.000');

  await openTab(page, 'Harga & Kanal');
  const idr = page.locator('[data-testid=prices-idr]');
  await idr.locator('[data-testid=inline-add]').click();
  const amount = idr.locator('td[data-column=amount] input');
  await amount.pressSequentially('1000000x');
  await expect(amount).toHaveValue('1.000.000');
  await idr.locator('[data-testid=inline-save]').click();
  await expect(idr.locator('[data-testid=inline-row]')).toContainText(/Rp\s*1\.000\.000/);

  const usd = page.locator('[data-testid=prices-usd]');
  await usd.locator('[data-testid=inline-add]').click();
  const dollars = usd.locator('td[data-column=amount] input');
  await dollars.pressSequentially('12.5');
  await expect(dollars).toHaveValue('12,5');
  await usd.locator('[data-testid=inline-save]').click();
  await expect(usd.locator('[data-testid=inline-row]')).toContainText('$12.50');
});

test('phones take digits and a leading plus; channel dates use a date field', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/account`);
  const phone = page.locator('#profile_phone_2');
  await phone.fill('');
  await phone.pressSequentially('+62 812-abc34');
  await expect(phone).toHaveValue('+6281234');

  await page.goto(`${stack.adminOrigin}/costing?tab=channels`);
  const shopee = page.locator('[data-channel=Shopee]');
  await shopee.locator('[data-testid=inline-add]').click();
  await expect(shopee.locator('td[data-column=from] input')).toHaveAttribute('type', 'date');
  const value = shopee.locator('td[data-column=value] input');
  await value.pressSequentially('2,5x');
  await expect(value).toHaveValue('2,5');
  await shopee.locator('[data-testid=inline-cancel]').click();
});

test('an item without a product can become a draft product', async ({ page }) => {
  const item = await expectCode(
    await owner.post('/api/v1/costing/items', {
      data: {
        name: `Item Tanpa Produk ${runId}`,
        group: 'Uji',
        width: 30,
        length: 80,
        height: 2.5,
      },
    }),
    201,
  );
  await expectCode(
    await owner.post('/api/v1/costing/create-products', { data: { item_ids: [item.data.id] } }),
    400,
    'COSTING_CREATE_PRODUCTS_INVALID',
  );

  await signIn(page);
  await page.goto(`${stack.adminOrigin}/costing`);
  await page.locator('[data-testid=costing-search]').fill(`Item Tanpa Produk ${runId}`);
  const row = page.locator('[data-testid=costing-row]');
  await expect(row.locator('[data-testid=costing-status]')).toHaveText('Belum ada produk');
  await row.locator('input[type=checkbox]').check();
  await page.locator('[data-testid=costing-create-products]').click();
  await page.locator('[data-testid=costing-create-category]').selectOption({ label: categoryName });
  await page.locator('[data-testid=costing-create-yes]').click();
  await expect(row.locator('[data-testid=costing-status]')).toHaveText('Belum ada HPP');

  const made = await expectCode(await owner.get(`/api/v1/costing/items/${item.data.id}`), 200);
  expect(made.data.product_status).toBe('draft');
  expect(made.data.width).toBe(30);
  expect(categoryId).toBeTruthy();
  // Draft: not on the website.
  const anonymous = await (
    await owner.get(`/api/public/products/id-ID?search=${made.data.sku}`)
  ).json();
  expect(anonymous.data).toEqual([]);
});
