import { expect, test, type Page } from '@playwright/test';

import { admin } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the refresh button with a pause (frontend/admin/src/app/shared/
// components/ui/refresh-button, U-6): pressing it reloads the page data, then the
// button counts down, disabled, for 2 minutes on Dasbor and 5 minutes on Analitik
// Publik and SEO; the pause survives leaving the page and ends on time.
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

/** Counts GET requests to an API path from now on. */
function countRequests(page: Page, path: string): { count: number } {
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === path) {
      counter.count++;
    }
  });
  return counter;
}

for (const [route, api, minutes] of [
  ['/dashboard', '/api/v1/analytics/overview', 2],
  ['/public-analytics', '/api/v1/analytics/overview', 5],
  ['/seo-console', '/api/v1/seo-console/overview', 5],
] as const) {
  test(`${route}: refresh reloads, then pauses ${minutes} minutes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await login(page);
    await page.goto(`${stack.adminOrigin}${route}`);
    const button = page.locator('app-refresh-button button');
    await expect(button).toBeEnabled();
    await expect(button).toHaveText(/Perbarui/);

    // Pressing it asks for the data again, then counts down from the full pause.
    const requests = countRequests(page, api);
    await button.click();
    await expect.poll(() => requests.count).toBe(1);
    await expect(button).toBeDisabled();
    await expect(button).toHaveClass(/is-paused/);
    const countdown = (await button.innerText()).trim();
    expect(countdown).toMatch(/^\d:\d\d$/);
    const [m, s] = countdown.split(':').map(Number);
    expect(m * 60 + s).toBeGreaterThan(minutes * 60 - 15);
    expect(m * 60 + s).toBeLessThanOrEqual(minutes * 60);
    await expect(button).toHaveAttribute('aria-label', /Bisa diperbarui lagi dalam \d:\d\d/);

    // A forced click while paused sends nothing.
    await button.click({ force: true });
    await page.waitForTimeout(500);
    expect(requests.count).toBe(1);

    // Leaving and coming back keeps the pause.
    await page.goto(`${stack.adminOrigin}/faq`);
    await page.goto(`${stack.adminOrigin}${route}`);
    await expect(button).toHaveClass(/is-paused/);

    // When the pause ends the button is usable again (the pause is shortened here).
    const key = route.slice(1);
    await page.evaluate((name) => {
      const pauses = JSON.parse(localStorage.getItem('matex-admin-refresh-pause') ?? '{}');
      pauses[name] = Date.now() + 2000;
      localStorage.setItem('matex-admin-refresh-pause', JSON.stringify(pauses));
    }, key);
    await page.reload();
    await expect(button).toHaveText(/0:0\d/);
    await expect(button).toBeEnabled({ timeout: 6000 });
    await expect(button).toHaveText(/Perbarui/);

    expect(errors).toEqual([]);
  });
}

test('changing the range does not start the pause', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/dashboard`);
  await page.evaluate(() => localStorage.removeItem('matex-admin-refresh-pause'));
  await page.reload();
  await page.locator('.range-button', { hasText: '7 hari' }).click();
  await expect(page.locator('.range-button.active')).toHaveText(/7 hari/);
  await expect(page.locator('app-refresh-button button')).toBeEnabled();
  await expect(page.locator('app-refresh-button button')).not.toHaveClass(/is-paused/);
});
