import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  adminReferences,
  apiContext,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
  runId,
  saveRecording,
  uploadSample,
} from './api-contract';

// API contract for products (backend/src/ctrl/admin/product.ts and the public list and detail in
// backend/src/ctrl/public/product.ts): validation of the whole product body (translations,
// categories, media, prices, marketplaces), unique key, SKU, and slugs, status, delete, what
// the public site shows, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/products';
const key = `produk-uji-${runId}`;
const sku = `SKU-${runId}`.toUpperCase();

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let categoryId = '';
let productId = '';
let image = '';
let video = '';

const translations = (slug = key, name = 'Produk Uji') => [
  { locale: 'id-ID', slug: `${slug}-id`, name: `${name} ID`, short_description: 'Singkat' },
  { locale: 'en-US', slug: `${slug}-en`, name: `${name} EN`, specifications: { bahan: 'lateks' } },
];

const prices = [
  { type: 'end_user', currency: 'IDR', amount: 150000, is_public: true },
  { type: 'end_user', currency: 'USD', amount: 10, is_public: true },
  { type: 'wholesale', currency: 'IDR', amount: 120000, is_public: true, min_qty: 10 },
];

const valid = () => ({
  key,
  sku,
  status: 'published',
  category_ids: [categoryId],
  translations: translations(),
});

const publicSlugs = async (locale = 'id-ID') =>
  (
    await expectCode(
      await anonymous.get(`/api/public/products/${locale}`, { params: { search: sku } }),
      200,
    )
  ).data.data.map((item: any) => item.slug);

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('product-api', [
    'product_catalog',
    'product_catalog_i18n',
    'product_catalog_category',
    'product_catalog_attachment',
    'product_catalog_price',
    'product_catalog_marketplace',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('product endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('list, paging, and sorting', async () => {
  owner = await login(admin.identity, admin.password);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `kategori-produk-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `kategori-produk-${runId}`, name: 'Kategori Produk' },
          { locale: 'en-US', slug: `product-category-${runId}`, name: 'Product Category' },
        ],
      },
    }),
    201,
  );
  categoryId = category.data.id;

  const list = await expectCode(await owner.get(base), 200, 'PRODUCTS_LISTED');
  expect(list.data).toMatchObject({ current_page: 1, per_page: 15 });
  for (const params of [
    { field: 'name', sort: 'desc', paginate: '2' },
    { field: 'sku', page: '2' },
    { locale: 'en-US', page: 'x', paginate: '500' },
  ]) {
    await expectCode(await owner.get(base, { params }), 200);
  }
  // Unknown sort fields fall back to the default order (no 500).
  await expectCode(
    await owner.get(base, { params: { field: 'toString' } }),
    200,
    'PRODUCTS_LISTED',
  );
});

test('create validates the product body', async () => {
  image = await uploadSample(owner, 'product_media');
  const mp4 = Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]),
    Buffer.from('ftypmp42', 'latin1'),
    Buffer.alloc(64),
  ]);
  const form = new FormData();
  form.append('collection', 'product_media');
  form.append('files', new Blob([new Uint8Array(mp4)], { type: 'video/mp4' }), 'video.mp4');
  video = (await expectCode(await owner.post('/api/v1/attachment', { multipart: form }), 201))
    .data[0].id_attachment;

  const create = (data: Record<string, unknown>) => owner.post(base, { data });
  const [id, en] = translations();
  const media = (items: Record<string, unknown>[]) => ({ ...valid(), media: items });
  const invalid: Record<string, unknown>[] = [
    { ...valid(), key: '' },
    { ...valid(), sku: '' },
    { ...valid(), status: 'live' },
    { ...valid(), product_type: 'food' },
    { ...valid(), stock_status: 'plenty' },
    { ...valid(), price_visibility: 'secret' },
    { ...valid(), category_ids: [] },
    { ...valid(), category_ids: ['bad'] },
    { ...valid(), translations: [id] },
    { ...valid(), translations: [{ ...id, name: '' }, en] },
    media([{ id: 'bad', role: 'gallery' }]),
    media([{ id: image, role: 'banner' }]),
    media([
      { id: image, role: 'thumbnail' },
      { id: image, role: 'thumbnail', sort_order: 1 },
    ]),
    media([
      { id: image, role: 'gallery', sort_order: 0 },
      { id: video, role: 'gallery', sort_order: 0 },
    ]),
    media(Array.from({ length: 11 }, (_, i) => ({ id: image, role: 'gallery', sort_order: i }))),
    { ...valid(), prices: [{ type: 'retail', amount: 1 }] },
    { ...valid(), prices: [{ type: 'end_user', amount: -1 }] },
    { ...valid(), prices: [{ type: 'end_user', amount: 1, currency: 'EUR' }] },
    { ...valid(), prices: [prices[0], prices[0]] },
    // Displayed prices need an active public end-user price in both currencies.
    { ...valid(), price_visibility: 'displayed', prices: [prices[0]] },
    { ...valid(), marketplaces: [{ provider: '', url: 'https://x.id' }] },
    { ...valid(), marketplaces: [{ provider: 'tokopedia', url: 'ftp://x.id' }] },
    {
      ...valid(),
      marketplaces: [
        { provider: 'a', url: 'https://a.id', is_primary: true },
        { provider: 'b', url: 'https://b.id', is_primary: true },
      ],
    },
    { ...valid(), weight_grams: -1 },
    { ...valid(), min_order_qty: 0 },
  ];
  for (const data of invalid) {
    await expectCode(await create(data), 400, 'PRODUCT_PAYLOAD_INVALID');
  }
  await expectCode(
    await create({ ...valid(), media: [{ id: video, role: 'thumbnail' }] }),
    400,
    'PRODUCT_MEDIA_TYPE_INVALID',
  );
  const profilePhoto = await uploadSample(owner, 'admin_profile');
  await expectCode(
    await create({
      ...valid(),
      media: [{ id: profilePhoto.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), role: 'og' }],
    }),
    400,
  );

  const created = await expectCode(
    await create({
      ...valid(),
      price_visibility: 'displayed',
      prices,
      media: [
        { id: image, role: 'thumbnail' },
        { id: image, role: 'gallery', sort_order: 0 },
        { id: video, role: 'gallery', sort_order: 1 },
      ],
      marketplaces: [
        { provider: 'tokopedia', url: 'https://tokopedia.com/matex', price: 149000 },
        {
          provider: 'shopee',
          url: 'https://shopee.co.id/matex',
          is_active: false,
          is_primary: true,
        },
      ],
      weight_grams: 1200,
      is_featured: true,
    }),
    201,
    'PRODUCT_CREATED',
  );
  productId = created.data.id;

  const duplicate = await expectCode(await create(valid()), 409, 'PRODUCT_KEY_EXISTS');
  expect(duplicate.data).toEqual({ field: 'key' });
  const sameSku = await expectCode(
    await create({ ...valid(), key: `${key}-lain` }),
    409,
    'PRODUCT_SKU_EXISTS',
  );
  expect(sameSku.data).toEqual({ field: 'sku' });
  const sameSlug = await expectCode(
    await create({ ...valid(), key: `${key}-lain`, sku: `${sku}-2` }),
    409,
    'PRODUCT_SLUG_EXISTS',
  );
  expect(sameSlug.data).toEqual({ field: 'slug', locale: 'id-ID' });
});

test('detail, list entry, and the public site', async () => {
  const detail = await expectCode(await owner.get(`${base}/${productId}`), 200, 'PRODUCT_FOUND');
  expect(detail.data).toMatchObject({
    id: productId,
    key,
    sku,
    status: 'published',
    price_visibility: 'displayed',
    price: 150000,
    is_featured: true,
    product_thumbnail: { id_attachment: image, role: 'thumbnail' },
    product_galleries: [{ sort_order: 0 }, { id_attachment: video, sort_order: 1 }],
    categories: [{ id: categoryId, name: 'Kategori Produk' }],
    prices: [
      { type: 'end_user', currency: 'IDR', is_public: true },
      { type: 'end_user', currency: 'USD' },
      // Only end-user prices can be public.
      { type: 'wholesale', is_public: false, min_qty: 10 },
    ],
    // The first active marketplace becomes primary; an inactive one cannot be.
    marketplaces: [
      { provider: 'tokopedia', is_primary: true, price: 149000 },
      { provider: 'shopee', is_primary: false, is_active: false },
    ],
    translations: [
      { locale: 'en-US', name: 'Produk Uji EN', specifications: { bahan: 'lateks' } },
      { locale: 'id-ID', short_description: 'Singkat', status: 1 },
    ],
  });
  const found = await expectCode(await owner.get(base, { params: { search: sku } }), 200);
  expect(found.data.total).toBe(1);
  expect(found.data.data[0]).toMatchObject({ key, name: 'Produk Uji ID', quantity: 0 });
  await expectCode(await owner.get(`${base}/not-a-hash`), 404, 'PRODUCT_NOT_FOUND');
  // The list can be narrowed to one category (D-6).
  const inCategory = await expectCode(
    await owner.get(base, { params: { category: categoryId } }),
    200,
  );
  expect(inCategory.data.data.map((item: any) => item.id)).toEqual([productId]);
  expect(inCategory.data.total).toBe(1);
  expect(inCategory.data.total_all).toBeGreaterThanOrEqual(1);
  await expectCode(
    await owner.get(base, { params: { category: 'bad' } }),
    400,
    'PRODUCT_LIST_CATEGORY_INVALID',
  );
  const everything = await expectCode(await owner.get(base, { params: { category: '' } }), 200);
  expect(everything.data.total).toBe(everything.data.total_all);

  expect(await publicSlugs()).toContain(`${key}-id`);
  const page = await expectCode(await anonymous.get(`/api/public/products/en-US/${key}-en`), 200);
  expect(page.data).toMatchObject({ name: 'Produk Uji EN' });
  await expectCode(await anonymous.get('/api/public/products/fr-FR'), 404, 'PRODUCTS_NOT_FOUND');
  await expectCode(
    await anonymous.get('/api/public/products/id-ID/no-such-product'),
    404,
    'PRODUCT_NOT_FOUND',
  );
});

test('update replaces the whole product', async () => {
  const update = (data: Record<string, unknown>) => owner.put(`${base}/${productId}`, { data });
  await expectCode(await update({ key }), 400, 'PRODUCT_PAYLOAD_INVALID');
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: valid() }),
    404,
    'PRODUCT_NOT_FOUND',
  );
  // Its own key, SKU, and slugs do not count as taken.
  await expectCode(
    await update({ ...valid(), status: 'draft', translations: translations(key, 'Produk Ubah') }),
    200,
    'PRODUCT_UPDATED',
  );
  const detail = await expectCode(await owner.get(`${base}/${productId}`), 200);
  expect(detail.data).toMatchObject({
    status: 'draft',
    price_visibility: 'contact',
    product_thumbnail: null,
    media: [],
    prices: [],
    marketplaces: [],
    // The detail carries names in translations; its own name is the key.
    name: key,
    translations: [{ name: 'Produk Ubah EN' }, { name: 'Produk Ubah ID' }],
  });
  expect(await publicSlugs()).not.toContain(`${key}-id`);
});

test('status changes', async () => {
  const status = (value: unknown, id = productId) =>
    owner.patch(`${base}/${id}/status`, { data: { status: value } });
  await expectCode(await status('live'), 400, 'PRODUCT_STATUS_INVALID');
  await expectCode(await status('published', 'not-a-hash'), 400, 'PRODUCT_STATUS_INVALID');
  const updated = await expectCode(await status('published'), 200, 'PRODUCT_STATUS_UPDATED');
  expect(updated.data).toBeNull();
  expect(await publicSlugs()).toContain(`${key}-id`);
});

test('the public catalog lists products by their Urutan first, then newest', async () => {
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `urutan-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `urutan-${runId}`, name: 'Kategori Urutan' },
          { locale: 'en-US', slug: `order-${runId}`, name: 'Order Category' },
        ],
      },
    }),
    201,
  );
  // Created in this order; Urutan 0 means "no position".
  for (const [name, sortOrder] of [
    ['a', 0],
    ['b', 2],
    ['c', 0],
    ['d', 1],
  ] as const) {
    await expectCode(
      await owner.post(base, {
        data: {
          key: `urutan-${name}-${runId}`,
          sku: `URT-${name}-${runId}`.toUpperCase(),
          status: 'published',
          sort_order: sortOrder,
          category_ids: [category.data.id],
          translations: translations(`urutan-${name}-${runId}`, `Urutan ${name}`),
        },
      }),
      201,
    );
  }
  const list = await expectCode(
    await anonymous.get('/api/public/products/id-ID', { params: { category: `urutan-${runId}` } }),
    200,
  );
  expect(list.data.data.map((item: any) => item.slug)).toEqual(
    ['d', 'b', 'c', 'a'].map((name) => `urutan-${name}-${runId}-id`),
  );
});

test('an account without product rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Produk', []);
  const account = await createAdminAccount(
    owner,
    'Produk',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.post(base, { data: {} }), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.delete(`${base}/${productId}`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});

test('delete archives the product', async () => {
  await expectCode(await owner.delete(`${base}/not-a-hash`), 404, 'PRODUCT_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${productId}`), 200, 'PRODUCT_DELETED');
  await expectCode(await owner.get(`${base}/${productId}`), 404, 'PRODUCT_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${productId}`), 404, 'PRODUCT_NOT_FOUND');
  await expectCode(
    await owner.patch(`${base}/${productId}/status`, { data: { status: 'draft' } }),
    404,
    'PRODUCT_NOT_FOUND',
  );
  expect(await publicSlugs()).not.toContain(`${key}-id`);
  // A deleted product keeps its slugs reserved.
  await expectCode(
    await owner.post(base, { data: { ...valid(), key: `${key}-baru`, sku: `${sku}-B` } }),
    409,
    'PRODUCT_SLUG_EXISTS',
  );
  // Status changes and deletes are audited like every other change.
  const audit = await expectCode(
    await owner.get('/api/v1/audit-log', { params: { module: 'product', search: sku } }),
    200,
  );
  expect(audit.data.map((item: any) => item.event_code)).toEqual([
    'product.deleted',
    'product.status_updated',
    'product.updated',
    'product.created',
  ]);
});
