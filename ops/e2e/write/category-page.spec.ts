import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the product category page (frontend/admin/src/app/components/category,
// U-12): tree and form in one card, form tabs on top with one save button, product counts and
// state labels in the tree, the save that shows the missing field (tab and language), slugs
// filled from names, editing, the tree drag, and a search that survives a reload of the tree.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
const ids: Record<string, string> = {};
const name = (label: string) => `${label} ${runId}`;

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

async function createCategory(key: string, label: string, extra: Record<string, unknown> = {}) {
  const response = await owner.post('/api/v1/product-categories', {
    data: {
      key: `${key}-${runId}`,
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: `${key}-${runId}-id`, name: name(label) },
        { locale: 'en-US', slug: `${key}-${runId}-en`, name: `${name(label)} EN` },
      ],
      ...extra,
    },
  });
  expect(response.status()).toBe(201);
  ids[key] = (await response.json()).data.id;
}

const node = (page: Page, label: string) =>
  page.locator('app-tree-node > li > div', { hasText: name(label) }).first();

const position = async (id: string) =>
  (await (await owner.get(`/api/v1/product-categories/${id}`)).json()).data.position;

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  await createCategory('induk', 'Induk Uji');
  await createCategory('anak-a', 'Anak A', { parent_id: ids['induk'] });
  await createCategory('anak-b', 'Anak B', { parent_id: ids['induk'] });
  await createCategory('draf', 'Draf Uji', { status: 'draft' });
  const product = await owner.post('/api/v1/products', {
    data: {
      key: `kategori-halaman-${runId}`,
      sku: `KTH-${runId}`.toUpperCase(),
      status: 'draft',
      category_ids: [ids['induk']],
      translations: [
        { locale: 'id-ID', slug: `kategori-halaman-${runId}-id`, name: 'Produk Halaman' },
        { locale: 'en-US', slug: `kategori-halaman-${runId}-en`, name: 'Page Product' },
      ],
    },
  });
  expect(product.status()).toBe(201);
  ids['product'] = (await product.json()).data.id;
});

test.afterAll(async () => {
  await owner.delete(`/api/v1/products/${ids['product']}`);
  for (const key of ['anak-a', 'anak-b', 'baru', 'induk', 'draf']) {
    if (ids[key]) await owner.delete(`/api/v1/product-categories/${ids[key]}`);
  }
  await owner.dispose();
});

test('tree and form share one card; the tree shows product counts and states', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/category`);

  await expect(page.locator('.page-body .card')).toHaveCount(1);
  await expect(page.locator('.category-tree-panel app-tree')).toBeVisible();
  await expect(page.locator('.category-form .category-nav .nav-link')).toHaveText([
    /Umum/,
    /Konten & Bahasa/,
    /SEO/,
    /Media/,
  ]);
  await expect(node(page, 'Induk Uji').locator('.category-node-count')).toHaveText('1 produk');
  await expect(node(page, 'Anak A').locator('.category-node-count')).toHaveText('0 produk');
  await expect(node(page, 'Draf Uji').locator('.category-node-state')).toHaveText('Draft');

  // Nothing sticks out of the card on a laptop screen.
  const card = (await page.locator('.page-body .card').boundingBox())!;
  const form = (await page.locator('.category-form').boundingBox())!;
  expect(form.x + form.width).toBeLessThanOrEqual(card.x + card.width);
  expect(errors).toEqual([]);
});

test('save works from any tab and shows the missing field; slugs follow the names', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/category`);
  const save = page.locator('#category_btn');

  await page.locator('#key').fill(`baru-${runId}`);
  await save.click();
  // Indonesian name and slug are missing: the Konten tab opens on Bahasa Indonesia.
  await expect(page.locator('.category-nav .nav-link.active')).toContainText('Konten');
  await expect(
    page.locator('.category-tab-content .tab-pane.active .category-language-tabs button.active'),
  ).toContainText('ID');
  await page.locator('[formcontrolname=id_name]').fill(name('Kategori Baru'));
  await page.locator('[formcontrolname=id_name]').blur();
  await expect(page.locator('[formcontrolname=id_slug]')).toHaveValue(`kategori-baru-${runId}`);

  // Now English is missing: the form switches to the English fields.
  await save.click();
  await expect(
    page.locator('.category-tab-content .tab-pane.active .category-language-tabs button.active'),
  ).toContainText('EN');
  await page.locator('[formcontrolname=en_name]').fill(`New Category ${runId}`);
  await page.locator('[formcontrolname=en_name]').blur();
  await expect(page.locator('[formcontrolname=en_slug]')).toHaveValue(`new-category-${runId}`);

  // Saved from the Konten tab, without visiting Media.
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/product-categories') && r.request().method() === 'POST',
  );
  await save.click();
  const response = await created;
  expect(response.status()).toBe(201);
  ids['baru'] = (await response.json()).data.id;
  await expect(node(page, 'Kategori Baru')).toBeVisible();
  await expect(page.locator('#key')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('edit shows the place, saves from the first tab, and goes back to the page', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/category/edit/${ids['anak-a']}`);
  await expect(page.locator('.category-form-heading')).toContainText('Ubah kategori');
  await expect(page.locator('.category-form-name')).toHaveText(name('Anak A'));
  await expect(page.locator('#position')).toHaveValue('Posisi 1 dari 2');
  await expect(page.locator('.title-header a', { hasText: 'Kategori baru' })).toBeVisible();

  const updated = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/v1/product-categories/${ids['anak-a']}`) &&
      r.request().method() === 'PUT',
  );
  await page.locator('#category_btn').click();
  expect((await updated).status()).toBe(200);
  await page.waitForURL(/\/category$/);
  expect(errors).toEqual([]);
});

test('drag reorders a level; the search stays after the tree reloads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/category`);
  expect(await position(ids['anak-b'])).toBe(2);

  // Drop B on A: B takes A's place (native drag and drop).
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes('/api/v1/product-categories/reorder') && r.request().method() === 'PATCH',
  );
  const handle = (await node(page, 'Anak B').locator('.category-drag-handle').boundingBox())!;
  const target = (await node(page, 'Anak A').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y - 10, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await page.mouse.up();
  expect((await saved).status()).toBe(200);
  await expect.poll(() => position(ids['anak-b'])).toBe(1);

  // Search, then delete one match: the reloaded tree keeps the filter.
  const search = page.locator('app-tree input.form-control');
  await search.fill(runId);
  await expect(node(page, 'Draf Uji')).toBeVisible();
  await node(page, 'Draf Uji').locator('.ri-delete-bin-7-line').dispatchEvent('click');
  await page.locator('#delete_yes_btn').click();
  await expect(node(page, 'Draf Uji')).toHaveCount(0);
  delete ids['draf'];
  await expect(search).toHaveValue(runId);
  const names = await page.locator('app-tree-node .category-node-name').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const text of names) expect(text).toContain(runId);
  expect(errors).toEqual([]);
});
