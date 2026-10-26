import { expect, test, type Page } from '@playwright/test';

import { admin, login as apiLogin } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the header navigation page (frontend/admin/src/app/components/menu,
// U-9): the header ("primary") is always shown, so the page has no switch-off button and the
// API refuses one; the old /menu/edit/:id route is gone.
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

test('the header is always shown: no switch-off button, and the API refuses one', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/menu`);

  await expect(page.locator('.title-header .badge, app-page-wrapper .badge').first()).toHaveText(
    'Tampil',
  );
  await expect(page.locator('app-menu-tree')).toBeVisible();
  await expect(page.locator('#toggle_navigation_status')).toHaveCount(0);
  await expect(page.locator('#activate_navigation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Nonaktifkan/ })).toHaveCount(0);

  const owner = await apiLogin(admin.identity, admin.password);
  try {
    const list = await (await owner.get('/api/v1/web-navigation')).json();
    const primary = list.data.navigations.find((item: any) => item.key === 'primary');
    const refused = await owner.patch(
      `/api/v1/web-navigation/${primary.id_web_navigation}/status`,
      { data: { web_navigation_status: 0 } },
    );
    expect(refused.status()).toBe(409);
    expect((await refused.json()).code).toBe('WEB_NAVIGATION_PRIMARY_PROTECTED');
  } finally {
    await owner.dispose();
  }

  // The unused edit route now ends at "page not found" instead of a second copy of the page.
  await page.goto(`${stack.adminOrigin}/menu/edit/anything`);
  await expect(page.locator('app-menu-tree')).toHaveCount(0);
  expect(errors).toEqual([]);
});
