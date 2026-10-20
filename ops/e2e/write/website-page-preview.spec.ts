import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { admin } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the website page preview
// (frontend/admin/src/app/components/website-page/website-page-preview): the Preview tab of
// terms, home, and about renders its iframe document in both languages and every viewport.
// With MATEX_E2E_RECORD=<folder>, each preview document is written to that folder, so the
// generated HTML can be compared byte for byte before and after a refactor (6C).
test.describe.configure({ mode: 'serial' });

const recordDir = process.env.MATEX_E2E_RECORD;

// What each page's preview document shows first.
const EXPECTED: Record<string, string> = {
  terms: 'header.header h1',
  home: '.gadget-grid',
  about: '.about-heading h1',
};

const VIEWPORTS: Array<[string, string]> = [
  ['Desktop', '1200px'],
  ['Tablet', '768px'],
  ['Mobile', '390px'],
  ['Sesuaikan', '100%'],
];

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

async function openPreview(page: Page, key: string): Promise<void> {
  await page.goto(`${stack.adminOrigin}/website-page/${key}`);
  await expect(page.locator('.vertical-tabs .nav-link')).toHaveCount(6);
  await page.locator('.vertical-tabs .nav-link', { hasText: 'Pratinjau' }).first().click();
  await expect(page.locator('app-website-page-preview .cms-preview-frame')).toBeVisible();
}

/** The raw document behind the preview iframe (a blob URL owned by the admin page). */
async function previewDocument(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const frame = document.querySelector<HTMLIFrameElement>(
      'app-website-page-preview .cms-preview-frame',
    );
    return (await fetch(frame!.src)).text();
  });
}

function record(name: string, html: string): void {
  if (!recordDir) return;
  fs.mkdirSync(recordDir, { recursive: true });
  // Uploaded files get random 32-hex names.
  fs.writeFileSync(path.join(recordDir, name), html.replace(/[0-9a-f]{32}/g, '<random>'));
}

for (const [key, selector] of Object.entries(EXPECTED)) {
  test(`preview of ${key} renders in both languages and every viewport`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await login(page);
    await openPreview(page, key);

    const preview = page.locator('app-website-page-preview');
    const frame = page.frameLocator('app-website-page-preview .cms-preview-frame');
    const languages = preview.locator('.cms-preview-controls .d-flex button');
    await expect(languages).toHaveCount(2);

    for (const [index, locale] of ['id-ID', 'en-US'].entries()) {
      const button = languages.nth(index);
      await button.click();
      await expect(button).toHaveClass(/btn-theme/);
      await expect(frame.locator(`html[lang="${locale}"]`)).toHaveCount(1);
      await expect(frame.locator(selector).first()).toBeVisible();

      const html = await previewDocument(page);
      expect(html).toContain(`<html lang="${locale}">`);
      record(`website-page-preview-${key}-${locale}.html`, html);
    }

    const device = preview.locator('.cms-preview-device');
    for (const [title, width] of VIEWPORTS) {
      const button = preview.locator(`.btn-group button[title="${title}"]`);
      await button.click();
      await expect(button).toHaveClass(/btn-theme/);
      await expect(device).toHaveAttribute('style', new RegExp(`width: ${width}`));
    }

    expect(errors).toEqual([]);
  });
}
