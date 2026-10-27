import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  admin,
  adminReferences,
  createAccessProfile,
  createAdminAccount,
  login as apiLogin,
} from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the dashboard (frontend/admin/src/app/components/dashboard): every
// account lands on it after login, but its figures need dashboard.view. Without that right the
// page shows a note and asks no API it may not use (it used to get a 403 from analytics).
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;

async function login(page: Page, identity = admin.identity, password = admin.password) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(identity);
    await page.locator('#password').fill(password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
});

test.afterAll(async () => {
  await owner.dispose();
});

test('without dashboard.view the dashboard shows a note and no 403', async ({ page }) => {
  const access = await createAccessProfile(owner, 'Tanpa Dasbor', ['product.view']);
  const account = await createAdminAccount(
    owner,
    'Dasbortanpa',
    await adminReferences(owner, { id_access: access }),
  );
  const denied: string[] = [];
  page.on('response', (response) => {
    if (response.status() === 403) denied.push(response.url());
  });
  await login(page, account.identity, account.password);
  await expect(page.locator('#dashboard_no_access')).toBeVisible();
  await expect(page.locator('.range-button')).toHaveCount(0);
  await expect(page.locator('.metric-grid')).toHaveCount(0);
  // Give late requests (the old auto refresh) a moment.
  await page.waitForTimeout(1500);
  expect(denied).toEqual([]);
});

test('with dashboard.view the figures load', async ({ page }) => {
  const analytics = page.waitForResponse((r) => r.url().includes('/api/v1/analytics/overview'));
  await login(page);
  expect((await analytics).status()).toBe(200);
  await expect(page.locator('#dashboard_no_access')).toHaveCount(0);
  await expect(page.locator('.range-button')).toHaveCount(3);
});
