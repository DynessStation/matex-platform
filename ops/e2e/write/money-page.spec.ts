import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, expectCode, login, runId, saveRecording } from './api-contract';
import { incomeXlsx, ordersCsv, SPREADSHEET_MIME } from './sales-fixtures';
import { stack } from './stack.mjs';

// Browser contract of Bisnis > Dasbor Uang: the period's cards, the tables, the book with its
// balances, and a payment recorded from the page.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let platformId = '';
let partnerId = '';
const partnerName = `Atrija ${runId}`;
const orderRef = `58901${runId.padStart(8, '0')}1`.replace(/\D/g, '');
const skuRef = `17390${runId.padStart(8, '0')}1`.replace(/\D/g, '');

async function signIn(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  const entities = await expectCode(await owner.get('/api/v1/business/entities'), 200);
  platformId = entities.data.find((e: { kind: string }) => e.kind === 'platform').id;
  partnerId = (
    await expectCode(
      await owner.post('/api/v1/business/entities', {
        data: { name: partnerName, kind: 'partner' },
      }),
      201,
    )
  ).data.id;
  const channels = await expectCode(await owner.get('/api/v1/business/channels'), 200);
  const tiktok =
    channels.data.find((c: { key: string }) => c.key === 'tiktok-shop') ?? channels.data[0];
  const storeId = (
    await expectCode(
      await owner.post(`/api/v1/business/entities/${partnerId}/stores`, {
        data: { channel_id: tiktok.id, name: `${partnerName} TikTok` },
      }),
      201,
    )
  ).data.id;
  await expectCode(
    await owner.post(`/api/v1/business/entities/${partnerId}/rules`, {
      data: {
        name: 'Produksi MIA',
        from: '2026-01-01',
        components: [
          { kind: 'production_fee', label: 'Biaya produksi', type: 'cost_plus', value: 10 },
        ],
      },
    }),
    201,
  );
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `money-ui-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `money-ui-${runId}-id`, name: `Kategori Uang UI ${runId}` },
          { locale: 'en-US', slug: `money-ui-${runId}-en`, name: `Money UI Category ${runId}` },
        ],
      },
    }),
    201,
  );
  const sku = `MONEY-UI-${runId}`.toUpperCase();
  const productId = (
    await expectCode(
      await owner.post('/api/v1/products', {
        data: {
          key: `money-ui-${runId}`,
          sku,
          status: 'draft',
          category_ids: [category.data.id],
          price_visibility: 'contact',
          prices: [],
          seller_entity_id: partnerId,
          translations: [
            { locale: 'id-ID', slug: `money-ui-${runId}-id`, name: `Bantal Atrija ${runId}` },
            { locale: 'en-US', slug: `money-ui-${runId}-en`, name: `Atrija Pillow ${runId}` },
          ],
        },
      }),
      201,
    )
  ).data.id;
  const item = await expectCode(
    await owner.post('/api/v1/costing/items', { data: { name: `HPP Atrija ${runId}`, sku } }),
    201,
  );
  await expectCode(
    await owner.put(`/api/v1/costing/items/${item.data.id}/recipe`, {
      data: { lines: [{ label: 'Jasa', own_price: 30000, qty: 1 }] },
    }),
    200,
  );
  const upload = (file: { name: string; mimeType: string; buffer: Buffer }) =>
    owner.post('/api/v1/sales/imports', { multipart: { store: storeId, apply: '1', file } });
  await expectCode(
    await upload({
      name: 'pesanan.csv',
      mimeType: 'text/csv',
      buffer: ordersCsv([
        {
          order: orderRef,
          status: 'Selesai',
          sku: skuRef,
          sellerSku: 'bantal',
          name: 'Bantal Latex',
          variation: 'Standar',
          qty: 2,
          price: 100000,
          platformDiscount: 0,
          sellerDiscount: 0,
          amount: 200000,
          created: '05/11/2026 10:00:00',
          paid: '05/11/2026 10:01:00',
        },
      ]),
    }),
    200,
  );
  const map = await expectCode(
    await owner.get('/api/v1/sales/sku-map', { params: { store: storeId } }),
    200,
  );
  await expectCode(
    await owner.put(`/api/v1/sales/sku-map/${map.data[0].id}`, { data: { product_id: productId } }),
    200,
  );
  await expectCode(
    await upload({
      name: 'income.xlsx',
      mimeType: SPREADSHEET_MIME,
      buffer: await incomeXlsx([
        {
          ref: orderRef,
          label: 'Pesanan',
          ordered: '2026/11/05',
          settled: '2026/11/11',
          amount: 180000,
          revenue: 200000,
          fees: -20000,
          commission: -20000,
          orderRef,
          sku: skuRef,
          qty: 2,
        },
      ]),
    }),
    200,
  );
});

test.afterAll(async () => {
  await saveRecording('money-page', []);
  await owner?.dispose();
});

test('the dashboard shows the period, and a payment is recorded from the book', async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/money`);
  await page.locator('[data-testid=money-from]').fill('2026-11-01');
  await page.locator('[data-testid=money-to]').fill('2026-11-30');
  await page.locator('[data-testid=money-entity]').selectOption(partnerId);

  const cards = page.locator('[data-testid=money-cards]');
  await expect(page.locator('[data-testid=money-amount]')).toHaveText(/180\.000/);
  // HPP 2 x 30000 = 60000; gross profit 120000.
  await expect(page.locator('[data-testid=money-gross]')).toHaveText(/120\.000/);
  await expect(cards).toContainText('Pesanan cair');
  await expect(page.locator('[data-testid=money-stores]')).toContainText(`${partnerName} TikTok`);
  await expect(page.locator('[data-testid=money-products]')).toContainText(
    `Bantal Atrija ${runId}`,
  );
  // Production fee: 2 x 30000 x 1.1 = 66000 owed to the platform.
  await expect(
    page.locator(`[data-testid=money-parties] tr[data-entity="${partnerName}"]`),
  ).toContainText('66.000');
  await expect(
    page.locator(`[data-testid=money-balances] [data-entity="${partnerName}"]`),
  ).toContainText('-Rp 66.000');
  await expect(page.locator('[data-testid=money-entry][data-kind=production_fee]')).toHaveCount(1);

  await page.locator('[data-testid=money-payer]').selectOption(partnerId);
  await page.locator('[data-testid=money-payee]').selectOption(platformId);
  await page.locator('[data-testid=money-payment-date]').fill('2026-11-12');
  await page.locator('[data-testid=money-payment-amount]').fill('66000');
  await page.locator('[data-testid=money-payment-note]').fill('Transfer uji');
  await page.locator('[data-testid=money-payment-save]').click();
  await expect(page.locator('[data-testid=money-entry][data-kind=payment]')).toHaveCount(1);
  await expect(page.locator('[data-testid=money-balances]')).toContainText('Semua lunas');

  const rebuilt = page.waitForResponse((response) => response.url().includes('/money/rebuild'));
  await page.locator('[data-testid=money-rebuild]').click();
  expect((await (await rebuilt).json()).data).toMatchObject({ rows_added: 0 });
});
