import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { admin } from './api-contract';
import { repoRoot, stack } from './stack.mjs';

// Browser contract for the running version (v1.1.10 closes the intro, audit, and tidy-up):
// the admin footer shows the version from shared/data/app-version.ts and links to /changelog,
// which opens without signing in (its link is shared with the team) and lists the versions.
const version = /APP_VERSION = '([^']+)'/.exec(
  fs.readFileSync(path.join(repoRoot, 'frontend/admin/src/app/shared/data/app-version.ts'), 'utf8'),
)![1];

async function login(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

test('the changelog opens without signing in, on desktop and phone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of [
    { width: 1366, height: 800 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    const response = await page.goto(`${stack.adminOrigin}/changelog`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/changelog$/);
    // Non-production builds prefix the tab title with [DEV].
    await expect(page).toHaveTitle(
      new RegExp(`Catatan Perubahan MATEX v${version.replace(/\./g, '\\.')}$`),
    );
    await expect(page.locator('h1')).toHaveText('Catatan Perubahan');
    await expect(page.locator('.changelog-page__current')).toContainText(`v${version}`);
    await expect(page.locator('.changelog-entry').first().locator('h2')).toHaveText(
      `Versi ${version}`,
    );
    await expect(page.locator('.changelog-entry h3').first()).toBeVisible();
    // One column that fits the phone: no sideways scrolling.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.width}px`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test('the admin footer shows the running version and opens its changelog', async ({ page }) => {
  await login(page);
  const link = page.locator('app-footer .footer-version');
  await expect(link).toHaveText(`v${version}`);
  await link.click();
  await expect(page).toHaveURL(/\/changelog$/);
  await expect(page.locator('.changelog-page__current')).toContainText(`v${version}`);
});
