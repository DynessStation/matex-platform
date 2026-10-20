import { expect, test, type Page } from '@playwright/test';

import { admin } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the fixed website page form
// (frontend/admin/src/app/components/website-page/website-page-form): every tab renders for
// a plain page (terms), the home page, and the about page, and a saved title reaches the
// public site. Guards the split of this form into one component per tab (6C).
test.describe.configure({ mode: 'serial' });

const run = Date.now().toString(36);
const TABS = ['Umum', 'Konten & Bahasa', 'SEO', 'Media', 'Publikasi', 'Pratinjau'];

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

async function openPage(page: Page, key: string): Promise<void> {
  await page.goto(`${stack.adminOrigin}/website-page/${key}`);
  await expect(page.locator('.vertical-tabs .nav-link')).toHaveCount(6);
}

async function openTab(page: Page, name: string): Promise<void> {
  await page.locator('.vertical-tabs .nav-link', { hasText: name }).first().click();
}

/** Opens a tab and waits for its panel heading. */
async function expectTab(page: Page, tab: string, heading: string): Promise<void> {
  await openTab(page, tab);
  await expect(
    page.locator('.vertical-tabs .tab-content h5', { hasText: heading }).first(),
  ).toBeVisible();
}

const HEADINGS = [
  'Informasi Dasar',
  'Konten & Bahasa',
  'SEO',
  'Media Halaman',
  'Publikasi Halaman',
  'Ringkasan Sebelum Menyimpan',
];

// Each page also shows its own media slot on the Media tab.
const MEDIA_SLOT: Record<string, string> = {
  terms: 'Media Halaman',
  home: 'Banner utama',
  about: 'Gambar utama Tentang MATEX',
};

test('every tab renders for terms, home, and about', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  for (const key of Object.keys(MEDIA_SLOT)) {
    await openPage(page, key);
    for (const [index, tab] of TABS.entries()) {
      await expectTab(page, tab, HEADINGS[index]);
      if (tab === 'Media') {
        await expect(
          page
            .locator('.vertical-tabs .tab-content')
            .getByText(MEDIA_SLOT[key])
            .filter({ visible: true })
            .first(),
        ).toBeVisible();
      }
    }
  }
  expect(errors).toEqual([]);
});

test('a saved title reaches the public site', async ({ page }) => {
  await login(page);
  await openPage(page, 'terms');
  await expectTab(page, 'Konten & Bahasa', 'Konten & Bahasa');
  const title = page.locator('input[formcontrolname=title]:visible').first();
  const original = await title.inputValue();
  const changed = `Syarat & Ketentuan Uji ${run}`;

  const save = async () => {
    const response = page.waitForResponse(
      (r) => r.url().includes('/api/v1/website-page/terms') && r.request().method() === 'PUT',
    );
    await page.locator('button', { hasText: 'Simpan Perubahan' }).first().click();
    expect((await response).status()).toBe(200);
  };

  await title.fill(changed);
  await save();
  const publicPage = await page.request.get(
    `${stack.apiOrigin}/api/public/website-page/id-ID/syarat-ketentuan`,
  );
  expect((await publicPage.json()).data.title).toBe(changed);

  await openPage(page, 'terms');
  await expectTab(page, 'Konten & Bahasa', 'Konten & Bahasa');
  await expect(page.locator('input[formcontrolname=title]:visible').first()).toHaveValue(changed);
  await page.locator('input[formcontrolname=title]:visible').first().fill(original);
  await save();
});
