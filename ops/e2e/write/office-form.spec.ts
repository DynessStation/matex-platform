import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId, saveRecording, uploadSample } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the office form (frontend/admin/src/app/components/office/form-office):
// every tab renders in create and edit mode, the tab handlers work (validation, operating
// hours, media, publication, attendance), a new office is created, and saving offices
// unchanged is recorded (MATEX_E2E_RECORD, see api-contract.ts) so the stored rows can be
// compared before and after a refactor. Guards the split of this form into one component
// per tab (6C).
test.describe.configure({ mode: 'serial' });

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'sample.png');

const TABS = ['Umum', 'Lokasi', 'Kontak', 'Jam Operasional', 'Media', 'Publikasi'];

const code = `UF-${runId}`.toUpperCase();

let createdId = '';
let locatedId = '';

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

function form(page: Page) {
  return page.locator('app-form-office form');
}

function panel(page: Page) {
  return form(page).locator('.office-tab-content .tab-pane.active');
}

async function openTab(page: Page, name: string): Promise<void> {
  await form(page).locator('.office-nav .nav-link', { hasText: name }).first().click();
  await expect(form(page).locator('.office-nav .nav-link.active')).toHaveText(name);
}

async function submit(page: Page, method: 'POST' | 'PUT'): Promise<any> {
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/v1/office') && r.request().method() === method,
  );
  await page.locator('#office_submit_btn').click();
  const result = await response;
  expect(result.status()).toBe(method === 'POST' ? 201 : 200);
  await page.waitForURL(/\/office(?:[?#]|$)/);
  return result.json();
}

/** Clicks submit and expects the form to stay open with this message. */
async function expectRejected(page: Page, message: string, tab: string): Promise<void> {
  await page.locator('#office_submit_btn').click();
  await expect(page.getByText(message).first()).toBeVisible();
  await expect(form(page).locator('.office-nav .nav-link.active')).toHaveText(tab);
}

test('create renders every tab, drives the handlers, and saves', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/office/create`);
  await expect(form(page).locator('.office-nav .nav-link')).toHaveCount(TABS.length);
  for (const tab of TABS) await openTab(page, tab);

  // General: an empty form goes back to General with the required messages.
  await expectRejected(page, 'Periksa kembali kolom yang ditandai.', 'Umum');
  await expect(panel(page).locator('.form-error')).toHaveCount(2);
  const officeCode = panel(page).locator('[formcontrolname=office_code]');
  await officeCode.fill('kode salah!');
  await expect(panel(page).locator('.form-error')).toHaveCount(2);
  await officeCode.fill(code.toLowerCase());
  await panel(page).locator('[formcontrolname=office_name]').fill('Kantor Uji Form');
  await panel(page).locator('[formcontrolname=office_description]').fill('Kantor dari test form');
  await expect(panel(page).locator('.form-error')).toHaveCount(0);

  // Contact: an invalid email sends the submit to Contact.
  await openTab(page, 'Kontak');
  const email = panel(page).locator('[formcontrolname=email]');
  await email.fill('bukan-email');
  await expectRejected(page, 'Periksa kembali kolom yang ditandai.', 'Kontak');
  await expect(panel(page).locator('.form-error')).toHaveCount(1);
  await email.fill('kantor.form@example.invalid');
  await panel(page).locator('[formcontrolname=phone]').fill('+62221111222');
  await panel(page).locator('[formcontrolname=website_url]').fill('https://example.invalid/form');

  // Location: attendance needs coordinates, which only the map picker sets.
  await openTab(page, 'Lokasi');
  await panel(page).locator('label.office-switch-label').first().click();
  const radius = panel(page).locator('[formcontrolname=attendance_radius_meter]');
  await expect(radius).toBeVisible();
  await radius.fill('1500');
  await expect(radius).toHaveValue('1.500');
  await expectRejected(page, 'Lokasi kantor wajib diisi', 'Lokasi');
  await panel(page).locator('label.office-switch-label').first().click();
  await expect(radius).toHaveCount(0);

  // Hours: open Monday, add an empty range, and get the incomplete message.
  await openTab(page, 'Jam Operasional');
  const monday = panel(page).locator('.operating-day').first();
  await expect(panel(page).locator('.operating-day')).toHaveCount(7);
  await monday.locator('.switch-state').click();
  await expect(monday.locator('ngb-timepicker')).toHaveCount(2);
  await expect(monday.locator('.office-switch-label')).toHaveText('Buka');
  await monday.locator('.operating-range-add').click();
  await expect(monday.locator('.operating-range')).toHaveCount(2);
  await expectRejected(page, 'belum lengkap', 'Jam Operasional');
  await expect(panel(page).locator('.alert-danger')).toBeVisible();
  await monday.locator('.operating-range-delete').nth(1).click();
  await expect(monday.locator('.operating-range')).toHaveCount(1);
  // Saturday: open, then remove its only range, which closes it again.
  const saturday = panel(page).locator('.operating-day').nth(5);
  await saturday.locator('.switch-state').click();
  await saturday.locator('.operating-range-delete').click();
  await expect(saturday.locator('.office-switch-label')).toHaveText('Tutup');

  // Media: upload two images, then caption, reorder, cover, public, and remove.
  await openTab(page, 'Media');
  await expect(panel(page).locator('.office-media-empty')).toBeVisible();
  for (let round = 0; round < 2; round++) {
    await panel(page).locator('button', { hasText: 'Pilih Media' }).click();
    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();
    const uploadTab = modal.locator('.nav-link', { hasText: /Unggah|Upload/ });
    if (await uploadTab.count()) await uploadTab.first().click();
    await modal.locator('input[type=file]').setInputFiles(fixture);
    await modal.locator('#media_upload_btn').click();
    const card = modal.locator('.library-box label').first();
    await expect(card).toBeVisible();
    await card.click();
    await modal.getByRole('button', { name: /Pilih Media|Insert Media/ }).click();
    await expect(modal).toBeHidden();
  }
  const items = panel(page).locator('.office-media-item');
  await expect(items).toHaveCount(2);
  await expect(items.first().locator('.badge')).toHaveText('Sampul');
  await items.nth(1).locator('input.form-control').fill('Ruang tunggu');
  await items.nth(1).locator('.ri-arrow-up-line').click();
  await expect(items.first().locator('input.form-control')).toHaveValue('Ruang tunggu');
  await items.first().locator('button', { hasText: 'Jadikan Sampul' }).click();
  await expect(items.first().locator('.badge')).toHaveText('Sampul');
  await expect(items.nth(1).locator('.badge')).toHaveCount(0);
  await items.nth(1).locator('.switch-state').click();
  await expect(items.nth(1).locator('input[type=checkbox]')).not.toBeChecked();
  await items.nth(1).locator('.office-media-delete').click();
  await expect(items).toHaveCount(1);

  // Publication: the slug and sort order show only for a public office.
  await openTab(page, 'Publikasi');
  await expect(panel(page).locator('[formcontrolname=public_slug]')).toHaveCount(0);
  await panel(page).locator('label.office-switch-label').first().click();
  await panel(page).locator('[formcontrolname=public_slug]').fill(`kantor-form-${runId}`);
  const sortOrder = panel(page).locator('[formcontrolname=public_sort_order]');
  await sortOrder.fill('12345');
  await expect(sortOrder).toHaveValue('12.345');
  await sortOrder.fill('4');

  const created = await submit(page, 'POST');
  createdId = created.data.id_office;
  expect(createdId).toBeTruthy();
  expect(errors).toEqual([]);
});

test('edit shows a located office and saves it unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const owner = await apiLogin(admin.identity, admin.password);
  const cover = await uploadSample(owner, 'office_media');
  const located = await owner.post('/api/v1/office', {
    data: {
      office_code: `${code}-L`,
      office_name: 'Kantor Uji Lokasi',
      address: 'Jl. Uji No. 2',
      city: 'Bandung',
      province: 'Jawa Barat',
      postal_code: '40111',
      lat: -6.9175,
      lng: 107.6191,
      attendance_enabled: 1,
      attendance_radius_meter: 1250,
      is_public: 0,
      google_maps_url: 'https://maps.example.invalid/lokasi',
      operating_hours: [
        { day_of_week: 1, sequence: 1, open_time: '08:00', close_time: '12:00' },
        { day_of_week: 1, sequence: 2, open_time: '13:00', close_time: '17:00' },
      ],
      attachments: [{ id_attachment: cover, attachment_role: 'cover', caption: 'Depan' }],
    },
  });
  expect(located.status()).toBe(201);
  locatedId = (await located.json()).data.id_office;
  await owner.dispose();

  await login(page);
  await page.goto(`${stack.adminOrigin}/office/edit/${locatedId}`);
  await expect(panel(page).locator('[formcontrolname=office_name]')).toHaveValue(
    'Kantor Uji Lokasi',
  );
  await openTab(page, 'Lokasi');
  await expect(panel(page).locator('[formcontrolname=city]')).toHaveValue('Bandung');
  await expect(panel(page).locator('input[readonly]').nth(4)).toHaveValue('-6.9175');
  await expect(panel(page).locator('input[readonly]').nth(5)).toHaveValue('107.6191');
  await expect(panel(page).locator('[formcontrolname=attendance_radius_meter]')).toHaveValue(
    '1.250',
  );
  await openTab(page, 'Jam Operasional');
  await expect(
    panel(page).locator('.operating-day').first().locator('.operating-range'),
  ).toHaveCount(2);
  await openTab(page, 'Media');
  await expect(panel(page).locator('.office-media-item')).toHaveCount(1);
  await expect(panel(page).locator('.office-media-item input.form-control')).toHaveValue('Depan');
  await openTab(page, 'Publikasi');
  await expect(panel(page).locator('[formcontrolname=google_maps_url]')).toHaveValue(
    'https://maps.example.invalid/lokasi',
  );

  // A zero radius is rejected before saving.
  await openTab(page, 'Lokasi');
  const radius = panel(page).locator('[formcontrolname=attendance_radius_meter]');
  await radius.fill('0');
  await expectRejected(page, 'Radius absensi harus lebih besar dari nol.', 'Lokasi');
  await radius.fill('1250');

  await submit(page, 'PUT');
  expect(errors).toEqual([]);
});

test('edit saves the form-created office unchanged', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/office/edit/${createdId}`);
  await expect(panel(page).locator('[formcontrolname=office_code]')).toHaveValue(code);
  await openTab(page, 'Publikasi');
  await expect(panel(page).locator('[formcontrolname=public_sort_order]')).toHaveValue('4');
  await submit(page, 'PUT');
  await saveRecording('office-form', ['office', 'office_operating_hour', 'office_attachment']);
});
