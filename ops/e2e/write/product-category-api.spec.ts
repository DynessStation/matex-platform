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

// API contract for product categories (backend/src/ctrl/admin/product-category.ts and the public
// list and detail in backend/src/ctrl/public/product-category.ts): validation, unique keys and
// slugs, the parent tree, media, reorder, delete, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/product-categories';
const key = `kategori-uji-${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let parentId = '';
let childId = '';
let image = '';

const translations = (slug: string, name = 'Kategori Uji') => [
  { locale: 'id-ID', slug: `${slug}-id`, name: `${name} ID`, description: 'Keterangan' },
  { locale: 'en-US', slug: `${slug}-en`, name: `${name} EN` },
];

const publicCategories = async (locale = 'id-ID') =>
  (await expectCode(await anonymous.get(`/api/public/product-categories/${locale}`), 200)).data;

const flatten = (items: any[]): any[] =>
  items.flatMap((item) => [item, ...flatten(item.subcategories ?? [])]);

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('product-category-api', [
    'product_category',
    'product_category_i18n',
    'product_category_attachment',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('category endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('create validates input', async () => {
  owner = await login(admin.identity, admin.password);
  image = await uploadSample(owner, 'media_library');
  const create = (data: Record<string, unknown>) => owner.post(base, { data });
  const valid = { key, status: 'published', translations: translations(key) };
  const [id, en] = translations(key);
  const invalid: Record<string, unknown>[] = [
    { ...valid, key: '' },
    { ...valid, key: 'k'.repeat(121) },
    { ...valid, status: 'scheduled' },
    { ...valid, parent_id: 'bad' },
    { ...valid, image_id: 'bad' },
    { ...valid, icon_id: 'bad' },
    { ...valid, og_image_id: 'bad' },
    { ...valid, translations: 'x' },
    { ...valid, translations: [id] },
    { ...valid, translations: [id, id] },
    { ...valid, translations: [{ ...id, locale: 'fr-FR' }, en] },
    { ...valid, translations: [{ ...id, slug: '' }, en] },
    { ...valid, translations: [{ ...id, name: ' ' }, en] },
  ];
  for (const data of invalid) {
    await expectCode(await create(data), 400, 'PRODUCT_CATEGORY_PAYLOAD_INVALID');
  }

  const parent = await expectCode(
    // sort_order is ignored: a new category goes last on its level.
    await create({ ...valid, image_id: image, icon_id: image, sort_order: 1, is_featured: 1 }),
    201,
    'PRODUCT_CATEGORY_CREATED',
  );
  parentId = parent.data.id;
  await expectCode(await create(valid), 409, 'PRODUCT_CATEGORY_CONFLICT');
  // Same slugs under another key: refused, and the first category keeps its content (BE-013).
  await expectCode(
    await create({ ...valid, key: `${key}-lain`, translations: translations(key, 'Penimpa') }),
    409,
    'PRODUCT_CATEGORY_CONFLICT',
  );
  await expectCode(
    await create({
      ...valid,
      key: `${key}-x`,
      translations: translations(`${key}-x`),
      parent_id: parentId.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')),
    }),
    400,
  );

  const child = await expectCode(
    await create({
      key: `${key}-anak`,
      status: 'published',
      parent_id: parentId,
      translations: translations(`${key}-anak`, 'Anak'),
    }),
    201,
  );
  childId = child.data.id;
});

test('list tree, detail, and the public site', async () => {
  const list = await expectCode(
    await owner.get(base, { params: { search: key } }),
    200,
    'PRODUCT_CATEGORIES_LISTED',
  );
  expect(list.data.total).toBe(2);
  expect(list.data.data).toHaveLength(1);
  expect(list.data.data[0]).toMatchObject({
    id: parentId,
    key,
    name: 'Kategori Uji ID',
    type: 'product',
    is_featured: true,
    category_image: { id_attachment: image },
    category_icon: { id_attachment: image },
    subcategories: [{ id: childId, parent_id: parentId, name: 'Anak ID', category_image: null }],
  });
  const english = await expectCode(
    await owner.get(base, { params: { search: key, locale: 'en-US' } }),
    200,
  );
  expect(english.data.data[0].name).toBe('Kategori Uji EN');

  const detail = await expectCode(
    await owner.get(`${base}/${parentId}`),
    200,
    'PRODUCT_CATEGORY_FOUND',
  );
  expect(detail.data.position).toBe(detail.data.position_total);
  expect(detail.data.sort_order).toBe(detail.data.position_total);
  const childDetail = await expectCode(await owner.get(`${base}/${childId}`), 200);
  expect(childDetail.data).toMatchObject({ sort_order: 1, position: 1, position_total: 1 });
  expect(detail.data).toMatchObject({
    id: parentId,
    parent_id: null,
    status: 'published',
    category_meta_image: null,
    translations: [
      { locale: 'en-US', name: 'Kategori Uji EN', description: '', meta_title: '' },
      { locale: 'id-ID', description: 'Keterangan', status: 1 },
    ],
  });
  await expectCode(await owner.get(`${base}/not-a-hash`), 404, 'PRODUCT_CATEGORY_NOT_FOUND');

  const shown = flatten((await publicCategories()).data).map((item: any) => item.key);
  expect(shown).toEqual(expect.arrayContaining([key, `${key}-anak`]));
  await expectCode(await anonymous.get(`/api/public/product-categories/en-US/${key}-en`), 200);
  await expectCode(
    await anonymous.get('/api/public/product-categories/fr-FR'),
    404,
    'PRODUCT_CATEGORIES_NOT_FOUND',
  );
  await expectCode(
    await anonymous.get('/api/public/product-categories/id-ID/no-such-category'),
    404,
    'PRODUCT_CATEGORY_NOT_FOUND',
  );
});

test('update guards the parent tree', async () => {
  const update = (id: string, data: Record<string, unknown>) =>
    owner.put(`${base}/${id}`, { data });
  const parentBody = { key, status: 'published', translations: translations(key) };
  await expectCode(
    await update(parentId, { ...parentBody, parent_id: parentId }),
    400,
    'PRODUCT_CATEGORY_PARENT_INVALID',
  );
  await expectCode(
    await update(parentId, { ...parentBody, parent_id: childId }),
    400,
    'PRODUCT_CATEGORY_PARENT_INVALID',
  );
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: parentBody }),
    404,
    'PRODUCT_CATEGORY_NOT_FOUND',
  );
  // A draft category and a switched-off translation are hidden from the public site.
  const [id, en] = translations(key, 'Kategori Ubah');
  await expectCode(
    await update(parentId, {
      ...parentBody,
      status: 'draft',
      translations: [id, { ...en, status: 0 }],
    }),
    200,
    'PRODUCT_CATEGORY_UPDATED',
  );
  const detail = await expectCode(await owner.get(`${base}/${parentId}`), 200);
  // Saved under the same parent, the category keeps its place.
  expect(detail.data.position).toBe(detail.data.position_total);
  expect(detail.data).toMatchObject({
    status: 'draft',
    is_featured: false,
    category_image: null,
    translations: [{ name: 'Kategori Ubah EN', status: 0 }, { name: 'Kategori Ubah ID' }],
  });
  const shown = flatten((await publicCategories()).data).map((item: any) => item.key);
  expect(shown).not.toContain(key);
});

test('reorder one level; moved and deleted categories keep each level 1..n', async () => {
  const reorder = (items: unknown) => owner.patch(`${base}/reorder`, { data: { items } });
  await expectCode(await reorder([]), 400, 'PRODUCT_CATEGORY_ORDER_INVALID');
  await expectCode(
    await reorder([{ id: 'bad', sort_order: 1 }]),
    400,
    'PRODUCT_CATEGORY_ORDER_INVALID',
  );
  await expectCode(
    await reorder([
      { id: parentId, sort_order: 1 },
      { id: parentId, sort_order: 2 },
    ]),
    400,
    'PRODUCT_CATEGORY_ORDER_DUPLICATE',
  );
  const position = async (id: string) =>
    (await expectCode(await owner.get(`${base}/${id}`), 200)).data;

  // A second child goes last under the parent.
  const secondBody = {
    key: `${key}-anak-dua`,
    status: 'published',
    parent_id: parentId,
    translations: translations(`${key}-anak-dua`, 'Anak Dua'),
  };
  const second = (await expectCode(await owner.post(base, { data: secondBody }), 201)).data.id;
  expect(await position(second)).toMatchObject({ position: 2, position_total: 2 });

  // The tree sends the level as 0..n-1 (or any rising numbers); the server stores 1..n.
  await expectCode(
    await reorder([
      { id: second, sort_order: 0 },
      { id: childId, sort_order: 7 },
    ]),
    200,
    'PRODUCT_CATEGORY_REORDERED',
  );
  expect(await position(second)).toMatchObject({ sort_order: 1, position: 1 });
  expect(await position(childId)).toMatchObject({ sort_order: 2, position: 2 });

  // Moved to the top level it goes last there, and the old level closes the gap.
  await expectCode(
    await owner.put(`${base}/${second}`, { data: { ...secondBody, parent_id: null } }),
    200,
  );
  const moved = await position(second);
  expect(moved.position).toBe(moved.position_total);
  expect(await position(childId)).toMatchObject({ sort_order: 1, position: 1, position_total: 1 });

  const topBefore = moved.position_total;
  await expectCode(await owner.delete(`${base}/${second}`), 200, 'PRODUCT_CATEGORY_DELETED');
  expect((await position(parentId)).position_total).toBe(topBefore - 1);
});

test('categories that hold products', async () => {
  const childBody = {
    key: `${key}-anak`,
    status: 'published',
    parent_id: parentId,
    translations: translations(`${key}-anak`, 'Anak'),
  };
  const product = await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        key: `produk-kategori-${runId}`,
        sku: `SKU-KAT-${runId}`.toUpperCase(),
        status: 'draft',
        category_ids: [childId],
        translations: [
          { locale: 'id-ID', slug: `produk-kategori-${runId}`, name: 'Produk Kategori' },
          { locale: 'en-US', slug: `category-product-${runId}`, name: 'Category Product' },
        ],
      },
    }),
    201,
  );

  // The list shows how many products each category holds (D-2).
  const list = await expectCode(await owner.get(base, { params: { search: key } }), 200);
  expect(list.data.data[0]).toMatchObject({
    id: parentId,
    product_count: 0,
    subcategories: [{ id: childId, product_count: 1 }],
  });

  // A category with products cannot be switched off or deleted (D-1).
  for (const status of ['draft', 'archived']) {
    const refused = await expectCode(
      await owner.put(`${base}/${childId}`, { data: { ...childBody, status } }),
      409,
      'PRODUCT_CATEGORY_HAS_PRODUCTS',
    );
    expect(refused.data).toEqual({ products: 1 });
  }
  await expectCode(await owner.delete(`${base}/${childId}`), 409, 'PRODUCT_CATEGORY_HAS_PRODUCTS');
  // Other changes stay possible.
  await expectCode(
    await owner.put(`${base}/${childId}`, { data: { ...childBody, image_id: image } }),
    200,
  );

  // Deleted products do not count.
  await expectCode(await owner.delete(`/api/v1/products/${product.data.id}`), 200);
  await expectCode(
    await owner.put(`${base}/${childId}`, {
      data: { ...childBody, image_id: image, status: 'draft' },
    }),
    200,
    'PRODUCT_CATEGORY_UPDATED',
  );
});

test('an account without category rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Kategori', []);
  const account = await createAdminAccount(
    owner,
    'Kategori',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.post(base, { data: {} }), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.delete(`${base}/${childId}`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});

test('delete', async () => {
  await expectCode(await owner.delete(`${base}/not-a-hash`), 404, 'PRODUCT_CATEGORY_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${parentId}`), 409, 'PRODUCT_CATEGORY_HAS_CHILDREN');
  await expectCode(await owner.delete(`${base}/${childId}`), 200, 'PRODUCT_CATEGORY_DELETED');
  await expectCode(await owner.get(`${base}/${childId}`), 404, 'PRODUCT_CATEGORY_NOT_FOUND');
  // A deleted category can no longer be deleted again (BE-012).
  await expectCode(await owner.delete(`${base}/${childId}`), 404, 'PRODUCT_CATEGORY_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${parentId}`), 200, 'PRODUCT_CATEGORY_DELETED');
  // A deleted category no longer holds its media, so the image can be deleted.
  await expectCode(await owner.delete(`/api/v1/attachment/${image}`), 200, 'ATTACHMENT_DELETED');
  const list = await expectCode(await owner.get(base, { params: { search: key } }), 200);
  expect(list.data.total).toBe(0);
  const audit = await expectCode(
    await owner.get('/api/v1/audit-log', {
      params: { module: 'product_category', event_code: 'product_category.deleted' },
    }),
    200,
  );
  // The two here and the second child deleted in the reorder test.
  expect(audit.data).toHaveLength(3);
});
