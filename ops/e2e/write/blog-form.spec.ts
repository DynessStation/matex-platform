import { expect, test, type Page } from '@playwright/test';

import { admin, runId, saveRecording } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the article form (frontend/admin/src/app/components/blog/form-blog):
// every tab renders in create and edit mode, the tab handlers work (validation, languages,
// writing help, media, publication schedule), a new article is created, and saving it
// unchanged is recorded (MATEX_E2E_RECORD, see api-contract.ts) so the stored rows can be
// compared before and after a refactor. Guards the split of this form into one component per
// tab (6C).
test.describe.configure({ mode: 'serial' });

const TABS = ['Umum', 'Konten & Bahasa', 'SEO', 'Media', 'Publikasi'];
let articleId = '';

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

function form(page: Page) {
  return page.locator('app-form-blog');
}

function panel(page: Page) {
  return form(page).locator('.tab-content .tab-pane.active');
}

function control(page: Page, name: string) {
  return panel(page).locator(`[formcontrolname=${name}]`);
}

async function openTab(page: Page, name: string): Promise<void> {
  await form(page).locator('.nav-link', { hasText: name }).first().click();
  await expect(form(page).locator('.nav-link.active')).toContainText(name);
}

async function language(page: Page, code: 'ID' | 'EN'): Promise<void> {
  await panel(page)
    .getByRole('button', { name: code === 'ID' ? /ID\s*Bahasa Indonesia/ : /EN\s*English/ })
    .click();
}

async function typeBody(page: Page, text: string): Promise<void> {
  const editor = panel(page).locator('.NgxEditor__Content');
  await editor.click();
  await page.keyboard.type(text);
}

/** Picks the first image of the media library (the fresh database ships default images). */
async function pickFromLibrary(page: Page): Promise<void> {
  const modal = page.locator('.modal-content');
  await expect(modal).toBeVisible();
  const card = modal.locator('.library-box label').first();
  await expect(card).toBeVisible();
  await card.click();
  await modal.getByRole('button', { name: /Pilih Media|Insert Media/ }).click();
  await expect(modal).toBeHidden();
}

async function save(page: Page, method: 'POST' | 'PUT'): Promise<any> {
  await openTab(page, 'Publikasi');
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/v1/articles') && r.request().method() === method,
  );
  await page.locator('button#article_save').click();
  const result = await response;
  expect(result.status(), await result.text()).toBe(method === 'POST' ? 201 : 200);
  await page.waitForURL(/\/blog(?:[?#]|$)/);
  return result.json();
}

test('create renders every tab, drives the handlers, and saves', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/blog/create`);
  await expect(form(page).locator('.nav-link')).toHaveCount(TABS.length);
  for (const tab of TABS) await openTab(page, tab);

  // An empty save sends the admin back to General.
  await page.locator('button#article_save').click();
  await expect(
    page.getByText('Form artikel belum lengkap', { exact: false }).first(),
  ).toBeVisible();
  await expect(form(page).locator('.nav-link.active')).toContainText('Umum');

  // General: key and flags, then the step button to Content.
  await control(page, 'key').fill(`form-artikel-${runId}`);
  await control(page, 'is_featured').check();
  await panel(page)
    .getByRole('button', { name: /Lanjut/ })
    .click();
  await expect(form(page).locator('.nav-link.active')).toContainText('Konten & Bahasa');

  // Content: both languages and the writing help (not configured in e2e).
  await control(page, 'id_slug').fill(`form-artikel-${runId}`);
  await control(page, 'id_title').fill(`Artikel Form ${runId}`);
  await control(page, 'id_excerpt').fill('Ringkasan artikel uji form.');
  await typeBody(page, 'Isi artikel uji form.');
  await panel(page).getByRole('button', { name: 'Isi ringkasan otomatis' }).click();
  await expect(
    page.getByText(/Fitur isi otomatis belum aktif|Bantuan konten belum berhasil/).first(),
  ).toBeVisible();
  await language(page, 'EN');
  await control(page, 'en_slug').fill(`form-article-${runId}`);
  await control(page, 'en_title').fill(`Form Article ${runId}`);
  await typeBody(page, 'Form test article body.');

  // SEO follows the language chosen in Content.
  await openTab(page, 'SEO');
  await control(page, 'en_meta_title').fill('Form Article | MATEX');
  await language(page, 'ID');
  await control(page, 'id_meta_title').fill('Artikel Form | MATEX');

  // Media: the thumbnail is required.
  await openTab(page, 'Media');
  await panel(page).locator('li.choosefile-input').first().click();
  await pickFromLibrary(page);
  await expect(panel(page).locator('.image-select-list img').nth(1)).toBeVisible();

  // Publication: scheduling shows the date and time pickers with a default slot.
  await openTab(page, 'Publikasi');
  await panel(page).getByText('Jadwalkan Publikasi').click();
  await expect(panel(page).locator('.article-schedule-card').first()).toBeVisible();
  await expect(panel(page).locator('.article-date-toggle').first()).not.toContainText(
    'Pilih tanggal',
  );
  await expect(panel(page).locator('ngb-timepicker').first()).toBeVisible();
  await panel(page).getByText('Publikasikan Sekarang').click();

  const created = await save(page, 'POST');
  articleId = created.data.id ?? created.data.id_article;
  expect(articleId).toBeTruthy();
  expect(errors).toEqual([]);
});

test('edit shows the stored article and saves it unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/blog/edit/${articleId}`);
  await expect(control(page, 'key')).toHaveValue(`form-artikel-${runId}`);
  await expect(control(page, 'is_featured')).toBeChecked();
  await openTab(page, 'Konten & Bahasa');
  await expect(control(page, 'id_title')).toHaveValue(`Artikel Form ${runId}`);
  await expect(panel(page).locator('.NgxEditor__Content')).toContainText('Isi artikel uji form.');
  await openTab(page, 'SEO');
  await expect(control(page, 'id_meta_title')).toHaveValue('Artikel Form | MATEX');
  await openTab(page, 'Media');
  await expect(panel(page).locator('.image-select-list img').nth(1)).toBeVisible();

  await save(page, 'PUT');
  await saveRecording('blog-form', ['article', 'article_i18n', 'article_attachment']);
  expect(errors).toEqual([]);
});
