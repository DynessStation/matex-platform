import { expect, request, test, type APIRequestContext } from '@playwright/test';

import { admin, expectCode, login, runId } from './api-contract';
import { stack } from './stack.mjs';

// API contract for what V1.2 added to articles: tags made and picked when saving an article, the
// writer's name, the tag page on the public site (with its SEO rules), the audit filter, and the
// numbers of the insight band.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/articles';
const tags = '/api/v1/article-tags';
const tagName = `Tidur Sehat ${runId}`;
const tagSlug = `tidur-sehat-${runId}`;
const created: string[] = [];

let owner: APIRequestContext;

const body = (name: string, extra: Record<string, unknown> = {}) => ({
  status: 'published',
  translations: [
    { locale: 'id-ID', slug: name, title: `Judul ${name}`, body: '<p>Isi</p>' },
    { locale: 'en-US', slug: `${name}-en`, title: `Title ${name}`, body: '<p>Body</p>' },
  ],
  ...extra,
});

async function create(name: string, extra: Record<string, unknown> = {}) {
  const response = await owner.post(base, { data: body(name, extra) });
  expect(response.status(), await response.text()).toBe(201);
  const id = (await response.json()).data.id as string;
  created.push(id);
  return id;
}

const detail = async (id: string) => (await expectCode(await owner.get(`${base}/${id}`), 200)).data;

const tagRow = async (name: string) =>
  (await expectCode(await owner.get(tags), 200)).data.find(
    (item: { name_id: string }) => item.name_id === name,
  );

async function visit(path: string) {
  const site = await request.newContext();
  const response = await site.get(`${stack.publicOrigin}${path}`, { maxRedirects: 0 });
  const result = {
    status: response.status(),
    location: response.headers()['location'] ?? '',
    html: await response.text(),
  };
  await site.dispose();
  return result;
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
});

test.afterAll(async () => {
  for (const id of created) await owner.delete(`${base}/${id}`);
  await owner?.dispose();
});

test('a written tag is made on saving, a picked one is reused, and the list counts them', async () => {
  const first = await create(`tag-a-${runId}`, {
    tags: [{ name: tagName }],
    author_name: 'Nama Pena',
  });
  const saved = await detail(first);
  expect(saved.tags).toHaveLength(1);
  expect(saved.tags[0].name).toBe(tagName);
  expect(saved.author_name).toBe('Nama Pena');

  // Writing the same name again does not make a second tag.
  const second = await create(`tag-b-${runId}`, { tags: [{ id: saved.tags[0].id }] });
  await create(`tag-c-${runId}`, { tags: [{ name: tagName }] });
  expect((await detail(second)).tags[0].id).toBe(saved.tags[0].id);
  expect((await tagRow(tagName)).article_count).toBe(3);

  for (const invalid of [
    { tags: 'x' },
    { tags: [{ name: ' ' }] },
    { tags: [{ id: 'not-a-hash' }] },
    { tags: [{ name: 'N'.repeat(101) }] },
    { tags: Array.from({ length: 21 }, (_, index) => ({ name: `t${index}` })) },
  ]) {
    const response = await owner.post(base, { data: body(`tag-x-${runId}`, invalid) });
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('ARTICLE_TAGS_INVALID');
  }
});

test('an update that leaves tags and author out keeps them; sending them replaces them', async () => {
  const id = created[0];
  await expectCode(await owner.put(`${base}/${id}`, { data: body(`tag-a-${runId}`) }), 200);
  let saved = await detail(id);
  expect(saved.tags).toHaveLength(1);
  expect(saved.author_name).toBe('Nama Pena');

  await expectCode(
    await owner.put(`${base}/${id}`, {
      data: body(`tag-a-${runId}`, { tags: [], author_name: '' }),
    }),
    200,
  );
  saved = await detail(id);
  expect(saved.tags).toEqual([]);
  expect(saved.author_name).toBe('');
  // Put back for the next tests.
  await expectCode(
    await owner.put(`${base}/${id}`, {
      data: body(`tag-a-${runId}`, { tags: [{ name: tagName }], author_name: 'Nama Pena' }),
    }),
    200,
  );
});

test('the public article carries its tags and writer; older ones still say MATEX', async () => {
  const article = await expectCode(
    await owner.get(`/api/public/articles/id-ID/tag-a-${runId}`),
    200,
  );
  expect(article.data.tags).toEqual([{ name: tagName, slug: tagSlug }]);
  expect(article.data.created_by.name).toBe('Nama Pena');
  expect(article.data.has_author).toBe(true);

  const plain = await expectCode(await owner.get(`/api/public/articles/id-ID/tag-b-${runId}`), 200);
  expect(plain.data.created_by.name).toBe('MATEX');
  expect(plain.data.has_author).toBe(false);
});

test('a tag has its own page that search engines can use once it has enough articles', async () => {
  const list = await expectCode(
    await owner.get('/api/public/articles/id-ID', { params: { tag: tagSlug } }),
    200,
  );
  expect(list.data).toHaveLength(3);

  const tag = await expectCode(await owner.get(`/api/public/article-tags/id-ID/${tagSlug}`), 200);
  expect(tag.data).toMatchObject({ name: tagName, article_count: 3, indexable: true });
  await expectCode(await owner.get('/api/public/article-tags/id-ID/tidak-ada'), 404);

  const page = await visit(`/artikel/tag/${tagSlug}`);
  expect(page.status).toBe(200);
  expect(page.html).toContain(tagName);
  expect(page.html).not.toMatch(/name="robots" content="noindex/);
  expect((await visit(`/en/articles/tag/${tagSlug}`)).status).toBe(200);
  expect((await visit('/artikel/tag/tidak-ada-tag')).status).toBe(404);

  const sitemap = await visit('/sitemap.xml');
  expect(sitemap.html).toContain(`/artikel/tag/${tagSlug}`);
  expect(sitemap.html).toContain(`/en/articles/tag/${tagSlug}`);
});

test('a tag with one article is a page but stays out of search engines', async () => {
  const lone = `Tag Sendiri ${runId}`;
  await create(`tag-lone-${runId}`, { tags: [{ name: lone }] });
  const slug = `tag-sendiri-${runId}`;
  const page = await visit(`/artikel/tag/${slug}`);
  expect(page.status).toBe(200);
  expect(page.html).toMatch(/name="robots" content="noindex/);
  expect((await visit('/sitemap.xml')).html).not.toContain(`/artikel/tag/${slug}`);
});

test('renaming a tag moves its page; a tag in use cannot be deleted', async () => {
  const row = await tagRow(tagName);
  const nameId = `Tidur Nyenyak ${runId}`;
  await expectCode(
    await owner.put(`${tags}/${row.id}`, { data: { name_id: ' ', name_en: 'x' } }),
    400,
    'ARTICLE_TAG_NAME_INVALID',
  );
  await expectCode(
    await owner.put(`${tags}/${row.id}`, { data: { name_id: nameId, name_en: `Sound ${runId}` } }),
    200,
  );
  const moved = await visit(`/artikel/tag/${tagSlug}`);
  expect(moved.status).toBe(301);
  expect(moved.location).toContain(`/artikel/tag/tidur-nyenyak-${runId}`);
  expect((await visit(`/en/articles/tag/sound-${runId}`)).status).toBe(200);

  await expectCode(await owner.delete(`${tags}/${row.id}`), 409, 'ARTICLE_TAG_IN_USE');
  await expectCode(await owner.put(`${tags}/not-a-hash`, { data: {} }), 404);
});

test('the audit filter lists the articles with a problem', async () => {
  const noTag = await create(`audit-${runId}`);
  const list = async (audit: string) =>
    (await expectCode(await owner.get(base, { params: { audit, limit: '100' } }), 200)).data.map(
      (item: { id: string }) => item.id,
    );
  expect(await list('no_tag')).toContain(noTag);
  expect(await list('no_tag')).not.toContain(created[1]);
  expect(await list('no_image')).toContain(noTag);
  expect(await list('no_excerpt')).toContain(noTag);
  expect(await list('untranslated')).not.toContain(noTag);

  const copied = await create(`salin-${runId}`, {
    translations: [
      { locale: 'id-ID', slug: `salin-${runId}`, title: 'Sama', body: '<p>Sama</p>' },
      { locale: 'en-US', slug: `salin-${runId}-en`, title: 'Sama', body: '<p>Sama</p>' },
    ],
  });
  expect(await list('untranslated')).toContain(copied);

  const long = await create(`panjang-${runId}`, {
    translations: [
      {
        locale: 'id-ID',
        slug: `panjang-${runId}`,
        title: 'Panjang',
        body: '<p>Isi</p>',
        meta_description: 'x'.repeat(161),
      },
      { locale: 'en-US', slug: `panjang-${runId}-en`, title: 'Long', body: '<p>Body</p>' },
    ],
  });
  expect(await list('long_meta')).toContain(long);
  // An unknown filter is ignored.
  expect((await list('hacker')).length).toBeGreaterThan(0);
});

test('the insight band counts what happened', async () => {
  await expectCode(
    await request.newContext().then((c) => c.get(`${stack.apiOrigin}${base}/insight/audit`)),
    401,
  );

  const audit = (await expectCode(await owner.get(`${base}/insight/audit`), 200)).data;
  expect(audit.total).toBeGreaterThanOrEqual(created.length);
  expect(audit.published).toBeGreaterThan(0);
  expect(audit.total).toBe(audit.published + audit.scheduled + audit.draft + audit.archived);
  expect(audit.checks.no_tag).toBeGreaterThan(0);
  // An article was published today: this week counts.
  expect(audit.score).toBeGreaterThanOrEqual(12);
  expect(audit.score).toBeLessThanOrEqual(100);

  const chart = (
    await expectCode(await owner.get(`${base}/insight/chart`, { params: { days: '7' } }), 200)
  ).data;
  expect(chart.labels).toHaveLength(7);
  expect(chart.views).toHaveLength(7);
  expect(chart.published.reduce((a: number, b: number) => a + b, 0)).toBeGreaterThan(0);
  const hours = (
    await expectCode(await owner.get(`${base}/insight/chart`, { params: { days: '1' } }), 200)
  ).data;
  expect(hours.labels).toHaveLength(24);

  const top = await expectCode(
    await owner.get(`${base}/insight/top`, { params: { days: '30' } }),
    200,
  );
  expect(Array.isArray(top.data)).toBe(true);
  expect(top.data.length).toBeLessThanOrEqual(5);
});
