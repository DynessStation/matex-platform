import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the article pages of V1.2 (frontend/admin/src/app/components/blog and the
// public article and tag pages): the form's heading, tab dots, automatic address, tags, and writer;
// the insight band and its fixes; what readers see, and the share buttons counted.
test.describe.configure({ mode: 'serial' });

const title = `Bantal Sehat ${runId}`;
const slug = `bantal-sehat-${runId}`;
const tagName = `Kesehatan ${runId}`;
const seedTag = `Tidur ${runId}`;
const screenshots = process.env.MATEX_E2E_SHOTS;

let owner: APIRequestContext;
const articles: string[] = [];

async function login(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

const tabDot = (page: Page, tab: string) =>
  page.locator('app-form-blog .nav-link', { hasText: tab }).locator('.tab-status');

async function typeBody(page: Page, text: string) {
  await page.locator('app-form-blog .NgxEditor__Content').first().click();
  await page.keyboard.type(text);
}

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  const seeded = await owner.post('/api/v1/articles', {
    data: {
      status: 'published',
      tags: [{ name: seedTag }],
      translations: [
        { locale: 'id-ID', slug: `benih-${runId}`, title: 'Benih', body: '<p>Isi</p>' },
        { locale: 'en-US', slug: `benih-${runId}-en`, title: 'Seed', body: '<p>Body</p>' },
      ],
    },
  });
  expect(seeded.status()).toBe(201);
  articles.push((await seeded.json()).data.id);
});

test.afterAll(async () => {
  for (const id of articles) await owner.delete(`/api/v1/articles/${id}`);
  await owner?.dispose();
});

test('writing an article: heading, address, dots, tags, writer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/blog/create`);

  // No General tab; the heading waits for a title.
  await expect(page.locator('app-form-blog .nav-link')).toHaveCount(4);
  await expect(page.getByTestId('form-heading')).toContainText('Tanpa Judul');
  await expect(tabDot(page, 'Konten')).toHaveAttribute('data-state', 'warn');
  await expect(tabDot(page, 'Media')).toHaveAttribute('data-state', 'warn');

  await page.locator('#id_title').pressSequentially(title);
  await expect(page.getByTestId('form-heading')).toHaveText(title);
  await expect(page.locator('#id_slug')).toHaveValue(slug);
  await expect(page.locator('#id_slug')).toHaveAttribute('readonly', '');
  await typeBody(page, 'Isi artikel.');

  // The writer starts as the signed-in account and can be a pen name.
  await expect(page.locator('#article_author')).not.toHaveValue('');
  await page.locator('#article_author').fill('Nama Pena Uji');

  // Tags: an existing one shows how many articles use it, a new one is written.
  await page.locator('#article_tags').pressSequentially(seedTag.slice(0, 8));
  const option = page.getByTestId('tag-option').first();
  await expect(option).toContainText(seedTag);
  await expect(option).toContainText('1 artikel');
  await option.dispatchEvent('mousedown');
  await expect(page.getByTestId('tag-chip')).toHaveCount(1);
  await page.locator('#article_tags').pressSequentially(tagName);
  await page.locator('#article_tags').press('Enter');
  await expect(page.getByTestId('tag-chip')).toHaveCount(2);
  await expect(page.getByTestId('tag-chip').nth(1)).toContainText('baru');

  // English: its own address follows its own title.
  await page.getByRole('button', { name: /EN\s*English/ }).click();
  await page.locator('#en_title').pressSequentially(`Healthy Pillow ${runId}`);
  await expect(page.locator('#en_slug')).toHaveValue(`healthy-pillow-${runId}`);
  await typeBody(page, 'Article body.');
  await expect(page.getByTestId('form-heading')).toHaveText(title);

  // Canonical shows the page's own address until someone sets another.
  await page.locator('app-form-blog .nav-link', { hasText: 'SEO' }).click();
  await expect(page.locator('.tab-pane.active app-auto-field input')).toHaveValue(
    `/en/article/healthy-pillow-${runId}`,
  );

  // The picture is required: saving says so on the tab.
  await page.locator('#article_save').click();
  await expect(tabDot(page, 'Media')).toHaveAttribute('data-state', 'error');
  await expect(page.getByTestId('form-submit-note')).toBeVisible();
  await page.locator('li.choosefile-input').first().click();
  const modal = page.locator('.modal-content');
  await modal.locator('.library-box label').first().click();
  await modal.getByRole('button', { name: /Pilih Media|Insert Media/ }).click();
  await expect(modal).toBeHidden();
  await expect(tabDot(page, 'Media')).not.toHaveAttribute('data-state', 'error');

  await page.locator('app-form-blog .nav-link', { hasText: 'Publikasi' }).click();
  await page.locator('input[formcontrolname=status][value=published]').check();
  if (screenshots) await page.screenshot({ path: `${screenshots}/article-form.png` });
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/articles') && r.request().method() === 'POST',
  );
  await page.locator('#article_save').click();
  const response = await saved;
  expect(response.status(), await response.text()).toBe(201);
  articles.push((await response.json()).data.id);
  await page.waitForURL(/\/blog(?:[?#]|$)/);
  expect(errors).toEqual([]);
});

test('editing keeps the address when the title changes, and warns when it moves', async ({
  page,
}) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/blog/edit/${articles[1]}`);
  await expect(page.locator('#id_title')).toHaveValue(title);
  await expect(page.getByTestId('tag-chip')).toHaveCount(2);
  await expect(page.locator('#article_author')).toHaveValue('Nama Pena Uji');

  await page.locator('#id_title').press('End');
  await page.locator('#id_title').pressSequentially(' Baru');
  await expect(page.getByTestId('form-heading')).toHaveText(`${title} Baru`);
  await expect(page.locator('#id_slug')).toHaveValue(slug);

  await page.locator('.title-slug').first().getByTestId('auto-field-edit').click();
  await page.locator('#id_slug').fill(`benih-${runId}`);
  await page.locator('.title-slug').first().getByTestId('auto-field-confirm').click();
  await expect(page.getByTestId('slug-duplicate')).toBeVisible();
  await page.locator('.title-slug').first().getByTestId('auto-field-edit').click();
  await page.locator('#id_slug').fill(`${slug}-pindah`);
  await page.locator('.title-slug').first().getByTestId('auto-field-confirm').click();
  await expect(page.getByTestId('slug-moved')).toBeVisible();
  await expect(page.getByTestId('slug-duplicate')).toHaveCount(0);
});

test('readers see the writer and tags, and shares are counted', async ({ page, request }) => {
  await page.goto(`${stack.publicOrigin}/artikel/${slug}`);
  await expect(page.locator('.blog-list-box')).toContainText('Nama Pena Uji');
  const tagLink = page.locator('.article-tags a', { hasText: tagName });
  await expect(tagLink).toHaveAttribute('href', new RegExp(`/artikel/tag/kesehatan-${runId}$`));
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(schema.join(' ')).toContain('"Person"');
  expect(schema.join(' ')).toContain(tagName);

  const share = page.getByTestId('article-share');
  await expect(share.locator('[data-channel="whatsapp"]')).toHaveAttribute('href', /wa\.me/);
  const sent = page.waitForRequest(
    (r) => r.url().includes('/analytics/event') && (r.postData() ?? '').includes('"article_share"'),
  );
  const newPage = page.context().waitForEvent('page');
  await share.locator('[data-channel="facebook"]').click();
  await (await newPage).close();
  expect(JSON.parse((await sent).postData() ?? '{}').target_key).toBe('facebook');

  await tagLink.click();
  await expect(page).toHaveURL(new RegExp(`/artikel/tag/kesehatan-${runId}$`));
  await expect(page.locator('body')).toContainText(title);
  await expect(page).toHaveTitle(new RegExp(tagName));

  // Counted as a view for the insight band, from any session.
  const viewed = await request.post(`${stack.apiOrigin}/api/public/analytics/event`, {
    data: {
      event_id: randomUUID(),
      session_id: randomUUID(),
      event_name: 'page_view',
      path: `/artikel/${slug}`,
      locale: 'id-ID',
      occurred_at: new Date().toISOString(),
    },
  });
  expect(viewed.status()).toBe(202);
});

test('the insight band shows the numbers and its fixes filter the list', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/blog`);
  const panel = page.getByTestId('insight-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('insight-rank')).toContainText(title);
  await expect(panel.getByTestId('insight-score')).toBeVisible();
  await expect(panel.getByTestId('insight-line').locator('polyline')).toHaveCount(4);
  await expect(panel.getByTestId('insight-total')).not.toHaveText('0');
  if (screenshots) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `${screenshots}/article-list.png` });
  }

  // Changing a column's range asks again.
  const asked = page.waitForRequest(
    (r) => r.url().includes('/insight/chart') && r.url().includes('days=30'),
  );
  await panel.getByTestId('insight-column').nth(1).getByRole('button', { name: '1B' }).click();
  await asked;

  // "Perbaiki": only the problem articles, until the filter is cleared.
  const listed = page.waitForRequest(
    (r) => r.url().includes('/api/v1/articles?') && r.url().includes('audit=no_excerpt'),
  );
  await panel.locator('.insight-check-warn a').last().click();
  await listed;
  await expect(page).toHaveURL(/audit=no_excerpt/);
  await expect(page.getByTestId('audit-filter')).toBeVisible();
  const cleared = page.waitForRequest(
    (r) => r.url().includes('/api/v1/articles?') && !r.url().includes('audit='),
  );
  await page.getByTestId('audit-filter').getByRole('button').click();
  await cleared;
  await expect(page.getByTestId('audit-filter')).toHaveCount(0);

  // A fresh visit with the filter in the address uses it too.
  const direct = page.waitForRequest(
    (r) => r.url().includes('/api/v1/articles?') && r.url().includes('audit=no_tag'),
  );
  await page.goto(`${stack.adminOrigin}/blog?audit=no_tag`);
  await direct;
});

test('Kelola Tag: names per language, deleting what is unused', async ({ page }) => {
  const unused = `Terpakai Sebentar ${runId}`;
  const article = await owner.post('/api/v1/articles', {
    data: {
      status: 'draft',
      tags: [{ name: unused }],
      translations: [
        { locale: 'id-ID', slug: `sebentar-${runId}`, title: 'Sebentar', body: '<p>Isi</p>' },
        { locale: 'en-US', slug: `sebentar-${runId}-en`, title: 'Brief', body: '<p>Body</p>' },
      ],
    },
  });
  const id = (await article.json()).data.id;
  await owner.put(`/api/v1/articles/${id}`, {
    data: {
      status: 'draft',
      tags: [],
      translations: [
        { locale: 'id-ID', slug: `sebentar-${runId}`, title: 'Sebentar', body: '<p>Isi</p>' },
        { locale: 'en-US', slug: `sebentar-${runId}-en`, title: 'Brief', body: '<p>Body</p>' },
      ],
    },
  });
  articles.push(id);

  await login(page);
  await page.goto(`${stack.adminOrigin}/blog`);
  await page.getByTestId('insight-top-tags').click();
  const modal = page.getByTestId('article-tags-modal');
  await expect(modal).toBeVisible();

  const row = modal.getByTestId('inline-row').filter({ hasText: tagName });
  await expect(row.locator('[data-column="count"]')).toHaveText('1');
  await row.getByTestId('inline-edit').click();
  // A tag in use cannot be deleted.
  const editing = modal.locator('.inline-table-editing');
  await expect(editing.getByTestId('inline-remove')).toHaveCount(0);
  await editing.locator('[data-column="name_en"] input').fill(`Health ${runId}`);
  await editing.getByTestId('inline-save').click();
  await expect(
    modal.getByTestId('inline-row').filter({ hasText: `Health ${runId}` }),
  ).toBeVisible();

  const idle = modal.getByTestId('inline-row').filter({ hasText: unused });
  await idle.getByTestId('inline-edit').click();
  await modal.locator('.inline-table-editing').getByTestId('inline-remove').click();
  await expect(idle).toHaveCount(0);
});
