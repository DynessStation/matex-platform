import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { admin, runId, saveRecording } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the product form (frontend/admin/src/app/components/product/form-product):
// every tab renders in create and edit mode, the tab handlers work (validation, measurement
// and price hints, specifications, prices, marketplace links, media, writing help), a new
// product is created, and saving it unchanged is recorded (MATEX_E2E_RECORD, see
// api-contract.ts) so the stored rows can be compared before and after a refactor. Guards
// the split of this form into one component per tab (6C).
test.describe.configure({ mode: 'serial' });

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'sample.png');

const TABS = ['Umum', 'Konten & Bahasa', 'Harga & Kanal', 'Media', 'SEO'];
const categoryName = `Kategori Form ${runId}`;
let productId = '';

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

function panel(page: Page) {
  return page.locator('app-form-product .tab-content .tab-pane.active');
}

async function openTab(page: Page, name: string): Promise<void> {
  await page.locator('app-form-product .nav-link', { hasText: name }).first().click();
  await expect(page.locator('app-form-product .nav-link.active')).toContainText(name);
}

function control(page: Page, name: string) {
  return panel(page).locator(`[formcontrolname=${name}]`);
}

async function chooseSelect2(page: Page, name: string, option: string): Promise<void> {
  await control(page, name).first().locator('.select2-selection').click();
  await control(page, name)
    .first()
    .locator('.select2-results__option', { hasText: option })
    .first()
    .click();
}

async function uploadThroughModal(page: Page): Promise<void> {
  const modal = page.locator('.modal-content');
  await expect(modal).toBeVisible();
  // The modal renders its tabs after it opens: wait for the upload tab, then open it.
  await modal
    .locator('.nav-link', { hasText: /Unggah|Upload/ })
    .first()
    .click();
  await modal.locator('input[type=file]').setInputFiles(fixture);
  const upload = page.waitForResponse(
    (r) => r.url().includes('/api/v1/attachment') && r.request().method() === 'POST',
  );
  await modal.locator('#media_upload_btn').click();
  // Pick the image just uploaded: the library may still list older ones first.
  const uploadedId = (await (await upload).json()).data[0].id_attachment;
  const card = modal.locator(`.library-box label[for="attachment-${uploadedId}"]`);
  await expect(card).toBeVisible();
  await card.click();
  await modal.getByRole('button', { name: /Pilih Media|Insert Media/ }).click();
  await expect(modal).toBeHidden();
}

async function save(page: Page, method: 'POST' | 'PUT'): Promise<any> {
  await openTab(page, 'SEO');
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/v1/products') && r.request().method() === method,
  );
  await page.locator('button#product_btn').click();
  const result = await response;
  expect(result.status(), await result.text()).toBe(method === 'POST' ? 201 : 200);
  await page.waitForURL(/\/product(?:[?#]|$)/);
  return result.json();
}

test('create renders every tab, drives the handlers, and saves', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const category = await page.request.post(`${stack.apiOrigin}/api/v1/product-categories`, {
    data: {
      key: `form-category-${runId}`,
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: `form-kategori-${runId}`, name: categoryName },
        { locale: 'en-US', slug: `form-category-${runId}`, name: `Form Category ${runId}` },
      ],
    },
  });
  expect(category.status(), await category.text()).toBe(201);

  await page.goto(`${stack.adminOrigin}/product/create`);
  await expect(page.locator('app-form-product .nav-link')).toHaveCount(TABS.length);
  for (const tab of TABS) await openTab(page, tab);

  // An empty save asks for a category first and opens General.
  await page.locator('button#product_btn').click();
  await expect(
    page.getByText('Pilih minimal satu kategori produk sebelum menyimpan.'),
  ).toBeVisible();
  await expect(page.locator('app-form-product .nav-link.active')).toContainText('Umum');

  // General: identity, category, and the measurement hints.
  await control(page, 'key').fill(`form-product-${runId}`);
  await control(page, 'sku').fill(`FORM-${runId}`.toUpperCase());
  await chooseSelect2(page, 'status', 'Dipublikasikan');
  const categories = panel(page).locator('app-advance-dropdown');
  await categories.locator('.category-breadcrumb-select').click();
  await categories
    .locator('.select-category-box li', { hasText: categoryName })
    .getByRole('link', { name: 'Select' })
    .click();
  await control(page, 'weight_grams').fill('1500');
  await expect(panel(page).getByText('1,5 kg')).toBeVisible();
  await control(page, 'length_mm').fill('250');
  await expect(panel(page).getByText('25 cm')).toBeVisible();

  // Content: both languages, a specification row each, and the writing help.
  await openTab(page, 'Konten & Bahasa');
  await control(page, 'id_slug').fill(`form-produk-${runId}`);
  await control(page, 'id_name').fill(`Produk Form ${runId}`);
  await control(page, 'id_short_description').fill('Ringkasan produk uji form.');
  await panel(page)
    .getByRole('button', { name: /Tambah spesifikasi/i })
    .click();
  await panel(page)
    .getByRole('button', { name: /Tambah spesifikasi/i })
    .click();
  await expect(panel(page).locator('[formcontrolname=label]')).toHaveCount(2);
  await panel(page).locator('.remove-row').nth(1).click();
  await expect(panel(page).locator('[formcontrolname=label]')).toHaveCount(1);
  await panel(page).locator('[formcontrolname=label]').fill('Bahan');
  await panel(page).locator('[formcontrolname=value]').fill('Lateks alam');
  await panel(page).getByRole('button', { name: 'Isi ringkasan otomatis' }).click();
  await expect(
    page.getByText(/Fitur isi otomatis belum aktif|Bantuan penulisan belum berhasil/).first(),
  ).toBeVisible();
  await panel(page)
    .getByRole('button', { name: /EN\s*English/ })
    .click();
  await control(page, 'en_slug').fill(`form-product-${runId}`);
  await control(page, 'en_name').fill(`Form Product ${runId}`);
  await panel(page)
    .getByRole('button', { name: /Add specification|Tambah spesifikasi/i })
    .click();
  await panel(page).locator('[formcontrolname=label]').fill('Material');
  await panel(page).locator('[formcontrolname=value]').fill('Natural latex');

  // Channels: both consumer prices with their preview, and two marketplace links.
  await openTab(page, 'Harga & Kanal');
  const amounts = control(page, 'amount');
  await expect(amounts).toHaveCount(2);
  await amounts.nth(0).fill('150000');
  await expect(panel(page).locator('.price-preview').first()).toContainText('150.000');
  await amounts.nth(1).fill('12');
  await expect(panel(page).locator('.price-preview').nth(1)).toContainText('$12.00');
  await panel(page)
    .getByRole('button', { name: /Tambah kanal/ })
    .click();
  await panel(page)
    .getByRole('button', { name: /Tambah kanal/ })
    .click();
  const cards = panel(page).locator('.marketplace-card');
  await expect(cards).toHaveCount(2);
  const primary = (index: number) => cards.nth(index).locator('[formcontrolname=is_primary]');
  await expect(primary(0)).toBeChecked();
  await expect(primary(1)).not.toBeChecked();
  await primary(1).check();
  await expect(primary(0)).not.toBeChecked();
  await cards.nth(1).getByRole('button', { name: /Hapus/ }).click();
  await expect(cards).toHaveCount(1);
  await expect(primary(0)).toBeChecked();
  await cards.nth(0).locator('[formcontrolname=url]').fill('https://example.invalid/produk-form');

  // Media: a thumbnail through the media modal.
  await openTab(page, 'Media');
  await panel(page).locator('li.choosefile-input').first().click();
  await uploadThroughModal(page);
  await expect(panel(page).locator('.image-select-list img').nth(1)).toBeVisible();

  // SEO: a meta title in each language (the language choice is shared with Content).
  await openTab(page, 'SEO');
  await panel(page)
    .getByRole('button', { name: /ID\s*Bahasa Indonesia/ })
    .click();
  await control(page, 'id_meta_title').fill('Produk Form | MATEX');
  await panel(page)
    .getByRole('button', { name: /EN\s*English/ })
    .click();
  await control(page, 'en_meta_title').fill('Form Product | MATEX');

  const created = await save(page, 'POST');
  productId = created.data.id;
  expect(productId).toBeTruthy();
  expect(errors).toEqual([]);
});

test('edit shows the stored product and saves it unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/product/edit/${productId}`);
  await expect(control(page, 'key')).toHaveValue(`form-product-${runId}`);
  await expect(panel(page).getByText('1,5 kg')).toBeVisible();
  await openTab(page, 'Konten & Bahasa');
  await expect(control(page, 'id_name')).toHaveValue(`Produk Form ${runId}`);
  await expect(panel(page).locator('[formcontrolname=value]')).toHaveValue('Lateks alam');
  await openTab(page, 'Harga & Kanal');
  await expect(control(page, 'amount')).toHaveCount(2);
  await expect(panel(page).locator('.marketplace-card')).toHaveCount(1);
  await openTab(page, 'Media');
  await expect(panel(page).locator('.image-select-list img').nth(1)).toBeVisible();

  await save(page, 'PUT');
  await saveRecording('product-form', [
    'product_catalog',
    'product_catalog_i18n',
    'product_catalog_category',
    'product_catalog_attachment',
    'product_catalog_price',
    'product_catalog_marketplace',
  ]);
  expect(errors).toEqual([]);
});
