import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  admin,
  adminReferences,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
  runId,
  saveRecording,
} from './api-contract';
import { stack } from './stack.mjs';

// Browser contract of Katalog > HPP & Harga and the product detail popup.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let productId = '';
let itemId = '';
const sku = `UI-${runId}`.toUpperCase();
const itemName = `Kasur UI ${runId}`;
const materialName = `Bahan UI ${runId}`;
let blocked = { identity: '', password: '' };

async function signIn(page: Page, identity = admin.identity, password = admin.password) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(identity);
  await page.locator('#password').fill(password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `ui-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `ui-${runId}-id`, name: `Kategori UI ${runId}` },
          { locale: 'en-US', slug: `ui-${runId}-en`, name: `Category UI ${runId}` },
        ],
      },
    }),
    201,
  );
  const product = await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        key: `ui-${runId}`,
        sku,
        status: 'published',
        barcode: 'BAR-123',
        weight_grams: 1500,
        length_mm: 2000,
        category_ids: [category.data.id],
        price_visibility: 'displayed',
        prices: [
          { type: 'end_user', currency: 'IDR', amount: 100000, is_public: true },
          { type: 'end_user', currency: 'USD', amount: 7, is_public: true },
        ],
        translations: [
          { locale: 'id-ID', slug: `ui-${runId}-id`, name: 'Produk UI', meta_title: 'Judul UI' },
          { locale: 'en-US', slug: `ui-${runId}-en`, name: 'UI Product' },
        ],
      },
    }),
    201,
  );
  productId = product.data.id;
  const material = await expectCode(
    await owner.post('/api/v1/costing/materials', {
      data: { name: materialName, kind: 'material', unit: 'kg', price: 10000 },
    }),
    201,
  );
  const item = await expectCode(
    await owner.post('/api/v1/costing/items', {
      data: { name: itemName, sku, width: 90, length: 200, height: 5 },
    }),
    201,
  );
  itemId = item.data.id;
  await expectCode(
    await owner.put(`/api/v1/costing/items/${itemId}/recipe`, {
      data: { lines: [{ label: 'Latex', material_id: material.data.id, qty: 10 }] },
    }),
    200,
  );
  const account = await createAdminAccount(
    owner,
    'ProdukSaja',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Produk saja ${runId}`, ['product.view']),
    }),
  );
  blocked = account;
});

test.afterAll(async () => {
  await saveRecording('costing-page', []);
  await owner?.dispose();
});

test('the list shows the ladder, finds an item, and applies its price after asking', async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/costing`);
  await page.locator('[data-testid=costing-search]').fill(sku);
  const row = page.locator(`[data-testid=costing-row][data-sku=${sku}]`);
  await expect(row).toBeVisible();
  // 100.000 / 0.8 / 0.95 / 0.8
  await expect(row).toContainText(/Rp\s*100\.000/);
  await expect(row).toContainText(/Rp\s*164\.474/);

  const apply = page.locator('[data-testid=costing-apply]');
  await expect(apply).toBeDisabled();
  await row.locator('input[type=checkbox]').check();
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page.locator('[data-testid=costing-confirm]')).toBeVisible();
  await page.locator('[data-testid=costing-apply-yes]').click();
  await expect(page.locator('[data-testid=costing-confirm]')).toHaveCount(0);

  const item = await expectCode(await owner.get(`/api/v1/costing/items/${itemId}`), 200);
  expect(item.data.live.idr).toBe(164474);
});

test('an item opens with its recipe, and a new line changes the HPP', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/costing`);
  await page.locator('[data-testid=costing-search]').fill(sku);
  await page.locator('[data-testid=costing-open]').first().click();
  const modal = page.locator('[data-testid=costing-modal]');
  await expect(modal.locator('[data-testid=costing-ladder]')).toContainText(/Rp\s*100\.000/);
  await expect(modal.locator('[data-testid=item-name]')).toHaveValue(itemName);
  await expect(modal.locator('[data-testid=recipe-save]')).toBeDisabled();

  await modal.locator('[data-testid=inline-add]').click();
  await modal.locator('td[data-column=label] input').fill('Jasa');
  await modal.locator('td[data-column=own_price] input').fill('20000');
  await modal.locator('[data-testid=inline-save]').click();
  await expect(modal.locator('[data-testid=recipe-total]')).toContainText(/120\.000/);
  await modal.locator('[data-testid=recipe-save]').click();
  await expect(modal.locator('[data-testid=costing-ladder]')).toContainText(/Rp\s*120\.000/);
  await expect(modal.locator('h6', { hasText: 'Resep' })).toContainText('versi 2');
});

test('materials: a new price shows its effect before it is saved', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/costing?tab=materials`);
  const table = page.locator('[data-testid=materials]');
  const row = table.locator('[data-testid=inline-row]', { hasText: materialName });
  await expect(row).toBeVisible();
  await row.locator('[data-testid=inline-edit]').click();
  await table.locator('td[data-column=price] input').fill('11000');
  await table.locator('[data-testid=material-impact]').click();
  const result = page.locator('[data-testid=material-impact-result]');
  await expect(result).toContainText(materialName);
  await expect(result).toContainText(/Rp\s*130\.000/);
});

test('channels: a charge typed in counts in the calculator', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/costing?tab=channels`);
  const shopee = page.locator('[data-channel=Shopee]');
  await shopee.locator('[data-testid=inline-add]').click();
  await shopee.locator('td[data-column=name] input').fill(`Admin ${runId}`);
  await shopee.locator('td[data-column=value] input').fill('10');
  await shopee.locator('[data-testid=inline-save]').click();
  await expect(
    shopee.locator('[data-testid=inline-row]', { hasText: `Admin ${runId}` }),
  ).toBeVisible();

  await page.goto(`${stack.adminOrigin}/costing?tab=calculator`);
  await page.locator('[data-testid=calc-hpp]').fill('100000');
  await page.locator('[data-testid=calc-price]').fill('200000');
  const row = page.locator('[data-testid=calc-row][data-channel=Shopee]');
  await expect(row).toContainText(/Rp\s*180\.000/);
  await page.locator('[data-testid=calc-target]').fill('30');
  await expect(row.locator('td').last()).not.toHaveText('-');
});

test('the product popup shows everything, costs included for those allowed', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product?search=${sku}`);
  await page.locator('app-table tbody tr').first().locator('.action-dropdown-toggle').click();
  await page
    .locator('[class*=dropdown] button, [class*=dropdown] a', { hasText: 'Detail' })
    .first()
    .click();
  const detail = page.locator('[data-testid=product-detail]');
  await expect(page.locator('[data-testid=product-detail-header]')).toContainText(sku);
  await expect(page.locator('[data-testid=product-detail-since]')).toContainText('Diperbarui');
  await expect(detail).toContainText('BAR-123');
  await expect(detail).toContainText('= 1,5 kg');
  await expect(detail).toContainText('Judul UI');
  await expect(page.locator('[data-testid=product-detail-cost]')).toBeVisible();
  await expect(page.locator('[data-testid=product-detail-channels]')).toContainText('Shopee');
});

test('without the permission: no menu, no page, no costs in the popup', async ({ page }) => {
  await signIn(page, blocked.identity, blocked.password);
  await expect(page.locator('a[href="/costing"]')).toHaveCount(0);
  const costCalls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/costing')) costCalls.push(request.url());
  });
  await page.goto(`${stack.adminOrigin}/costing`);
  await expect(page).not.toHaveURL(/\/costing/);

  await page.goto(`${stack.adminOrigin}/product?search=${sku}`);
  await page.locator('app-table tbody tr').first().locator('.action-dropdown-toggle').click();
  await page
    .locator('[class*=dropdown] button, [class*=dropdown] a', { hasText: 'Detail' })
    .first()
    .click();
  await expect(page.locator('[data-testid=product-detail]')).toContainText('BAR-123');
  await expect(page.locator('[data-testid=product-detail-cost]')).toHaveCount(0);
  expect(costCalls).toEqual([]);
  expect(productId).toBeTruthy();
});
