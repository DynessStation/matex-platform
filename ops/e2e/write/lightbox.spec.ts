import { expect, test, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId, uploadSample } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the image preview (frontend/admin/src/app/shared/components/ui/
// lightbox and directives/image-preview.directive.ts, U-15): an eye button on an image
// opens it full screen without selecting it; a set (the Media library) moves with the
// arrows and buttons, a single image (a table thumbnail) shows alone; Esc, a click
// beside the image, or the close button closes it, also over the media picker modal.
test.describe.configure({ mode: 'serial' });

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

let productSku = '';

test.beforeAll(async () => {
  const owner = await apiLogin(admin.identity, admin.password);
  const thumbnail = await uploadSample(owner, 'product_media');
  for (let index = 0; index < 2; index++) {
    await uploadSample(owner, 'product_media');
  }
  const category = await owner.post('/api/v1/product-categories', {
    data: {
      key: `pratinjau-${runId}`,
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: `pratinjau-${runId}`, name: 'Kategori Pratinjau' },
        { locale: 'en-US', slug: `preview-${runId}`, name: 'Preview Category' },
      ],
    },
  });
  expect(category.status(), await category.text()).toBe(201);
  productSku = `PRV-${runId}`.toUpperCase();
  const product = await owner.post('/api/v1/products', {
    data: {
      key: `pratinjau-${runId}`,
      sku: productSku,
      status: 'draft',
      unit: 'pcs',
      price_visibility: 'contact',
      category_ids: [(await category.json()).data.id],
      media: [{ id: thumbnail, role: 'thumbnail', sort_order: 0 }],
      translations: [
        { locale: 'id-ID', slug: `pratinjau-${runId}`, name: `Produk pratinjau ${runId}` },
        { locale: 'en-US', slug: `preview-${runId}`, name: `Preview product ${runId}` },
      ],
    },
  });
  expect(product.status(), await product.text()).toBe(201);
  await owner.dispose();
});

test('the Media library previews its images as a set, without selecting them', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/media`);
  const boxes = page.locator('.library-box');
  await expect(boxes.nth(2)).toBeVisible();

  // The eye button shows on hover and opens the preview; the card stays unselected.
  const first = boxes.first();
  const eye = first.locator('.image-preview-button');
  await first.hover();
  await expect(eye).toBeVisible();
  await eye.click();
  const box = page.locator('app-lightbox .lightbox');
  await expect(box).toBeVisible();
  await expect(first.locator('input.media-checkbox')).not.toBeChecked();
  await expect(box.locator('.lightbox-close')).toBeFocused();
  const count = box.locator('.lightbox-count');
  await expect(count).toHaveText(/^\s*1 \/ \d+\s*$/);
  const total = Number((await count.innerText()).split('/')[1]);
  expect(total).toBeGreaterThanOrEqual(3);
  await expect(page.locator('body')).toHaveClass(/lightbox-open/);

  // Arrows and buttons move through the set, wrapping at the ends.
  const firstSrc = await box.locator('.lightbox-image').getAttribute('src');
  await page.keyboard.press('ArrowRight');
  await expect(count).toHaveText(`2 / ${total}`);
  await expect(box.locator('.lightbox-image')).not.toHaveAttribute('src', firstSrc!);
  await box.locator('.lightbox-previous').click();
  await expect(count).toHaveText(`1 / ${total}`);
  await page.keyboard.press('ArrowLeft');
  await expect(count).toHaveText(`${total} / ${total}`);
  await box.locator('.lightbox-next').click();
  await expect(count).toHaveText(`1 / ${total}`);

  // Esc closes and gives focus back to the eye button.
  await page.keyboard.press('Escape');
  await expect(box).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/lightbox-open/);
  await expect(eye).toBeFocused();

  expect(errors).toEqual([]);
});

test('a table thumbnail shows alone and closes with a click beside it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/product?search=${productSku}`);
  const row = page.locator('app-table tbody tr', { hasText: productSku });
  await expect(row).toHaveCount(1);
  const thumbnail = row.locator('.image-preview');
  await thumbnail.hover();
  await thumbnail.locator('.image-preview-button').click();
  const box = page.locator('app-lightbox .lightbox');
  await expect(box).toBeVisible();
  await expect(box.locator('.lightbox-previous, .lightbox-next, .lightbox-count')).toHaveCount(0);
  await expect(box.locator('.lightbox-image')).toHaveAttribute(
    'src',
    (await row.locator('img.tbl-image').getAttribute('src'))!,
  );
  await page.keyboard.press('ArrowRight');
  await expect(box).toBeVisible();

  // A click on the dark area closes it; a click on the image does not.
  await box.locator('.lightbox-image').click();
  await expect(box).toBeVisible();
  await page.mouse.click(10, 300);
  await expect(box).toBeHidden();
  await expect(page).toHaveURL(/\/product\?/);

  expect(errors).toEqual([]);
});

test('over the media picker modal, Esc closes only the preview', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/product/create`);
  await page.locator('app-form-product .nav-link', { hasText: 'Media' }).first().click();
  await page.locator('.tab-pane.active li.choosefile-input').first().click();
  const modal = page.locator('.modal-content');
  await expect(modal).toBeVisible();
  const card = modal.locator('.library-box').first();
  await expect(card).toBeVisible();
  await card.hover();
  await card.locator('.image-preview-button').click();
  const box = page.locator('app-lightbox .lightbox');
  await expect(box).toBeVisible();
  await expect(card.locator('input.media-checkbox')).not.toBeChecked();

  // Focus stays in the preview (the modal's focus trap does not take it back).
  await page.keyboard.press('Tab');
  await expect(box.locator('.lightbox-previous')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(box).toBeHidden();
  await expect(modal).toBeVisible();

  // The close button closes it too.
  await card.hover();
  await card.locator('.image-preview-button').click();
  await box.locator('.lightbox-close').click();
  await expect(box).toBeHidden();
  await expect(modal).toBeVisible();

  expect(errors).toEqual([]);
});
