import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { admin, runId, runNumber, saveRecording } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the admin account form
// (frontend/admin/src/app/components/admin-account/form-admin-account): every section renders
// in create and edit mode, the field handlers (sanitize, dependent fields, lookups, password
// strength, profile photo) work, a new account is created, and saving it unchanged is recorded
// (MATEX_E2E_RECORD, see api-contract.ts) so the stored row can be compared before and after
// a refactor. Guards the split of this form into one component per section (6C).
test.describe.configure({ mode: 'serial' });

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'sample.png');

const account = {
  alias: `Form${runId}`,
  email: `form.${runId}@example.invalid`,
  phone: `819${String(runNumber).padStart(7, '0')}`,
  password: `Form-${runId}-Uji9`,
};

const SECTION_LABELS = [
  'Foto Profil',
  'Nama',
  'Alias',
  'Email Utama',
  'Email Kedua',
  'Telepon Utama',
  'Telepon Kedua',
  'Perusahaan',
  'Kantor',
  'Jabatan / Posisi',
  'Profil Akses',
  'Akses Sistem Penuh',
];

let createdId = '';

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

function form(page: Page) {
  return page.locator('app-form-admin-account form');
}

function control(page: Page, name: string) {
  return form(page).locator(`[formcontrolname=${name}]`);
}

async function expectLabels(page: Page, labels: string[]): Promise<void> {
  for (const label of labels) {
    await expect(form(page).locator('label', { hasText: label }).first()).toBeVisible();
  }
}

/** Opens a lookup select and picks the option with this text (or the first one). */
async function chooseLookup(page: Page, name: string, option?: string): Promise<string> {
  await control(page, name).locator('.select2-selection').click();
  const options = control(page, name).locator('.select2-results__option:not(.loading-results)');
  const choice = option ? options.filter({ hasText: option }).first() : options.first();
  await expect(choice).toBeVisible();
  // textContent: the option list may restyle the text (innerText follows text-transform).
  const label = ((await choice.textContent()) ?? '').trim();
  await choice.click();
  await expect(control(page, name).locator('.select2-selection__rendered')).toHaveAttribute(
    'title',
    label,
  );
  return label;
}

async function submit(page: Page, method: 'POST' | 'PUT'): Promise<any> {
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/v1/admin-acct') && r.request().method() === method,
  );
  await page.locator('#admin_account_submit_btn').click();
  const result = await response;
  expect(result.status()).toBe(method === 'POST' ? 201 : 200);
  await page.waitForURL(/\/admin-account(?:[?#]|$)/);
  return result.json();
}

test('create renders every section, drives the handlers, and saves', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/admin-account/create`);
  await expectLabels(page, [...SECTION_LABELS, 'Kata Sandi', 'Konfirmasi Kata Sandi']);

  // Placement fields wait for a company.
  for (const name of ['id_office', 'id_chair', 'id_access']) {
    await expect(control(page, name).locator('.select2-container').first()).toHaveClass(
      /select2-container--disabled/,
    );
  }
  await expect(form(page).getByText('Pilih perusahaan terlebih dahulu.')).toHaveCount(3);

  // Name drops digits and symbols, then title-cases on blur.
  const name = form(page).locator('#name');
  await name.fill('budi  santoso 123#');
  await expect(name).toHaveValue('budi  santoso ');
  await name.blur();
  await expect(name).toHaveValue('Budi Santoso');

  // Alias keeps letters and digits only.
  const alias = form(page).locator('#alias');
  await alias.fill(`${account.alias} #`);
  await expect(alias).toHaveValue(account.alias);

  // The secondary email and phone open once the primary ones are valid.
  await expect(form(page).locator('#email_2')).toBeDisabled();
  await form(page).locator('#email_1').fill(account.email);
  await expect(form(page).locator('#email_2')).toBeEnabled();
  await expect(form(page).locator('#phone_2')).toBeDisabled();
  await form(page).locator('#phone_1').fill(`0${account.phone}`);
  await expect(form(page).locator('#phone_1')).toHaveValue(account.phone);
  await expect(form(page).locator('#phone_2')).toBeEnabled();
  await form(page).locator('#phone_2').fill('00x');
  await expect(form(page).locator('#phone_2')).toHaveValue('');

  // Lookups: company first, then the dependent selects.
  await chooseLookup(page, 'id_master_comp', 'MATEX E2E');
  await expect(form(page).getByText('Pilih perusahaan terlebih dahulu.')).toHaveCount(0);
  for (const field of ['id_office', 'id_chair', 'id_access']) {
    await chooseLookup(page, field);
  }

  // Full access switch.
  const allAccess = form(page).locator('.all-access-card');
  await form(page).locator('label.switch').click();
  await expect(allAccess).toHaveClass(/active/);
  await form(page).locator('label.switch').click();
  await expect(allAccess).not.toHaveClass(/active/);

  // Password strength, visibility toggles, and the mismatch message.
  const password = form(page).locator('#password');
  await password.fill('abcdefgh');
  await expect(form(page).locator('.password-strength')).toHaveAttribute('data-strength', 'weak');
  await password.fill(account.password);
  await expect(form(page).locator('.password-strength')).toHaveAttribute('data-strength', 'strong');
  await expect(password).toHaveAttribute('type', 'password');
  await form(page).locator('.password-toggle').first().click();
  await expect(password).toHaveAttribute('type', 'text');
  const confirm = form(page).locator('#confirm_password');
  await confirm.fill('different');
  await confirm.blur();
  await expect(form(page).getByText('Konfirmasi kata sandi tidak cocok.')).toBeVisible();
  await form(page).locator('.password-toggle').nth(1).click();
  await expect(confirm).toHaveAttribute('type', 'text');
  await confirm.fill(account.password);

  // Profile photo through the media modal.
  await form(page).locator('li.choosefile-input').first().click();
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
  await expect(form(page).locator('.image-select-list img').nth(1)).toBeVisible();

  const created = await submit(page, 'POST');
  createdId = created.data.id_admin_acct;
  expect(createdId).toBeTruthy();
  expect(errors).toEqual([]);
});

test('edit shows the stored account and saves it unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/admin-account/edit/${createdId}`);
  await expectLabels(page, SECTION_LABELS);
  await expect(form(page).locator('#password')).toHaveCount(0);

  await expect(form(page).locator('#name')).toHaveValue('Budi Santoso');
  await expect(form(page).locator('#alias')).toHaveValue(account.alias);
  await expect(form(page).locator('#email_1')).toHaveValue(account.email);
  await expect(form(page).locator('#phone_1')).toHaveValue(account.phone);
  await expect(form(page).locator('#email_2')).toBeEnabled();
  await expect(
    control(page, 'id_master_comp').locator('.select2-selection__rendered'),
  ).toContainText('MATEX E2E');
  for (const name of ['id_office', 'id_chair', 'id_access']) {
    await expect(control(page, name).locator('.select2-selection__rendered')).not.toHaveText('');
  }
  await expect(form(page).locator('.image-select-list img').nth(1)).toBeVisible();

  await submit(page, 'PUT');
  await saveRecording('admin-account-form', ['admin_acct']);
  expect(errors).toEqual([]);
});

test('edit saves a changed name and secondary phone', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/admin-account/edit/${createdId}`);
  await expect(form(page).locator('#name')).toHaveValue('Budi Santoso');
  await form(page).locator('#name').fill('budi santoso putra');
  await form(page).locator('#name').blur();
  await form(page).locator('#phone_2').fill('8111222333');
  // Re-choosing the same company loads the lookup without clearing the stored office.
  const office = control(page, 'id_office').locator('.select2-selection__rendered');
  const stored = await office.getAttribute('title');
  expect(stored).toBeTruthy();
  await chooseLookup(page, 'id_master_comp', 'MATEX E2E');
  await expect(office).toHaveAttribute('title', stored!);
  await submit(page, 'PUT');

  const detail = await page.request.get(`${stack.apiOrigin}/api/v1/admin-acct/${createdId}`);
  const data = (await detail.json()).data;
  expect(data).toMatchObject({ name: 'Budi Santoso Putra', phone_2: '+628111222333' });
});
