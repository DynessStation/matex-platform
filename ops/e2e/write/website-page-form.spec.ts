import { expect, test, type Page } from '@playwright/test';

import { admin, runId, saveRecording } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the fixed website page form
// (frontend/admin/src/app/components/website-page/website-page-form): every tab renders for
// a plain page (terms), the home page, and the about page, and a saved title reaches the
// public site. Saving home and about unchanged is recorded (MATEX_E2E_RECORD, see
// api-contract.ts) so the stored rows can be compared before and after a refactor.
// Guards the split of this form into one component per tab (6C).
test.describe.configure({ mode: 'serial' });

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

/** Clicks "Simpan Perubahan" and expects the page update to succeed. */
async function saveForm(page: Page, key: string): Promise<void> {
  const response = page.waitForResponse(
    (r) => r.url().includes(`/api/v1/website-page/${key}`) && r.request().method() === 'PUT',
  );
  await page.locator('button', { hasText: 'Simpan Perubahan' }).first().click();
  expect((await response).status()).toBe(200);
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
  const changed = `Syarat & Ketentuan Uji ${runId}`;

  const save = () => saveForm(page, 'terms');

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

test('saving home and about unchanged keeps their content', async ({ page }) => {
  await login(page);
  for (const key of ['home', 'about']) {
    await openPage(page, key);
    await expectTab(page, 'Umum', 'Informasi Dasar');
    await saveForm(page, key);
  }
  await saveRecording('website-page-form', [
    'website_page',
    'website_page_i18n',
    'website_page_media',
    'website_page_media_i18n',
  ]);
});

test('tab handlers work without saving', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const panel = page.locator('.vertical-tabs .tab-content');

  // Terms: switch the content language, then step to SEO with the tab button.
  await openPage(page, 'terms');
  await expectTab(page, 'Konten & Bahasa', 'Konten & Bahasa');
  const english = panel.locator('button', { hasText: 'English' }).first();
  await english.click();
  await expect(english).toHaveClass(/btn-theme/);
  await panel.locator('button', { hasText: 'Lanjut ke SEO' }).click();
  await expect(panel.locator('h5', { hasText: 'SEO' }).first()).toBeVisible();

  // Terms: choosing a schedule shows the date and time pickers.
  await expectTab(page, 'Publikasi', 'Publikasi Halaman');
  await panel.getByText('Jadwalkan Publikasi').click();
  await expect(panel.locator('.cms-publication-date-toggle').first()).toBeVisible();
  await expect(panel.locator('ngb-timepicker').first()).toBeVisible();

  // Home: a section switch toggles, and a media slot opens the media library.
  await openPage(page, 'home');
  await expectTab(page, 'Konten & Bahasa', 'Konten & Bahasa');
  const tags = page.locator('#home-section-tags');
  const tagsOn = await tags.isChecked();
  await tags.click();
  await expect(tags).toBeChecked({ checked: !tagsOn });
  await expectTab(page, 'Media', 'Media Halaman');
  await panel.locator('button', { hasText: 'Ganti Gambar' }).first().click();
  await expect(page.locator('#media_close_btn')).toBeVisible();
  await page.locator('#media_close_btn').click();
  await expect(page.locator('#media_close_btn')).toHaveCount(0);

  // About: a highlight title without a description is flagged.
  await openPage(page, 'about');
  await expectTab(page, 'Konten & Bahasa', 'Konten & Bahasa');
  await panel.locator('input[maxlength="160"]').first().fill('Judul uji');
  await panel.locator('[maxlength="1000"]').first().fill('');
  await expect(panel.getByText('Isi judul dan deskripsi sekaligus').first()).toBeVisible();

  expect(errors).toEqual([]);
});
