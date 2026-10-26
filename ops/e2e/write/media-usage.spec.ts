import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId, uploadSample } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the "Dipakai: n" mark on media cards
// (frontend/admin/src/app/shared/components/ui/media-box, U-14): a file used by a product shows
// how often it is used and, on hover, where; an unused file says so.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let used = '';
let unused = '';
let productId = '';
let categoryId = '';

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

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  const category = await owner.post('/api/v1/product-categories', {
    data: {
      key: `media-pakai-${runId}`,
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: `media-pakai-${runId}-id`, name: 'Kategori Media' },
        { locale: 'en-US', slug: `media-pakai-${runId}-en`, name: 'Media Category' },
      ],
    },
  });
  expect(category.status()).toBe(201);
  categoryId = (await category.json()).data.id;
  used = await uploadSample(owner, 'product_media');
  const product = await owner.post('/api/v1/products', {
    data: {
      key: `media-pakai-${runId}`,
      sku: `MDP-${runId}`.toUpperCase(),
      status: 'draft',
      category_ids: [categoryId],
      media: [
        { id: used, role: 'thumbnail', sort_order: 0 },
        { id: used, role: 'gallery', sort_order: 0 },
      ],
      translations: [
        { locale: 'id-ID', slug: `media-pakai-${runId}-id`, name: 'Produk Media' },
        { locale: 'en-US', slug: `media-pakai-${runId}-en`, name: 'Media Product' },
      ],
    },
  });
  expect(product.status()).toBe(201);
  productId = (await product.json()).data.id;
  unused = await uploadSample(owner, 'media_library');
});

test.afterAll(async () => {
  await owner.delete(`/api/v1/products/${productId}`);
  await owner.delete(`/api/v1/attachment/${unused}`);
  await owner.delete(`/api/v1/product-categories/${categoryId}`);
  await owner.dispose();
});

test('each media card says how often and where the file is used', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/media`);
  await page.locator('app-media-box select.form-select').selectOption('newest');

  const card = (id: string) => page.locator(`.library-box:has(#attachment-${id})`);
  await expect(card(unused).locator('.media-card-usage')).toHaveText('Belum dipakai');
  const mark = card(used).locator('.media-card-usage');
  await expect(mark).toHaveText('Dipakai: 2');
  await expect(mark).toHaveClass(/is-used/);
  await expect(mark).toHaveAttribute('aria-label', /Produk: 2/);

  await mark.hover();
  await expect(page.locator('ngb-tooltip-window')).toContainText('Produk: 2');
  await expect(page.locator('ngb-tooltip-window')).toContainText('tidak bisa dihapus');
  expect(errors).toEqual([]);
});
