import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the home "Tag populer" (P-2): the admin home editor
// (frontend/admin/.../website-page-home-content) keeps one shortcut list for both languages
// (text per language, destination a category or a search, up to 12, up/down), refuses to save
// an incomplete tag, and the public home page shows the shortcuts as chips on desktop and
// phone. The home page is saved back as it was at the end.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
let original: any;
let categoryId = '';
const categorySlug = `tag-beranda-${runId}-id`;

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

/** The save body (PUT) for a page detail (GET), as website-page-api.spec.ts builds it. */
const payloadFrom = (page: any) => ({
  is_published: page.is_published,
  publish_at: page.publish_at,
  unpublish_at: page.unpublish_at,
  translations: page.translations.map((item: any) => ({
    locale: item.locale,
    title: item.title,
    summary: item.summary,
    body_html: item.body_html,
    content: item.content,
    seo: item.seo,
    is_published: item.is_published,
  })),
  media: page.media.map((item: any) => ({
    id_attachment: item.id_attachment,
    slot: item.slot,
    is_visible: item.is_visible,
    click_action: item.click_action,
    click_target: item.click_target,
    translations: item.translations,
  })),
});

const rows = (page: Page) => page.locator('.home-tags-editor__row');

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  original = (await (await owner.get('/api/v1/website-page/home')).json()).data;
  const category = await owner.post('/api/v1/product-categories', {
    data: {
      key: `tag-beranda-${runId}`,
      status: 'published',
      translations: [
        { locale: 'id-ID', slug: categorySlug, name: `Kasur Beranda ${runId}` },
        { locale: 'en-US', slug: `tag-beranda-${runId}-en`, name: `Home Mattress ${runId}` },
      ],
    },
  });
  expect(category.status()).toBe(201);
  categoryId = (await category.json()).data.id;
});

test.afterAll(async () => {
  const restored = await owner.put('/api/v1/website-page/home', { data: payloadFrom(original) });
  expect(restored.status()).toBe(200);
  await owner.delete(`/api/v1/product-categories/${categoryId}`);
  await owner.dispose();
});

test('the home editor keeps one tag list, refuses an incomplete tag, and saves', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/website-page/home`);
  await page.locator('.vertical-tabs .nav-link', { hasText: 'Konten' }).first().click();
  const panel = page.locator('.vertical-tabs .tab-content');
  const editor = panel.locator('.home-tags-editor');
  await expect(editor).toBeVisible();
  for (let index = (await rows(page).count()) - 1; index >= 0; index--) {
    await rows(page)
      .nth(index)
      .getByRole('button', { name: /^Hapus tag/ })
      .click();
  }

  // Two tags: a category, then a search.
  await editor.locator('#add_home_tag').click();
  await rows(page).nth(0).getByLabel('Teks Indonesia tag 1').fill('Kasur beranda');
  await rows(page).nth(0).getByLabel('Teks English tag 1').fill('Home mattress');
  await rows(page).nth(0).getByLabel('Tujuan tag 1').selectOption(categoryId);
  await editor.locator('#add_home_tag').click();
  await rows(page).nth(1).getByLabel('Teks Indonesia tag 2').fill('Anti tungau');
  await rows(page).nth(1).getByLabel('Teks English tag 2').fill('Anti dust mite');
  await rows(page).nth(1).getByLabel('Tujuan tag 2').selectOption('search');
  await rows(page).nth(1).getByRole('button', { name: 'Naikkan tag 2' }).click();
  await expect(rows(page).nth(0).getByLabel('Teks Indonesia tag 1')).toHaveValue('Anti tungau');
  await expect(editor.locator('#home_tags_count')).toHaveText('2 dari maksimal 12');

  // The section switch is per language: on for Indonesian and English.
  for (const language of ['Indonesia', 'English']) {
    await panel.locator('button', { hasText: language }).first().click();
    const toggle = page.locator('#home-section-tags');
    if (!(await toggle.isChecked())) await toggle.check();
  }

  // An incomplete third tag blocks saving and is marked.
  await editor.locator('#add_home_tag').click();
  await rows(page).nth(2).getByLabel('Teks Indonesia tag 3').fill('Belum lengkap');
  await page.locator('button', { hasText: 'Simpan Perubahan' }).first().click();
  await expect(rows(page).nth(2)).toHaveClass(/is-invalid/);
  await rows(page).nth(2).getByRole('button', { name: 'Hapus tag 3' }).click();

  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/v1/website-page/home') && r.request().method() === 'PUT',
  );
  await page.locator('button', { hasText: 'Simpan Perubahan' }).first().click();
  expect((await saved).status()).toBe(200);
  const detail = (await (await owner.get('/api/v1/website-page/home')).json()).data;
  const english = detail.translations.find((item: any) => item.locale === 'en-US');
  expect(english.content.tags).toEqual({
    status: true,
    items: [
      { label: 'Anti dust mite', type: 'search' },
      { label: 'Home mattress', type: 'category', category_id: categoryId },
    ],
  });
  expect(errors).toEqual([]);
});

test('the public home page shows the tags as chips on desktop and phone', async ({ page }) => {
  for (const [width, height] of [
    [1366, 800],
    [375, 812],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${stack.publicOrigin}/`);
    const chips = page.locator('.home-tags-section .hot-tag-list a');
    await expect(chips).toHaveText(['Anti tungau', 'Kasur beranda']);
    await expect(chips.first()).toBeVisible();
    await expect(chips.nth(0)).toHaveAttribute('href', '/search?q=Anti%20tungau');
    await expect(chips.nth(1)).toHaveAttribute('href', `/kategori/${categorySlug}`);
  }
  await page.locator('.home-tags-section .hot-tag-list a').nth(1).click();
  await page.waitForURL(new RegExp(`/kategori/${categorySlug}$`));

  await page.goto(`${stack.publicOrigin}/en`);
  await expect(page.locator('.home-tags-section h3')).toHaveText('Popular tags');
  await expect(page.locator('.home-tags-section .hot-tag-list a')).toHaveText([
    'Anti dust mite',
    'Home mattress',
  ]);
});
