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
} from './api-contract';

// API contract for FAQ (backend/src/ctrl/admin/faq.ts and the public list in
// backend/src/ctrl/public/faq.ts): validation, unique keys, create/read/update, status, delete,
// what the public site shows, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/faq';
const key = `faq-uji-${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let faqId = '';

const translations = (suffix = '') => [
  { locale: 'id-ID', question: `Pertanyaan uji${suffix}?`, answer: `Jawaban uji${suffix}.` },
  { locale: 'en-US', question: `Test question${suffix}?`, answer: `Test answer${suffix}.` },
];

const publicKeys = async (locale = 'id-ID') =>
  (
    await expectCode(await anonymous.get(`/api/public/faq/${locale}`), 200, 'FAQ_FOUND')
  ).data.items.map((item: any) => item.key);

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('faq-api', ['faq', 'faq_i18n']);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('FAQ endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('list, paging, and sorting', async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200, 'FAQ_LISTED');
  expect(list.data.data.length).toBeGreaterThan(0);
  expect(list.data.pagination).toMatchObject({ current_page: 1, per_page: 15 });
  expect(list.data.data[0]).toMatchObject({ translation_complete: expect.any(Boolean) });

  const sorted = await expectCode(
    await owner.get(base, { params: { field: 'key', sort: 'desc', limit: '2', page: '1' } }),
    200,
  );
  expect(sorted.data.data).toHaveLength(2);
  expect(sorted.data.data[0].key > sorted.data.data[1].key).toBe(true);
  const english = await expectCode(await owner.get(base, { params: { locale: 'en-US' } }), 200);
  expect(english.data.data[0].question).toBeTruthy();
  const capped = await expectCode(await owner.get(base, { params: { limit: '500' } }), 200);
  expect(capped.data.pagination).toMatchObject({ per_page: 100 });
  await expectCode(await owner.get(base, { params: { page: 'x', locale: 'fr-FR' } }), 200);
  // Unknown sort fields fall back to the default order (no 500).
  await expectCode(await owner.get(base, { params: { field: 'toString' } }), 200, 'FAQ_LISTED');
});

test('create validates input and unique keys', async () => {
  const create = (data: Record<string, unknown>) => owner.post(base, { data });
  const valid = { key, sort_order: 5, translations: translations() };
  const invalid: Record<string, unknown>[] = [
    { ...valid, key: '' },
    { ...valid, key: '***' },
    { ...valid, key: 'k'.repeat(101) },
    { ...valid, sort_order: -1 },
    { ...valid, sort_order: 1.5 },
    { ...valid, translations: 'x' },
    { ...valid, translations: translations().slice(1) },
    { ...valid, translations: [translations()[0], translations()[0]] },
    { ...valid, translations: [{ ...translations()[0], locale: 'fr-FR' }, translations()[1]] },
    { ...valid, translations: [{ ...translations()[0], question: ' ' }, translations()[1]] },
    { ...valid, translations: [{ ...translations()[0], answer: '' }, translations()[1]] },
    {
      ...valid,
      translations: [{ ...translations()[0], question: 'Q'.repeat(501) }, translations()[1]],
    },
  ];
  for (const data of invalid) {
    await expectCode(await create(data), 400, 'FAQ_PAYLOAD_INVALID');
  }

  // Keys are normalized: case and spaces become a slug.
  const created = await expectCode(
    await create({ ...valid, key: ` ${key.toUpperCase()} ` }),
    201,
    'FAQ_CREATED',
  );
  faqId = created.data.id;
  await expectCode(await create(valid), 409, 'FAQ_KEY_EXISTS');

  const detail = await expectCode(await owner.get(`${base}/${faqId}`), 200, 'FAQ_FOUND');
  expect(detail.data).toMatchObject({
    id: faqId,
    key,
    sort_order: 5,
    status: 1,
    translations: [
      { locale: 'en-US', question: 'Test question?', status: 1 },
      { locale: 'id-ID', answer: 'Jawaban uji.', status: 1 },
    ],
  });
  const found = await expectCode(await owner.get(base, { params: { search: key } }), 200);
  expect(found.data.pagination).toMatchObject({ total: 1 });
  expect(found.data.data[0]).toMatchObject({ key, translation_complete: true, locale_status: 1 });
  expect(await publicKeys()).toContain(key);
  await expectCode(await owner.get(`${base}/not-a-hash`), 404, 'FAQ_NOT_FOUND');
});

test('update changes the FAQ and its translations', async () => {
  const update = (data: Record<string, unknown>) => owner.put(`${base}/${faqId}`, { data });
  await expectCode(await update({ key }), 400, 'FAQ_PAYLOAD_INVALID');
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: { key, translations: translations() } }),
    404,
    'FAQ_NOT_FOUND',
  );
  const other = await expectCode(await owner.get(base, { params: { field: 'key' } }), 200);
  const otherKey = other.data.data.find((item: any) => item.key !== key).key;
  await expectCode(
    await update({ key: otherKey, translations: translations() }),
    409,
    'FAQ_KEY_EXISTS',
  );

  // An English translation switched off is hidden from the English list only.
  const [indonesian, english] = translations(' ubah');
  await expectCode(
    await update({
      key: `${key}-ubah`,
      sort_order: 2,
      translations: [indonesian, { ...english, status: 0 }],
    }),
    200,
    'FAQ_UPDATED',
  );
  const detail = await expectCode(await owner.get(`${base}/${faqId}`), 200);
  expect(detail.data).toMatchObject({
    key: `${key}-ubah`,
    sort_order: 2,
    translations: [
      { locale: 'en-US', question: 'Test question ubah?', status: 0 },
      { locale: 'id-ID', question: 'Pertanyaan uji ubah?', status: 1 },
    ],
  });
  expect(await publicKeys('id-ID')).toContain(`${key}-ubah`);
  expect(await publicKeys('en-US')).not.toContain(`${key}-ubah`);
});

test('an account without FAQ rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin FAQ', []);
  const account = await createAdminAccount(
    owner,
    'Faq',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.post(base, { data: {} }), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.delete(`${base}/${faqId}`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});

test('status and delete', async () => {
  const status = (value: unknown, id = faqId) =>
    owner.patch(`${base}/${id}/status`, { data: { status: value } });
  await expectCode(await status(5), 400, 'FAQ_STATUS_INVALID');
  await expectCode(await status(0, 'not-a-hash'), 404, 'FAQ_NOT_FOUND');
  const updated = await expectCode(await status('0'), 200, 'FAQ_STATUS_UPDATED');
  expect(updated.data).toBeNull();
  expect(await publicKeys()).not.toContain(`${key}-ubah`);
  await expectCode(await status(1), 200, 'FAQ_STATUS_UPDATED');
  expect(await publicKeys()).toContain(`${key}-ubah`);

  await expectCode(await owner.delete(`${base}/${faqId}`), 200, 'FAQ_DELETED');
  await expectCode(await owner.get(`${base}/${faqId}`), 404, 'FAQ_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${faqId}`), 404, 'FAQ_NOT_FOUND');
  await expectCode(await status(1), 404, 'FAQ_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/not-a-hash`), 404, 'FAQ_NOT_FOUND');
  expect(await publicKeys()).not.toContain(`${key}-ubah`);
  // A deleted FAQ keeps its key reserved.
  await expectCode(
    await owner.post(base, { data: { key: `${key}-ubah`, translations: translations() } }),
    409,
    'FAQ_KEY_EXISTS',
  );
  await expectCode(await anonymous.get('/api/public/faq/fr-FR'), 404, 'FAQ_NOT_FOUND');
});
