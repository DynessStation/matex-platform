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

// API contract for articles (backend/src/ctrl/admin/article.ts and the public list and detail in
// backend/src/ctrl/public/article.ts): validation, unique keys and slugs, media, status, delete,
// what the public site shows, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/articles';
const key = `artikel-uji-${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let articleId = '';
let thumbnail = '';

const translations = (suffix = '') => [
  {
    locale: 'id-ID',
    slug: `artikel-uji-${runId}${suffix}`,
    title: `Artikel Uji${suffix}`,
    excerpt: 'Ringkasan',
    body: '<p>Isi artikel</p>',
    meta_title: 'Meta',
    schema_json: '{"@type":"Article"}',
  },
  {
    locale: 'en-US',
    slug: `test-article-${runId}${suffix}`,
    title: `Test Article${suffix}`,
    body: '<p>Article body</p>',
  },
];

const valid = () => ({ key, status: 'published', translations: translations() });

const publicSlugs = async (locale = 'id-ID') =>
  (
    await expectCode(
      await anonymous.get(`/api/public/articles/${locale}`, { params: { limit: '50' } }),
      200,
    )
  ).data.data.map((item: any) => item.slug);

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('article-api', [
    'article',
    'article_i18n',
    'article_attachment',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('article endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('list, paging, and sorting', async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200, 'ARTICLES_LISTED');
  expect(list.data).toMatchObject({ current_page: 1, per_page: 15 });
  for (const params of [
    { field: 'title', sort: 'asc', limit: '2' },
    { field: 'created_at', paginate: '3', page: '2' },
    { locale: 'en-US', page: 'x', limit: '500' },
  ]) {
    await expectCode(await owner.get(base, { params }), 200);
  }
  const capped = await expectCode(await owner.get(base, { params: { limit: '500' } }), 200);
  expect(capped.data.per_page).toBe(100);
  // Unknown sort fields fall back to the default order (no 500).
  await expectCode(
    await owner.get(base, { params: { field: 'toString' } }),
    200,
    'ARTICLES_LISTED',
  );
});

test('create validates input', async () => {
  thumbnail = await uploadSample(owner, 'media_library');
  const create = (data: Record<string, unknown>) => owner.post(base, { data });
  const [id, en] = translations();
  const invalid: Record<string, unknown>[] = [
    { ...valid(), key: '' },
    { ...valid(), key: 'k'.repeat(121) },
    { ...valid(), status: 'live' },
    { ...valid(), status: 'scheduled' },
    { ...valid(), published_at: '2030-01-02', unpublished_at: '2030-01-01' },
    { ...valid(), thumbnail_id: 'bad' },
    { ...valid(), og_image_id: 'bad' },
    { ...valid(), translations: 'x' },
    { ...valid(), translations: [id] },
    { ...valid(), translations: [id, id] },
    { ...valid(), translations: [{ ...id, locale: 'fr-FR' }, en] },
    { ...valid(), translations: [{ ...id, slug: '' }, en] },
    { ...valid(), translations: [{ ...id, title: ' ' }, en] },
    { ...valid(), translations: [{ ...id, body: '' }, en] },
    { ...valid(), translations: [{ ...id, body: '<script>alert(1)</script>' }, en] },
    { ...valid(), translations: [{ ...id, schema_json: '{bad' }, en] },
  ];
  for (const data of invalid) {
    await expectCode(await create(data), 400, 'ARTICLE_PAYLOAD_INVALID');
  }
  const profilePhoto = await uploadSample(owner, 'admin_profile');
  // Any live attachment of the company can be used (no collection rule).
  const created = await expectCode(
    await create({ ...valid(), thumbnail_id: thumbnail, og_image_id: profilePhoto, is_sticky: 1 }),
    201,
    'ARTICLE_CREATED',
  );
  articleId = created.data.id;
  await expectCode(await create(valid()), 409, 'ARTICLE_CONFLICT');
  await expectCode(
    // Same slugs under another key: refused, and the first article keeps its content (BE-013).
    await create({
      ...valid(),
      key: `${key}-lain`,
      translations: translations().map((item) => ({ ...item, title: 'Penimpa' })),
    }),
    409,
    'ARTICLE_CONFLICT',
  );
  await owner.delete(`/api/v1/attachment/${profilePhoto}`);
});

test('detail, list entry, and the public site', async () => {
  const detail = await expectCode(await owner.get(`${base}/${articleId}`), 200, 'ARTICLE_FOUND');
  expect(detail.data).toMatchObject({
    id: articleId,
    key,
    status: 'published',
    is_featured: false,
    is_sticky: true,
    unpublished_at: null,
    thumbnail: { id_attachment: thumbnail },
    og_image: { id_attachment: expect.any(String) },
    translations: [
      { locale: 'en-US', title: 'Test Article', excerpt: '', meta_title: '', schema_json: '' },
      { locale: 'id-ID', excerpt: 'Ringkasan', schema_json: '{"@type":"Article"}', status: 1 },
    ],
  });
  const found = await expectCode(await owner.get(base, { params: { search: key } }), 200);
  expect(found.data.total).toBe(1);
  expect(found.data.data[0]).toMatchObject({
    key,
    title: 'Artikel Uji',
    blog_thumbnail: { id_attachment: thumbnail },
    is_sticky: true,
  });
  await expectCode(await owner.get(`${base}/not-a-hash`), 404, 'ARTICLE_NOT_FOUND');

  expect(await publicSlugs()).toContain(`artikel-uji-${runId}`);
  const page = await expectCode(
    await anonymous.get(`/api/public/articles/en-US/test-article-${runId}`),
    200,
  );
  expect(page.data).toMatchObject({ title: 'Test Article' });
  await expectCode(await anonymous.get('/api/public/articles/fr-FR'), 404, 'ARTICLES_NOT_FOUND');
  await expectCode(
    await anonymous.get('/api/public/articles/id-ID/no-such-article'),
    404,
    'ARTICLE_NOT_FOUND',
  );
});

test('update replaces content and media', async () => {
  const update = (data: Record<string, unknown>) => owner.put(`${base}/${articleId}`, { data });
  await expectCode(await update({ key }), 400, 'ARTICLE_PAYLOAD_INVALID');
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: valid() }),
    404,
    'ARTICLE_NOT_FOUND',
  );
  await expectCode(
    await update({
      ...valid(),
      thumbnail_id: thumbnail.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')),
    }),
    400,
  );
  const [id, en] = translations(' ubah');
  await expectCode(
    await update({
      ...valid(),
      status: 'draft',
      translations: [id, { ...en, status: 0 }],
    }),
    200,
    'ARTICLE_UPDATED',
  );
  const detail = await expectCode(await owner.get(`${base}/${articleId}`), 200);
  expect(detail.data).toMatchObject({
    status: 'draft',
    is_sticky: false,
    thumbnail: null,
    og_image: null,
    translations: [{ status: 0, title: 'Test Article ubah' }, { title: 'Artikel Uji ubah' }],
  });
  expect(await publicSlugs()).not.toContain(`artikel-uji-${runId}-ubah`);
});

test('status changes', async () => {
  const status = (value: unknown, id = articleId) =>
    owner.patch(`${base}/${id}/status`, { data: { status: value } });
  await expectCode(await status('live'), 400, 'ARTICLE_STATUS_INVALID');
  await expectCode(await status('published', 'not-a-hash'), 400, 'ARTICLE_STATUS_INVALID');
  const updated = await expectCode(await status('published'), 200, 'ARTICLE_STATUS_UPDATED');
  expect(updated.data).toBeNull();
  const detail = await expectCode(await owner.get(`${base}/${articleId}`), 200);
  expect(detail.data.status).toBe('published');
  expect(detail.data.published_at).toBeTruthy();
  expect(await publicSlugs()).toContain(`artikel-uji-${runId}-ubah`);
  await expectCode(await status('archived'), 200, 'ARTICLE_STATUS_UPDATED');
  expect(await publicSlugs()).not.toContain(`artikel-uji-${runId}-ubah`);
});

test('an account without article rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Artikel', []);
  const account = await createAdminAccount(
    owner,
    'Artikel',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.post(base, { data: {} }), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.delete(`${base}/${articleId}`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});

test('delete moves the article to the trash', async () => {
  await expectCode(await owner.delete(`${base}/not-a-hash`), 404, 'ARTICLE_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${articleId}`), 200, 'ARTICLE_DELETED');
  await expectCode(await owner.get(`${base}/${articleId}`), 404, 'ARTICLE_NOT_FOUND');
  // A deleted article can no longer be changed (BE-012).
  await expectCode(await owner.delete(`${base}/${articleId}`), 404, 'ARTICLE_NOT_FOUND');
  await expectCode(
    await owner.patch(`${base}/${articleId}/status`, { data: { status: 'published' } }),
    404,
    'ARTICLE_NOT_FOUND',
  );
  const found = await expectCode(await owner.get(base, { params: { search: key } }), 200);
  expect(found.data.total).toBe(0);
  // Status changes and deletes are audited like every other change.
  const audit = await expectCode(
    await owner.get('/api/v1/audit-log', { params: { module: 'article', search: key } }),
    200,
  );
  expect(audit.data.map((item: any) => item.event_code)).toEqual([
    'article.deleted',
    'article.status_updated',
    'article.status_updated',
    'article.updated',
    'article.created',
  ]);
});
