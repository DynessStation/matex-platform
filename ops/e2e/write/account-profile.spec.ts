import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  admin,
  adminReferences,
  createAccessProfile,
  createAdminAccount,
  login as apiLogin,
  runId,
  runNumber,
} from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for "Profil saya" (frontend/admin/src/app/components/account, U-16): an
// admin with no admin-account or media permissions changes their own name, backup phone,
// photo, and password; login identities and office are shown only.
test.describe.configure({ mode: 'serial' });

const sample = path.join(path.dirname(stack.stateFile), 'write', 'fixtures', 'sample.png');
let account: { id: string; identity: string; password: string };
const newPassword = `Halaman-${runId}-5`;

// Retries the form: on a busy machine hydration can clear a field typed too early.
async function login(page: Page, identity: string, password: string): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(identity);
    await page.locator('#password').fill(password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

test.beforeAll(async () => {
  const owner = await apiLogin(admin.identity, admin.password);
  const idAccess = await createAccessProfile(owner, 'Halaman profil', ['dashboard.view']);
  account = await createAdminAccount(
    owner,
    'ProfilUi',
    await adminReferences(owner, { id_access: idAccess }),
  );
  await owner.dispose();
});

test('name, backup phone, and photo are saved by the admin', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, account.identity, account.password);

  // Reached from the header menu.
  await page.goto(`${stack.adminOrigin}/account`);
  await expect(page.locator('.title-header h5')).toHaveText('Profil Saya');
  const facts = page.locator('.profile-facts');
  await expect(facts).toContainText(account.identity);
  await expect(page.locator('.profile-avatar span')).toBeVisible();

  // An invalid phone is caught before any request.
  let saves = 0;
  page.on('request', (r) => {
    if (r.method() === 'PUT' && new URL(r.url()).pathname === '/api/v1/admin-acct/me') saves++;
  });
  const name = page.locator('#profile_name');
  await name.fill('Nama Halaman Baru');
  await page.locator('#profile_phone_2').fill('08123');
  await page.locator('#profile_save_btn').click();
  await expect(page.locator('.profile-panel', { hasText: 'Data diri' })).toContainText(
    'format internasional',
  );
  expect(saves).toBe(0);

  // Saved: the header shows the new name, and it stays after a reload.
  const phone = `+6287${String(runNumber).padStart(7, '0')}2`;
  await page.locator('#profile_phone_2').fill(phone);
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && new URL(r.url()).pathname === '/api/v1/admin-acct/me',
  );
  await page.locator('#profile_save_btn').click();
  expect((await saved).status()).toBe(200);
  await expect(page.locator('#toast-container')).toContainText('Data diri berhasil disimpan');
  await expect(page.locator('app-profile')).toContainText('Nama Halaman Baru');
  await page.reload();
  await expect(name).toHaveValue('Nama Halaman Baru');
  await expect(page.locator('#profile_phone_2')).toHaveValue(phone);

  // Photo: uploaded without media permissions, previewed, then removed.
  const uploaded = page.waitForResponse((r) => r.url().includes('/api/v1/admin-acct/me/photo'));
  await page.locator('.profile-photo-actions input[type=file]').setInputFiles(sample);
  expect((await uploaded).status()).toBe(200);
  const avatar = page.locator('.profile-avatar img');
  await expect(avatar).toHaveAttribute('src', /admin-profile/);
  await expect(page.locator('app-profile img')).toHaveAttribute('src', /admin-profile/);
  await page.locator('.profile-avatar').hover();
  await page.locator('.profile-avatar .image-preview-button').click();
  await expect(page.locator('app-lightbox .lightbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#profile_photo_remove_btn').click();
  await expect(page.locator('.profile-avatar span')).toBeVisible();

  expect(errors).toEqual([]);
});

test('the password change checks the form, keeps this session, and works at login', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, account.identity, account.password);
  await page.goto(`${stack.adminOrigin}/account`);
  const panel = page.locator('.profile-panel', { hasText: 'Ganti kata sandi' }).last();

  // The form checks the rule and the repeat before asking the server.
  await page.locator('#profile_current_password').fill(account.password);
  await page.locator('#profile_password').fill('onlyletters');
  await page.locator('#profile_password_confirmation').fill('different-1');
  await page.locator('#profile_password_btn').click();
  await expect(panel.locator('.text-danger')).toHaveCount(2);

  // The eye button shows what was typed.
  await panel.locator('.profile-password button').first().click();
  await expect(page.locator('#profile_current_password')).toHaveAttribute('type', 'text');

  // A wrong current password is refused by the server.
  await page.locator('#profile_current_password').fill(`${account.password}x`);
  await page.locator('#profile_password').fill(newPassword);
  await page.locator('#profile_password_confirmation').fill(newPassword);
  await page.locator('#profile_password_btn').click();
  await expect(page.locator('#toast-container')).toContainText('Kata sandi saat ini salah');

  // The right one changes it; this session stays signed in.
  await page.locator('#profile_current_password').fill(account.password);
  await page.locator('#profile_password_btn').click();
  await expect(page.locator('#toast-container')).toContainText('Perangkat lain sudah dikeluarkan');
  await expect(page.locator('#profile_current_password')).toHaveValue('');
  await page.reload();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.locator('.title-header h5')).toHaveText('Profil Saya');

  // A fresh sign-in needs the new password.
  await page.context().clearCookies();
  await login(page, account.identity, newPassword);

  expect(errors).toEqual([]);
});
