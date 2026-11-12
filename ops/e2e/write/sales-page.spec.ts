import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, expectCode, login, runId, saveRecording } from './api-contract';
import { incomeXlsx, ordersCsv, SPREADSHEET_MIME } from './sales-fixtures';
import { stack } from './stack.mjs';

// Browser contract of Bisnis > Penjualan: a file is read and reported, saved on request, the
// orders and payouts appear in their tabs, and a channel SKU is mapped to a product.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let storeId = '';
let productId = '';
const storeName = `Rasa Uji ${runId}`;
const orderRef = `58799${runId.padStart(8, '0')}7`.replace(/\D/g, '');
const skuRef = `17399${runId.padStart(8, '0')}7`.replace(/\D/g, '');

async function signIn(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  const entity = await expectCode(
    await owner.post('/api/v1/business/entities', { data: { name: storeName, kind: 'own_brand' } }),
    201,
  );
  const channels = await expectCode(await owner.get('/api/v1/business/channels'), 200);
  const tiktok =
    channels.data.find((c: { key: string }) => c.key === 'tiktok-shop') ?? channels.data[0];
  const store = await expectCode(
    await owner.post(`/api/v1/business/entities/${entity.data.id}/stores`, {
      data: { channel_id: tiktok.id, name: `${storeName} TikTok` },
    }),
    201,
  );
  storeId = store.data.id;
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `sales-ui-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `sales-ui-${runId}-id`, name: `Kategori UI ${runId}` },
          { locale: 'en-US', slug: `sales-ui-${runId}-en`, name: `UI Category ${runId}` },
        ],
      },
    }),
    201,
  );
  const product = await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        key: `sales-ui-${runId}`,
        sku: `SALES-UI-${runId}`.toUpperCase(),
        status: 'draft',
        category_ids: [category.data.id],
        price_visibility: 'contact',
        prices: [],
        translations: [
          { locale: 'id-ID', slug: `sales-ui-${runId}-id`, name: `Topper Uji ${runId}` },
          { locale: 'en-US', slug: `sales-ui-${runId}-en`, name: `Test Topper ${runId}` },
        ],
      },
    }),
    201,
  );
  productId = product.data.id;
});

test.afterAll(async () => {
  await saveRecording('sales-page', []);
  await owner?.dispose();
});

test('the order file is read, reported, and saved from the page', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/sales`);
  const tab = page.locator('app-sales-import');
  await tab.locator('[data-testid=sales-import-store]').selectOption(storeId);
  await tab.locator('[data-testid=sales-import-file]').setInputFiles({
    name: 'Semua pesanan-2026-11-12.csv',
    mimeType: 'text/csv',
    buffer: ordersCsv([
      {
        order: orderRef,
        status: 'Selesai',
        sku: skuRef,
        sellerSku: 'topper utuh',
        name: 'Topper Latex Utuh',
        variation: '40x80',
        qty: 2,
        price: 68900,
        platformDiscount: 0,
        sellerDiscount: 0,
        amount: 137800,
        created: '05/11/2026 10:00:00',
        paid: '05/11/2026 10:01:00',
      },
    ]),
  });
  await tab.locator('[data-testid=sales-import-read]').click();
  await expect(tab.locator('[data-testid=sales-import-kind]')).toHaveText('Pesanan');
  await expect(tab.locator('[data-testid=sales-unknown-skus]')).toContainText('Topper Latex Utuh');
  await expect(tab.locator('[data-testid=sales-import-saved]')).toHaveCount(0);

  await tab.locator('[data-testid=sales-import-save]').click();
  await expect(tab.locator('[data-testid=sales-import-saved]')).toContainText('1 baru');
  await expect(tab.locator('[data-testid=sales-import-history]')).toContainText(
    'Semua pesanan-2026-11-12.csv',
  );

  // The payout file for the same order.
  await tab.locator('[data-testid=sales-import-file]').setInputFiles({
    name: 'income_2026(UTC+7).xlsx',
    mimeType: SPREADSHEET_MIME,
    buffer: await incomeXlsx([
      {
        ref: orderRef,
        label: 'Pesanan',
        ordered: '2026/11/05',
        settled: '2026/11/09',
        amount: 120000,
        revenue: 137800,
        fees: -17800,
        commission: -9000,
        orderRef,
        sku: skuRef,
        qty: 2,
      },
    ]),
  });
  await tab.locator('[data-testid=sales-import-read]').click();
  await expect(tab.locator('[data-testid=sales-import-kind]')).toHaveText('Dana cair');
  await tab.locator('[data-testid=sales-import-save]').click();
  await expect(tab.locator('[data-testid=sales-import-saved]')).toContainText('1 baru');
});

test('orders and payouts show up in their tabs, and a SKU gets its product', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/sales?tab=orders`);
  const row = page.locator(`[data-testid=sales-order][data-ref="${orderRef}"]`);
  await expect(row).toContainText('Selesai');
  await expect(row).toContainText('belum dipetakan');
  await expect(row).toContainText('120.000');
  await row.click();
  await expect(page.locator('[data-testid=sales-order-detail]')).toContainText('40x80');

  await page.goto(`${stack.adminOrigin}/sales?tab=settlements`);
  const payout = page.locator(`[data-testid=sales-settlement][data-ref="${orderRef}"]`);
  await expect(payout).toContainText('Pesanan');
  await payout.click();
  await expect(page.locator('[data-testid=sales-settlement-detail]')).toContainText(
    'Biaya komisi platform',
  );

  await page.goto(`${stack.adminOrigin}/sales?tab=sku-map`);
  const sku = page.locator(`[data-testid=sales-sku][data-ref="${skuRef}"]`);
  await expect(sku).toContainText('Topper Latex Utuh');
  await sku.locator('[data-testid=sales-sku-product]').selectOption(productId);
  await expect(page.locator('.toast-success, .toast')).toBeVisible();
  const map = await expectCode(
    await owner.get('/api/v1/sales/sku-map', { params: { store: storeId } }),
    200,
  );
  expect(map.data[0].product_id).toBe(productId);

  await page.goto(`${stack.adminOrigin}/sales?tab=orders`);
  await expect(page.locator(`[data-testid=sales-order][data-ref="${orderRef}"]`)).toContainText(
    `Topper Uji ${runId}`,
  );
});
