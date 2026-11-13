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

// API contract of English that follows Indonesian (backend/src/ctrl/admin/content-english.ts):
// translation for the content an account may write, titles included, and the remembered source
// of each English field. The provider is write/fake-ai-server.mjs.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/content-english';
let anonymous: APIRequestContext;
let owner: APIRequestContext;
let faqWriter: APIRequestContext;

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  const account = await createAdminAccount(
    owner,
    'TulisFaqEn',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Tulis FAQ EN ${runId}`, [
        'faq.view',
        'faq.update',
      ]),
    }),
  );
  faqWriter = await login(account.identity, account.password);
});

test.afterAll(async () => {
  await saveRecording('content-english-api', ['content_en_source']);
  await anonymous?.dispose();
  await owner?.dispose();
  await faqWriter?.dispose();
});

const translate = (context: APIRequestContext, data: Record<string, unknown>) =>
  context.post(`${base}/translate`, { data });

test('translation needs a session and the right to write that content', async () => {
  await expectCode(await translate(anonymous, {}), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(
    await translate(owner, {
      content_type: 'kasur',
      fields: { a: 'x' },
      field_types: { a: 'plain_text' },
    }),
    400,
    'CONTENT_ENGLISH_TYPE_INVALID',
  );
  // FAQ writers translate FAQ, without the assistant permission, but not products.
  await expectCode(
    await translate(faqWriter, {
      content_type: 'faq',
      fields: { question: 'Apa itu lateks?' },
      field_types: { question: 'plain_text' },
    }),
    200,
  );
  await expectCode(
    await translate(faqWriter, {
      content_type: 'product',
      fields: { name: 'Kasur' },
      field_types: { name: 'plain_text' },
    }),
    403,
    'AUTH_PERMISSION_DENIED',
  );
  await expectCode(await faqWriter.get(`${base}/product/abc`), 403, 'AUTH_PERMISSION_DENIED');
});

test('titles and long text are translated; a failed provider is reported', async () => {
  const done = await expectCode(
    await translate(owner, {
      content_type: 'product',
      fields: {
        name: 'Kasur Lateks',
        description: '<p>Empuk dan awet</p>',
        keywords: 'kasur, lateks',
      },
      field_types: { name: 'plain_text', description: 'rich_text_html', keywords: 'keyword_list' },
    }),
    200,
    'CONTENT_ENGLISH_TRANSLATED',
  );
  expect(done.data.fields).toEqual({
    name: 'EN Kasur Lateks',
    description: '<p>EN Empuk dan awet</p>',
    keywords: 'EN kasur, lateks',
  });
  await expectCode(
    await translate(owner, {
      content_type: 'product',
      fields: { name: 'GAGAL-TERJEMAH' },
      field_types: { name: 'plain_text' },
    }),
    502,
    'CONTENT_ASSISTANT_PROVIDER_FAILED',
  );
  await expectCode(
    await translate(owner, { content_type: 'product', fields: {}, field_types: {} }),
    400,
    'CONTENT_ENGLISH_PAYLOAD_INVALID',
  );
  const tooMany = Object.fromEntries(Array.from({ length: 61 }, (_, i) => [`f${i}`, 'x']));
  await expectCode(
    await translate(owner, {
      content_type: 'product',
      fields: tooMany,
      field_types: Object.fromEntries(Object.keys(tooMany).map((key) => [key, 'plain_text'])),
    }),
    400,
    'CONTENT_ENGLISH_PAYLOAD_INVALID',
  );
});

test('the one-button assistant still leaves titles to people', async () => {
  await expectCode(
    await owner.post('/api/v1/content-assistant', {
      data: { mode: 'translate', fields: { title: 'Judul' }, field_types: { title: 'plain_text' } },
    }),
    400,
    'CONTENT_ASSISTANT_FIELD_PROTECTED',
  );
  const done = await expectCode(
    await owner.post('/api/v1/content-assistant', {
      data: { mode: 'translate', fields: { body: 'Isi' }, field_types: { body: 'plain_text' } },
    }),
    200,
  );
  expect(done.data.fields.body).toBe('EN Isi');
});

test('the source of each English field is remembered per record', async () => {
  const ref = `faq${runId}`;
  const empty = await expectCode(await owner.get(`${base}/faq/${ref}`), 200);
  expect(empty.data.sources).toEqual({});
  await expectCode(await owner.get(`${base}/faq/bad%20ref`), 400, 'CONTENT_ENGLISH_REF_INVALID');
  for (const sources of [{ question: 'robot' }, { 'bad key!': 'auto' }, 'auto']) {
    await expectCode(
      await owner.put(`${base}/faq/${ref}`, { data: { sources } }),
      400,
      'CONTENT_ENGLISH_SOURCES_INVALID',
    );
  }
  await expectCode(
    await faqWriter.put(`${base}/faq/${ref}`, {
      data: { sources: { question: 'auto', answer: 'manual', 'items.0.title': 'copy' } },
    }),
    200,
    'CONTENT_ENGLISH_SAVED',
  );
  const saved = await expectCode(await faqWriter.get(`${base}/faq/${ref}`), 200);
  expect(saved.data.sources).toEqual({
    question: 'auto',
    answer: 'manual',
    'items.0.title': 'copy',
  });
  // A save replaces the set.
  await expectCode(
    await owner.put(`${base}/faq/${ref}`, { data: { sources: { question: 'manual' } } }),
    200,
  );
  const replaced = await expectCode(await owner.get(`${base}/faq/${ref}`), 200);
  expect(replaced.data.sources).toEqual({ question: 'manual' });
  // Another type with the same ref is another record.
  const other = await expectCode(await owner.get(`${base}/product/${ref}`), 200);
  expect(other.data.sources).toEqual({});
});
