import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, expectCode, login, runId, saveRecording, uploadSample } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract of English that follows Indonesian (V1.2 Part 3, stage 4) on the five
// content forms: only Indonesian is typed, English is filled on save and marked, an English
// field edited by hand is kept, and a failed translation copies the Indonesian and says so.
// The provider is write/fake-ai-server.mjs: it puts "EN " in front of every value.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;

async function signIn(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

const englishSwitch = (page: Page) => page.getByTestId('english-show');

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
});

test.afterAll(async () => {
  await saveRecording('english-page', []);
  await owner?.dispose();
});

async function faqByKey(key: string) {
  const list = await expectCode(await owner.get('/api/v1/faq', { params: { search: key } }), 200);
  const found = list.data.find((item: { key: string }) => item.key === key);
  expect(found, `FAQ ${key}`).toBeTruthy();
  return (await expectCode(await owner.get(`/api/v1/faq/${found.id}`), 200)).data;
}

const translation = (record: { translations: { locale: string }[] }, locale: string) =>
  record.translations.find((item) => item.locale === locale) as Record<string, string>;

test('FAQ: only Indonesian is typed, English follows on save, and an edit by hand stays', async ({
  page,
}) => {
  const key = `faq-en-${runId}`;
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/faq/create`);
  // English is hidden until someone asks for it.
  await expect(englishSwitch(page)).not.toBeChecked();
  await expect(page.locator('#en_question')).toBeHidden();
  await page.locator('#key').fill(key);
  await page.locator('#id_question').fill('Apakah kasur lateks awet?');
  await page.locator('#id_answer').fill('Ya, kasur lateks awet bertahun-tahun.');
  await page.locator('#faq_btn').click();
  await page.waitForURL(/\/faq(?:[?#]|$)/);

  let faq = await faqByKey(key);
  expect(translation(faq, 'en-US')).toMatchObject({
    question: 'EN Apakah kasur lateks awet?',
    answer: 'EN Ya, kasur lateks awet bertahun-tahun.',
  });
  const sources = await expectCode(await owner.get(`/api/v1/content-english/faq/${faq.id}`), 200);
  expect(sources.data.sources).toEqual({ question: 'auto', answer: 'auto' });

  // Someone fixes the English question by hand; later the Indonesian changes.
  await page.goto(`${stack.adminOrigin}/faq/edit/${faq.id}`);
  await expect(page.locator('#id_question')).toHaveValue('Apakah kasur lateks awet?');
  await englishSwitch(page).check();
  await expect(page.locator('#en_question')).toBeVisible();
  await expect(page.locator('label[for=en_question] [data-testid=english-badge]')).toHaveAttribute(
    'data-state',
    'auto',
  );
  await page.locator('#en_question').fill('Is a latex mattress durable?');
  await page.locator('#faq_btn').click();
  await page.waitForURL(/\/faq(?:[?#]|$)/);

  await page.goto(`${stack.adminOrigin}/faq/edit/${faq.id}`);
  await expect(page.locator('#id_question')).toHaveValue('Apakah kasur lateks awet?');
  await expect(page.locator('label[for=en_question] [data-testid=english-badge]')).toHaveAttribute(
    'data-state',
    'manual',
  );
  await page.locator('#id_question').fill('Berapa lama kasur lateks awet?');
  await page.locator('#id_answer').fill('Kasur lateks awet sampai sepuluh tahun.');
  await page.locator('#faq_btn').click();
  await page.waitForURL(/\/faq(?:[?#]|$)/);

  faq = await faqByKey(key);
  expect(translation(faq, 'en-US')).toMatchObject({
    question: 'Is a latex mattress durable?',
    answer: 'EN Kasur lateks awet sampai sepuluh tahun.',
  });
});

test('FAQ: a failed translation copies the Indonesian and marks it', async ({ page }) => {
  const key = `faq-gagal-${runId}`;
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/faq/create`);
  await page.locator('#key').fill(key);
  await page.locator('#id_question').fill('GAGAL-TERJEMAH pertanyaan');
  await page.locator('#id_answer').fill('Jawaban apa saja.');
  await page.locator('#faq_btn').click();
  await expect(page.getByText(/belum diterjemahkan/).first()).toBeVisible();
  await page.waitForURL(/\/faq(?:[?#]|$)/);

  const faq = await faqByKey(key);
  // One request carries both fields, so both fall back.
  expect(translation(faq, 'en-US')).toMatchObject({
    question: 'GAGAL-TERJEMAH pertanyaan',
    answer: 'Jawaban apa saja.',
  });
  const sources = await expectCode(await owner.get(`/api/v1/content-english/faq/${faq.id}`), 200);
  expect(sources.data.sources).toEqual({ question: 'copy', answer: 'copy' });
});

async function category(slug: string) {
  const created = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: slug,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `${slug}-id`, name: `Kategori ${slug}` },
          { locale: 'en-US', slug: `${slug}-en`, name: `Category ${slug}` },
        ],
      },
    }),
    201,
  );
  return created.data.id as string;
}

test('Product: old English stays until it is refilled; then names and specifications follow', async ({
  page,
}) => {
  const key = `produk-en-${runId}`;
  const created = await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        key,
        sku: `EN-${runId}`.toUpperCase(),
        status: 'draft',
        category_ids: [await category(`en-prod-${runId}`)],
        price_visibility: 'contact',
        prices: [],
        translations: [
          {
            locale: 'id-ID',
            slug: `kasur-${runId}`,
            name: `Kasur Lama ${runId}`,
            short_description: 'Ringkas',
            specifications: { Bahan: 'Lateks alami' },
          },
          {
            locale: 'en-US',
            slug: `old-mattress-${runId}`,
            name: `Old Mattress ${runId}`,
            short_description: 'Short',
          },
        ],
      },
    }),
    201,
  );
  const id = created.data.id;
  const detail = async () =>
    translation((await expectCode(await owner.get(`/api/v1/products/${id}`), 200)).data, 'en-US');

  await signIn(page);
  await page.goto(`${stack.adminOrigin}/product/edit/${id}`);
  await page.locator('.vertical-tabs .nav-link', { hasText: 'Konten' }).first().click();
  await expect(page.locator('#id_title')).toHaveValue(`Kasur Lama ${runId}`);
  // English from before this existed counts as written by someone.
  await page.locator('#id_title').fill(`Kasur Baru ${runId}`);
  await page.locator('#product_btn').click();
  await page.waitForURL(/\/product(?:[?#]|$)/);
  expect(await detail()).toMatchObject({
    name: `Old Mattress ${runId}`,
    short_description: 'Short',
  });

  // "Isi ulang English dari Indonesia": everything follows Indonesian, the address stays.
  await page.goto(`${stack.adminOrigin}/product/edit/${id}`);
  await expect(page.locator('#id_title')).toHaveValue(`Kasur Baru ${runId}`);
  await englishSwitch(page).check();
  await page.getByTestId('english-refill').click();
  await page.locator('#product_btn').click();
  await page.waitForURL(/\/product(?:[?#]|$)/);
  const english = await detail();
  expect(english).toMatchObject({
    name: `EN Kasur Baru ${runId}`,
    short_description: 'EN Ringkas',
    slug: `old-mattress-${runId}`,
  });
  expect(JSON.stringify(english.specifications)).toContain('EN Bahan');
  expect(JSON.stringify(english.specifications)).toContain('EN Lateks alami');
  const sources = await expectCode(await owner.get(`/api/v1/content-english/product/${id}`), 200);
  expect(sources.data.sources).toMatchObject({
    name: 'auto',
    short_description: 'auto',
    'specs.0.label': 'auto',
    'specs.0.value': 'auto',
  });
});

test('Article: the body follows as HTML and the badge says so', async ({ page }) => {
  const key = `artikel-en-${runId}`;
  const created = await expectCode(
    await owner.post('/api/v1/articles', {
      data: {
        key,
        status: 'draft',
        // The form asks for a thumbnail before it saves.
        thumbnail_id: await uploadSample(owner, 'media_library'),
        translations: [
          {
            locale: 'id-ID',
            slug: `${key}-id`,
            title: `Artikel ${runId}`,
            body: '<p>Isi lama</p>',
          },
          {
            locale: 'en-US',
            slug: `${key}-en`,
            title: `Article ${runId}`,
            body: '<p>Old body</p>',
          },
        ],
      },
    }),
    201,
  );
  const id = created.data.id;
  // Starting from a clean slate: every English field follows Indonesian.
  await expectCode(
    await owner.put(`/api/v1/content-english/article/${id}`, {
      data: { sources: { title: 'auto', body: 'auto', slug: 'auto' } },
    }),
    200,
  );
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/blog/edit/${id}`);
  await page.locator('.vertical-tabs .nav-link', { hasText: 'Konten' }).first().click();
  await expect(page.locator('#id_title')).toHaveValue(`Artikel ${runId}`);
  await page.locator('#id_title').fill(`Artikel Baru ${runId}`);
  await page.locator('#article_save').click();
  await page.waitForURL(/\/blog(?:[?#]|$)/);
  const article = (await expectCode(await owner.get(`/api/v1/articles/${id}`), 200)).data;
  expect(translation(article, 'en-US')).toMatchObject({
    title: `EN Artikel Baru ${runId}`,
    slug: `${key}-en`,
  });
  // The body did not change in Indonesian, so its English was not asked for again.
  expect(translation(article, 'en-US').body).toBe('<p>Old body</p>');

  await page.goto(`${stack.adminOrigin}/blog/edit/${id}`);
  await page.locator('.vertical-tabs .nav-link', { hasText: 'Konten' }).first().click();
  await englishSwitch(page).check();
  await page.getByRole('button', { name: /EN\s*English/ }).click();
  await expect(page.locator('label[for=en_title] [data-testid=english-badge]')).toHaveAttribute(
    'data-state',
    'auto',
  );
});

test('Website page: the career page follows Indonesian after a refill', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/website-page/career`);
  await expect(page.locator('.vertical-tabs .nav-link')).toHaveCount(6);
  await englishSwitch(page).check();
  await page.getByTestId('english-refill').click();
  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/v1/website-page/career') && r.request().method() === 'PUT',
  );
  await page.locator('button', { hasText: 'Simpan Perubahan' }).first().click();
  expect((await saved).status()).toBe(200);
  const career = (await expectCode(await owner.get('/api/v1/website-page/career'), 200)).data;
  const id = translation(career, 'id-ID');
  const en = translation(career, 'en-US');
  expect(en.title).toBe(`EN ${id.title}`);
  const sources = await expectCode(
    await owner.get('/api/v1/content-english/website_page/career'),
    200,
  );
  expect(sources.data.sources).toMatchObject({ title: 'auto' });
});
