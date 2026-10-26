import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the "Urutan" redesign (6D): no typed sort numbers in any form; the
// server keeps positions 1..n. FAQ and public offices get "Atur urutan" (drag list,
// frontend/admin/src/app/shared/components/ui/order-list), products a "Tampilkan di depan
// katalog" checkbox and the "Produk di depan" panel, contact cards up/down buttons, and
// category, navigation, and photo forms show their place read-only. Every change made here is
// undone at the end, so the other specs see the seeded order.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let categoryId = '';
const productIds: string[] = [];
let originalFront: string[] = [];

// Retries the form: on a busy machine hydration can clear a field typed too early.
async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

const ids = async (path: string): Promise<string[]> =>
  ((await (await owner.get(path)).json()).data.data as any[]).map((item) => item.id);

const panel = (page: Page) => page.locator('app-order-list');
const rows = (page: Page) => panel(page).locator('.order-list__item');

/** The drawer opened from the page header has this section of the page guide. */
async function expectGuideSection(page: Page, anchor: string): Promise<void> {
  await page.locator('.header-help').click();
  const drawer = page.locator('app-help-drawer .help-drawer');
  await expect(drawer.locator('.help-section').first()).toBeVisible();
  await expect(drawer.locator(`[id="help-${anchor}"]`)).toHaveCount(1);
  await drawer.locator('.help-drawer-close').click();
}

/** Clicks "Simpan urutan" and returns the ids the page sent. */
async function saveOrder(page: Page, path: string): Promise<string[]> {
  const request = page.waitForRequest(
    (r) => r.method() === 'PUT' && new URL(r.url()).pathname === path,
  );
  const response = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && new URL(r.url()).pathname === path,
  );
  await panel(page).locator('#save_order').click();
  expect((await response).status()).toBe(200);
  await expect(panel(page)).toHaveCount(0);
  return (await request).postDataJSON().ids;
}

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  originalFront = await ids('/api/v1/products/front');
  const category = await owner.post('/api/v1/product-categories', {
    data: {
      key: `depan-${runId}`,
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: `depan-${runId}`, name: 'Kategori Depan' },
        { locale: 'en-US', slug: `front-${runId}`, name: 'Front Category' },
      ],
    },
  });
  expect(category.status()).toBe(201);
  categoryId = (await category.json()).data.id;
  for (const name of ['satu', 'dua']) {
    const created = await owner.post('/api/v1/products', {
      data: {
        key: `depan-${name}-${runId}`,
        sku: `DPN-${name}-${runId}`.toUpperCase(),
        status: 'published',
        catalog_front: true,
        category_ids: [categoryId],
        translations: [
          { locale: 'id-ID', slug: `depan-${name}-${runId}-id`, name: `Depan ${name} ${runId}` },
          { locale: 'en-US', slug: `depan-${name}-${runId}-en`, name: `Front ${name} ${runId}` },
        ],
      },
    });
    expect(created.status()).toBe(201);
    productIds.push((await created.json()).data.id);
  }
});

test.afterAll(async () => {
  await owner.put('/api/v1/products/front', { data: { ids: originalFront } });
  for (const id of productIds) await owner.delete(`/api/v1/products/${id}`);
  if (categoryId) await owner.delete(`/api/v1/product-categories/${categoryId}`);
  await owner.dispose();
});

test('FAQ: "Atur urutan" drags rows, saves the whole order, and the form shows the place', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const original = await ids('/api/v1/faq/order');
  expect(original.length).toBeGreaterThan(2);
  await login(page);
  await page.goto(`${stack.adminOrigin}/faq`);

  await page.locator('#open_faq_order').click();
  await expect(rows(page)).toHaveCount(original.length);
  await expect(page.locator('app-table')).toBeHidden();
  await expect(rows(page).first().locator('.order-list__position')).toHaveText('1');
  await expectGuideSection(page, 'atur-urutan');
  // Nothing moved yet: nothing to save.
  await expect(panel(page).locator('#save_order')).toBeDisabled();

  // Drag the first row onto the lower half of the second (the CDK needs a few pointer moves).
  const handle = rows(page).first().locator('.order-list__handle');
  const from = (await handle.boundingBox())!;
  const to = (await rows(page).nth(1).boundingBox())!;
  const x = from.x + from.width / 2;
  await page.mouse.move(x, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, from.y + from.height / 2 + 8, { steps: 4 });
  await page.mouse.move(x, to.y + to.height * 0.75, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(() => rows(page).evaluateAll((items) => items.map((item) => item.dataset['id'])))
    .toEqual([original[1], original[0], ...original.slice(2)]);

  // The arrows move rows too: the last row goes up one place.
  const last = original.length - 1;
  await rows(page)
    .nth(last)
    .getByRole('button', { name: /^Naikkan/ })
    .click();
  await expect(rows(page).nth(last - 1)).toHaveAttribute('data-id', original[last]);

  const expected = [original[1], original[0], ...original.slice(2)];
  [expected[last - 1], expected[last]] = [expected[last], expected[last - 1]];
  expect(await saveOrder(page, '/api/v1/faq/order')).toEqual(expected);
  expect(await ids('/api/v1/faq/order')).toEqual(expected);
  await expect(page.locator('app-table')).toBeVisible();

  // The form has no number box: the place is read-only; a new FAQ goes last.
  await page.goto(`${stack.adminOrigin}/faq/edit/${original[0]}`);
  await expect(page.locator('#position')).toHaveValue(`Posisi 2 dari ${original.length}`);
  await expect(page.locator('[formcontrolname=sort_order]')).toHaveCount(0);
  await page.goto(`${stack.adminOrigin}/faq/create`);
  await expect(page.locator('#position')).toHaveValue('Paling akhir setelah disimpan');

  await owner.put('/api/v1/faq/order', { data: { ids: original } });
  expect(errors).toEqual([]);
});

test('Offices: "Atur urutan" lists only public offices; Batal closes it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const publicIds = await ids('/api/v1/office/public-order');
  await login(page);
  await page.goto(`${stack.adminOrigin}/office`);

  await page.locator('#open_office_order').click();
  await expect(panel(page).locator('.order-panel__title')).toContainText('kantor publik');
  if (publicIds.length) {
    await expect(rows(page)).toHaveCount(publicIds.length);
    await expect(rows(page).first()).toHaveAttribute('data-id', publicIds[0]);
  } else {
    await expect(panel(page).locator('.order-panel__empty')).toBeVisible();
  }
  await expectGuideSection(page, 'atur-urutan');
  await panel(page).locator('#cancel_order').click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('app-table')).toBeVisible();
  expect(await ids('/api/v1/office/public-order')).toEqual(publicIds);
  expect(errors).toEqual([]);
});

test('Products: the front checkbox, its place, and the "Produk di depan" panel', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const front = await ids('/api/v1/products/front');
  expect(front.slice(-2)).toEqual(productIds);
  await login(page);

  // Form: the checkbox replaces the number box; the line under it tells the place.
  await page.goto(`${stack.adminOrigin}/product/edit/${productIds[1]}`);
  const checkbox = page.locator('#catalog_front');
  await expect(checkbox).toBeChecked();
  await expect(page.locator('#catalog_front_info')).toContainText(
    `Posisi ${front.length} dari ${front.length} di depan katalog`,
  );
  await expect(page.locator('[formcontrolname=sort_order]')).toHaveCount(0);
  await checkbox.uncheck();
  await expect(page.locator('#catalog_front_info')).toContainText('dari yang terbaru');
  await page.goto(`${stack.adminOrigin}/product/create`);
  await expect(page.locator('#catalog_front')).not.toBeChecked();
  await page.locator('#catalog_front').check();
  await expect(page.locator('#catalog_front_info')).toContainText('Masuk paling akhir');

  // Panel: move the last product first, take the other one out, save.
  await page.goto(`${stack.adminOrigin}/product`);
  await page.locator('#open_product_front').click();
  await expect(rows(page)).toHaveCount(front.length);
  await expect(panel(page).locator('.order-panel__count')).toHaveText(
    `${front.length} dari maksimal 12`,
  );
  await expectGuideSection(page, 'produk-di-depan');
  for (let index = front.length - 1; index > 0; index--) {
    await rows(page)
      .nth(index)
      .getByRole('button', { name: /^Naikkan/ })
      .click();
  }
  await expect(rows(page).first()).toHaveAttribute('data-id', productIds[1]);
  await panel(page)
    .locator(`.order-list__item[data-id="${productIds[0]}"]`)
    .getByRole('button', { name: /^Keluarkan/ })
    .click();
  await expect(rows(page)).toHaveCount(front.length - 1);
  const expected = [productIds[1], ...front.filter((id) => !productIds.includes(id))];
  expect(await saveOrder(page, '/api/v1/products/front')).toEqual(expected);
  expect(await ids('/api/v1/products/front')).toEqual(expected);
  const detail = await (await owner.get(`/api/v1/products/${productIds[0]}`)).json();
  expect(detail.data).toMatchObject({ catalog_front: false, sort_order: 0 });
  expect(errors).toEqual([]);
});

test('Categories and navigation show their place read-only', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);

  await page.goto(`${stack.adminOrigin}/category/edit/${categoryId}`);
  await expect(page.locator('#position')).toHaveValue(/^Posisi \d+ dari \d+$/);
  await expect(page.locator('[formcontrolname=sort_order]')).toHaveCount(0);
  await page.goto(`${stack.adminOrigin}/category`);
  await expect(page.locator('#position')).toHaveValue('Paling akhir setelah disimpan');

  await page.goto(`${stack.adminOrigin}/menu`);
  // The pencil shows only while its row is hovered (template CSS), so it is clicked directly.
  await page.locator('app-menu-tree .tree-options a').first().dispatchEvent('click');
  await expect(page.locator('#fixed_navigation_position')).toHaveValue(/^Posisi 1 dari \d+$/);
  expect(errors).toEqual([]);
});

test('Contact settings: cards move up and down and are saved in that order', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/public-contact`);
  const keys = page.locator('[formarrayname=channels] [formcontrolname=key]');
  await expect(keys.first()).toBeVisible();
  expect(await keys.count()).toBeGreaterThan(1);
  await expect(page.locator('[formcontrolname=sort_order]')).toHaveCount(0);
  const first = await keys.nth(0).inputValue();
  const second = await keys.nth(1).inputValue();
  // Seeded topics have no recipient (addresses never go into seeds); give them a test one.
  const recipients = page.locator('[formcontrolname=recipient_email]');
  for (let index = 0; index < (await recipients.count()); index++) {
    if (!(await recipients.nth(index).inputValue())) {
      await recipients.nth(index).fill('kontak-uji@example.invalid');
    }
  }

  const save = async () => {
    const request = page.waitForRequest(
      (r) => r.method() === 'PUT' && new URL(r.url()).pathname === '/api/v1/public-contact',
    );
    const response = page.waitForResponse(
      (r) =>
        r.request().method() === 'PUT' && new URL(r.url()).pathname === '/api/v1/public-contact',
    );
    await page.locator('#public_contact_save').click();
    expect((await response).status()).toBe(200);
    return (await request).postDataJSON().channels.map((item: any) => item.key);
  };

  await expect(page.getByRole('button', { name: 'Naikkan kanal 1' })).toBeDisabled();
  await page.getByRole('button', { name: 'Turunkan kanal 1' }).click();
  await expect(keys.nth(0)).toHaveValue(second);
  await expect(keys.nth(1)).toHaveValue(first);
  expect((await save()).slice(0, 2)).toEqual([second, first]);
  const saved = await (await owner.get('/api/v1/public-contact')).json();
  expect(saved.data.channels.slice(0, 2)).toMatchObject([
    { key: second, sort_order: 1 },
    { key: first, sort_order: 2 },
  ]);

  // Back to the order before.
  await page.getByRole('button', { name: 'Naikkan kanal 2' }).click();
  await expect(keys.nth(0)).toHaveValue(first);
  expect((await save()).slice(0, 2)).toEqual([first, second]);
  expect(errors).toEqual([]);
});
