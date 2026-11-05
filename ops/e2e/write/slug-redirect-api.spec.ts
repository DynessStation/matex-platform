import { expect, request, test, type APIRequestContext } from '@playwright/test';

import { admin, login, runId } from './api-contract';
import { stack } from './stack.mjs';

// Contract for addresses and keys (V1.2 Part 1, G-3, G-7, auto keys):
// - a key left out is made from the Indonesian slug, numbered when taken, and kept on update;
// - a changed slug leaves the old address working: 301 on the public site in both languages;
// - taking the old slug back, or the record not being public, ends the redirect;
// - /api/v1/slug-check says whether a slug is free.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
const created: { path: string; id: string }[] = [];
const slug = (name: string) => `alamat-${name}-${runId}`;

async function create(path: string, data: Record<string, unknown>) {
  const response = await owner.post(path, { data });
  expect(response.status(), `${path}: ${await response.text()}`).toBe(201);
  const id = (await response.json()).data.id as string;
  created.push({ path, id });
  return id;
}

async function detail(path: string, id: string) {
  const response = await owner.get(`${path}/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

const articleBody = (idSlug: string, enSlug: string, status = 'published') => ({
  status,
  translations: [
    { locale: 'id-ID', slug: idSlug, title: 'Artikel Alamat', body: '<p>Isi</p>' },
    { locale: 'en-US', slug: enSlug, title: 'Address Article', body: '<p>Body</p>' },
  ],
});

const categoryBody = (idSlug: string, enSlug: string) => ({
  status: 'published',
  translations: [
    { locale: 'id-ID', slug: idSlug, name: `Kategori ${idSlug}` },
    { locale: 'en-US', slug: enSlug, name: `Category ${enSlug}` },
  ],
});

/** What the public site answers, without following a redirect. */
async function visit(path: string) {
  const site = await request.newContext();
  const response = await site.get(`${stack.publicOrigin}${path}`, { maxRedirects: 0 });
  const result = { status: response.status(), location: response.headers()['location'] ?? '' };
  await site.dispose();
  return result;
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
});

test.afterAll(async () => {
  for (const { path, id } of created.reverse()) await owner.delete(`${path}/${id}`);
  await owner?.dispose();
});

test('a key left out comes from the Indonesian slug, numbered when taken', async () => {
  const first = await create('/api/v1/articles', articleBody(slug('kunci'), `${slug('kunci')}-en`));
  expect((await detail('/api/v1/articles', first)).key).toBe(slug('kunci'));

  // The same key is taken already, so this one gets a number.
  const taken = await create('/api/v1/articles', {
    ...articleBody(`${slug('kunci')}-lain`, `${slug('kunci')}-lain-en`),
    key: `${slug('nomor')}`,
  });
  expect((await detail('/api/v1/articles', taken)).key).toBe(slug('nomor'));
  const second = await create(
    '/api/v1/articles',
    articleBody(slug('nomor'), `${slug('nomor')}-en`),
  );
  expect((await detail('/api/v1/articles', second)).key).toBe(`${slug('nomor')}-2`);
});

test('a key stays when an update leaves it out, and a sent key that exists is refused', async () => {
  const id = await create('/api/v1/articles', articleBody(slug('tetap'), `${slug('tetap')}-en`));
  const update = await owner.put(`/api/v1/articles/${id}`, {
    data: articleBody(slug('tetap'), `${slug('tetap')}-en`),
  });
  expect(update.status()).toBe(200);
  expect((await detail('/api/v1/articles', id)).key).toBe(slug('tetap'));

  const duplicate = await owner.post('/api/v1/articles', {
    data: { ...articleBody(`${slug('dobel')}`, `${slug('dobel')}-en`), key: slug('tetap') },
  });
  expect(duplicate.status()).toBe(409);
});

test('products and categories get a key too', async () => {
  const category = await create(
    '/api/v1/product-categories',
    categoryBody(slug('kat'), `${slug('kat')}-en`),
  );
  expect((await detail('/api/v1/product-categories', category)).key).toBe(slug('kat'));
  const product = await create('/api/v1/products', {
    sku: `ALAMAT-${runId}`.toUpperCase(),
    status: 'published',
    category_ids: [category],
    translations: [
      { locale: 'id-ID', slug: slug('prd'), name: 'Produk Alamat' },
      { locale: 'en-US', slug: `${slug('prd')}-en`, name: 'Address Product' },
    ],
  });
  expect((await detail('/api/v1/products', product)).key).toBe(slug('prd'));
});

test('a changed article slug moves permanently, in both languages', async () => {
  const oldId = slug('lama');
  const oldEn = `${slug('lama')}-en`;
  const newId = slug('baru');
  const newEn = `${slug('baru')}-en`;
  const id = await create('/api/v1/articles', articleBody(oldId, oldEn));
  expect((await visit(`/artikel/${oldId}`)).status).toBe(200);

  const update = await owner.put(`/api/v1/articles/${id}`, { data: articleBody(newId, newEn) });
  expect(update.status()).toBe(200);

  const api = await owner.get(`/api/public/articles/id-ID/${oldId}`);
  expect(api.status()).toBe(404);
  expect((await api.json()).data).toEqual({ moved_to: newId });

  const moved = await visit(`/artikel/${oldId}?utm_source=uji`);
  expect(moved.status).toBe(301);
  expect(moved.location).toContain(`/artikel/${newId}?utm_source=uji`);
  const movedEn = await visit(`/en/article/${oldEn}`);
  expect(movedEn.status).toBe(301);
  expect(movedEn.location).toContain(`/en/article/${newEn}`);
  expect((await visit(`/artikel/${newId}`)).status).toBe(200);

  // An old address of an older address goes straight to the current one.
  const newest = slug('terbaru');
  await owner.put(`/api/v1/articles/${id}`, { data: articleBody(newest, newEn) });
  expect((await visit(`/artikel/${oldId}`)).location).toContain(`/artikel/${newest}`);
  expect((await visit(`/artikel/${newId}`)).location).toContain(`/artikel/${newest}`);

  // Taking the old slug back ends its redirect and the page answers there again.
  await owner.put(`/api/v1/articles/${id}`, { data: articleBody(oldId, newEn) });
  expect((await visit(`/artikel/${oldId}`)).status).toBe(200);
  expect((await visit(`/artikel/${newest}`)).location).toContain(`/artikel/${oldId}`);

  // A record that is not public leaves its old addresses at 404.
  await owner.put(`/api/v1/articles/${id}`, { data: articleBody(oldId, newEn, 'draft') });
  const hidden = await owner.get(`/api/public/articles/id-ID/${newest}`);
  expect(hidden.status()).toBe(404);
  expect((await hidden.json()).data).toBeUndefined();
  expect((await visit(`/artikel/${newest}`)).status).toBe(404);
});

test('a changed category and product slug move too', async () => {
  const category = await create(
    '/api/v1/product-categories',
    categoryBody(slug('kat-lama'), `${slug('kat-lama')}-en`),
  );
  await owner.put(`/api/v1/product-categories/${category}`, {
    data: categoryBody(slug('kat-baru'), `${slug('kat-lama')}-en`),
  });
  const movedCategory = await visit(`/kategori/${slug('kat-lama')}`);
  expect(movedCategory.status).toBe(301);
  expect(movedCategory.location).toContain(`/kategori/${slug('kat-baru')}`);

  const productBody = (idSlug: string) => ({
    sku: `PINDAH-${runId}`.toUpperCase(),
    status: 'published',
    category_ids: [category],
    translations: [
      { locale: 'id-ID', slug: idSlug, name: 'Produk Pindah' },
      { locale: 'en-US', slug: `${slug('prd-lama')}-en`, name: 'Moved Product' },
    ],
  });
  const product = await create('/api/v1/products', productBody(slug('prd-lama')));
  const update = await owner.put(`/api/v1/products/${product}`, {
    data: productBody(slug('prd-baru')),
  });
  expect(update.status(), await update.text()).toBe(200);
  const movedProduct = await visit(`/produk/${slug('prd-lama')}`);
  expect(movedProduct.status).toBe(301);
  expect(movedProduct.location).toContain(`/produk/${slug('prd-baru')}`);
});

test('a live page wins over a redirect with the same slug', async () => {
  const first = await create('/api/v1/articles', articleBody(slug('rebut'), `${slug('rebut')}-en`));
  await owner.put(`/api/v1/articles/${first}`, {
    data: articleBody(slug('rebut-pindah'), `${slug('rebut')}-en`),
  });
  await create('/api/v1/articles', articleBody(slug('rebut'), `${slug('rebut')}-kedua`));
  expect((await visit(`/artikel/${slug('rebut')}`)).status).toBe(200);
});

test('slug-check says whether a slug is free, ignoring the record itself', async () => {
  const id = await create('/api/v1/articles', articleBody(slug('cek'), `${slug('cek')}-en`));
  const ask = async (query: Record<string, string>) =>
    owner.get('/api/v1/slug-check', { params: { entity: 'article', locale: 'id-ID', ...query } });

  const taken = await ask({ slug: slug('cek') });
  expect(taken.status()).toBe(200);
  expect((await taken.json()).data).toEqual({ slug: slug('cek'), available: false });
  expect((await (await ask({ slug: slug('cek'), id })).json()).data.available).toBe(true);
  // The answer carries the slug as it would be saved.
  const free = await ask({ slug: `  Bebas Sekali ${runId} ` });
  expect((await free.json()).data).toEqual({
    slug: `bebas-sekali-${runId}`,
    available: true,
  });

  expect((await ask({ slug: '' })).status()).toBe(400);
  expect((await ask({ slug: 'x', locale: 'fr-FR' })).status()).toBe(400);
  expect((await ask({ slug: 'x', id: '!!' })).status()).toBe(400);
  expect((await owner.get('/api/v1/slug-check?entity=rahasia&slug=x')).status()).toBe(400);
});
