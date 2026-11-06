import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Locator, type Page } from '@playwright/test';

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

/** Adds a table row, fills its inputs, and closes it. */
async function addRow(
  table: Locator,
  values: Record<string, string>,
  more?: (row: Locator) => Promise<void>,
): Promise<void> {
  await table.getByTestId('inline-add').click();
  const row = table.locator('.inline-table-editing');
  for (const [key, value] of Object.entries(values)) {
    await row.locator(`[data-column="${key}"] input`).fill(value);
  }
  if (more) await more(row);
  await row.getByTestId('inline-save').click();
  await expect(table.locator('.inline-table-editing')).toHaveCount(0);
}

async function chooseInRow(page: Page, row: Locator, column: string, label: string): Promise<void> {
  await row.locator(`[data-column="${column}"] .inline-table-toggle`).click();
  await page.locator('.inline-table-menu.show .dropdown-item', { hasText: label }).first().click();
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
  await panel(page).locator('#id_title').pressSequentially(`Produk Form ${runId}`);
  await expect(panel(page).locator('#id_slug')).toHaveValue(`produk-form-${runId}`);
  await expect(page.getByTestId('form-heading')).toHaveText(`Produk Form ${runId}`);
  await control(page, 'id_short_description').fill('Ringkasan produk uji form.');
  const idSpecs = panel(page).getByTestId('specs-id');
  await addRow(idSpecs, { label: 'Bahan', value: 'Lateks alam' });
  await addRow(idSpecs, { label: 'Dihapus', value: 'x' });
  await expect(idSpecs.getByTestId('inline-row')).toHaveCount(2);
  await idSpecs.getByTestId('inline-row').nth(1).getByTestId('inline-edit').click();
  await idSpecs.locator('.inline-table-editing').getByTestId('inline-remove').click();
  await expect(idSpecs.getByTestId('inline-row')).toHaveCount(1);
  await panel(page).getByRole('button', { name: 'Isi ringkasan otomatis' }).click();
  await expect(
    page.getByText(/Fitur isi otomatis belum aktif|Bantuan penulisan belum berhasil/).first(),
  ).toBeVisible();
  await panel(page)
    .getByRole('button', { name: /EN\s*English/ })
    .click();
  await panel(page).locator('#en_title').pressSequentially(`Form Product ${runId}`);
  await addRow(panel(page).getByTestId('specs-en'), { label: 'Material', value: 'Natural latex' });

  // Channels: a price per currency with its format, and two marketplace links with one main.
  await openTab(page, 'Harga & Kanal');
  const idr = panel(page).getByTestId('prices-idr');
  await addRow(idr, { label: 'Harga konsumen', amount: '150000' });
  await expect(idr.locator('[data-column="amount"]')).toContainText('150.000');
  const usd = panel(page).getByTestId('prices-usd');
  await addRow(usd, { label: 'Consumer price', amount: '12' });
  await expect(usd.locator('[data-column="amount"]')).toContainText('$12.00');
  const links = panel(page).getByTestId('marketplaces');
  await addRow(links, { url: 'https://example.invalid/produk-form' }, async (row) => {
    await chooseInRow(page, row, 'rank', 'Utama');
  });
  await addRow(links, { url: 'https://example.invalid/kedua' }, async (row) => {
    await chooseInRow(page, row, 'provider', 'Tokopedia');
    await chooseInRow(page, row, 'rank', 'Utama');
  });
  const rows = links.getByTestId('inline-row');
  await expect(rows.nth(0).locator('[data-column="rank"]')).toHaveText('Biasa');
  await expect(rows.nth(1).locator('[data-column="rank"]')).toHaveText('Utama');
  await rows.nth(1).getByTestId('inline-edit').click();
  await links.locator('.inline-table-editing').getByTestId('inline-remove').click();
  await expect(rows).toHaveCount(1);

  // A row left open holds the save back.
  await idr.getByTestId('inline-add').click();
  await page.locator('button#product_btn').click();
  await expect(
    page.getByText('Masih ada baris yang terbuka', { exact: false }).first(),
  ).toBeVisible();
  await idr.getByTestId('inline-remove').click();

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
  await expect(panel(page).getByText('1,5 kg')).toBeVisible();
  await openTab(page, 'Konten & Bahasa');
  await expect(panel(page).locator('#id_title')).toHaveValue(`Produk Form ${runId}`);
  await expect(panel(page).getByTestId('internal-key')).toContainText(`produk-form-${runId}`);
  await expect(panel(page).getByTestId('specs-id').locator('[data-column="value"]')).toHaveText(
    'Lateks alam',
  );
  await openTab(page, 'Harga & Kanal');
  await expect(panel(page).getByTestId('prices-idr').getByTestId('inline-row')).toHaveCount(1);
  await expect(panel(page).getByTestId('prices-usd').getByTestId('inline-row')).toHaveCount(1);
  await expect(panel(page).getByTestId('marketplaces').getByTestId('inline-row')).toHaveCount(1);
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
