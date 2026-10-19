import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  adminReferences,
  apiContext,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
  saveRecording,
  uploadSample,
} from './api-contract';

// API contract for the fixed website pages (backend/src/ctrl/admin/website-page.ts): detail,
// save validation (publication, translations, structured content, media and banner actions),
// a full save, and permission checks. Pages are saved back as they were at the end.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/website-page';

let anonymous: APIRequestContext;
let owner: APIRequestContext;
const original: Record<string, any> = {};

/** The save body (PUT) for a page detail (GET). */
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

const detail = async (key: string) =>
  (await expectCode(await owner.get(`${base}/${key}`), 200, 'WEBSITE_PAGE_DETAIL_FETCHED')).data;

const save = (key: string, data: unknown) => owner.put(`${base}/${key}`, { data });

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  // Only terms is saved successfully above.
  if (owner && original.terms) {
    await expectCode(await save('terms', payloadFrom(original.terms)), 200, 'WEBSITE_PAGE_UPDATED');
  }
  await saveRecording('website-page-api', [
    'website_page',
    'website_page_i18n',
    'website_page_media',
    'website_page_media_i18n',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('website page endpoints require a session', async () => {
  await expectCode(await anonymous.get(`${base}/terms`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.put(`${base}/terms`, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('detail of each fixed page', async () => {
  owner = await login(admin.identity, admin.password);
  for (const key of ['home', 'about', 'contact', 'faq', 'terms', 'career']) {
    original[key] = await detail(key);
    expect(original[key]).toMatchObject({ key, default_locale: 'id-ID' });
    expect(original[key].translations.map((item: any) => item.locale)).toEqual(['en-US', 'id-ID']);
  }
  expect(original.terms.translations[1]).toMatchObject({
    path: 'syarat-ketentuan',
    seo: expect.any(Object),
  });
  // Keys are matched case-insensitively; anything else is not a fixed page.
  expect((await detail('TERMS')).key).toBe('terms');
  await expectCode(await owner.get(`${base}/blog`), 404, 'WEBSITE_PAGE_NOT_FOUND');
  await expectCode(await owner.put(`${base}/blog`, { data: {} }), 404, 'WEBSITE_PAGE_NOT_FOUND');
});

test('save validates publication and translations', async () => {
  const valid = payloadFrom(original.terms);
  const translation = (index: number, changes: Record<string, unknown>) => ({
    ...valid,
    translations: valid.translations.map((item: any, i: number) =>
      i === index ? { ...item, ...changes } : item,
    ),
  });
  const cases: [unknown, string][] = [
    [[], 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [{ ...valid, is_published: 'yes' }, 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [{ ...valid, publish_at: 'tomorrow' }, 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [{ ...valid, publish_at: 5 }, 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [
      { ...valid, publish_at: '2030-01-02T00:00:00Z', unpublish_at: '2030-01-01T00:00:00Z' },
      'WEBSITE_PAGE_PUBLICATION_WINDOW_INVALID',
    ],
    [{ ...valid, translations: valid.translations.slice(1) }, 'WEBSITE_PAGE_TRANSLATIONS_REQUIRED'],
    [translation(0, { locale: 'id-ID' }), 'WEBSITE_PAGE_TRANSLATIONS_INVALID'],
    [translation(0, { locale: 'fr-FR' }), 'WEBSITE_PAGE_TRANSLATIONS_INVALID'],
    [translation(0, { title: ' ' }), 'WEBSITE_PAGE_TRANSLATIONS_INVALID'],
    [translation(0, { title: 'T'.repeat(256) }), 'WEBSITE_PAGE_TRANSLATIONS_INVALID'],
    [translation(0, { is_published: 1 }), 'WEBSITE_PAGE_TRANSLATIONS_INVALID'],
    [
      translation(0, { seo: { canonical_url: 'ftp://example.com' } }),
      'WEBSITE_PAGE_TRANSLATIONS_INVALID',
    ],
    [translation(0, { seo: { title: 'S'.repeat(256) } }), 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [translation(0, { seo: { schema: [1] } }), 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [translation(0, { content: 'text' }), 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [translation(0, { summary: 5 }), 'WEBSITE_PAGE_PAYLOAD_INVALID'],
    [translation(1, { is_published: false }), 'WEBSITE_PAGE_DEFAULT_TRANSLATION_REQUIRED'],
    [{ ...valid, media: 'none' }, 'WEBSITE_PAGE_MEDIA_INVALID'],
  ];
  for (const [data, code] of cases) {
    await expectCode(await save('terms', data), 400, code);
  }
});

test('save validates structured content of home and about', async () => {
  const home = payloadFrom(original.home);
  const withContent = (page: any, content: unknown) => ({
    ...page,
    translations: page.translations.map((item: any) => ({ ...item, content })),
  });
  await expectCode(
    await save('home', withContent(home, { home_contract_version: 1 })),
    400,
    'WEBSITE_HOME_CONTENT_INVALID',
  );
  const content = home.translations[0].content;
  await expectCode(
    await save('home', withContent(home, { ...content, newsletter: { status: 'on' } })),
    400,
    'WEBSITE_HOME_CONTENT_INVALID',
  );
  // A published home page needs all its images.
  await expectCode(await save('home', { ...home, media: [] }), 400, 'WEBSITE_PAGE_MEDIA_REQUIRED');

  const about = payloadFrom(original.about);
  const aboutContent = about.translations[0].content;
  await expectCode(
    await save('about', withContent(about, { ...aboutContent, about_contract_version: 2 })),
    400,
    'WEBSITE_ABOUT_CONTENT_INVALID',
  );
  const highlight = { title: 'Judul', description: 'Keterangan' };
  await expectCode(
    await save(
      'about',
      withContent(about, { ...aboutContent, highlights: [1, 2, 3, 4].map(() => highlight) }),
    ),
    400,
    'WEBSITE_ABOUT_CONTENT_INVALID',
  );
  await expectCode(
    await save('about', withContent(about, { ...aboutContent, highlights: [{ title: 'X' }] })),
    400,
    'WEBSITE_ABOUT_CONTENT_INVALID',
  );
});

test('save validates media and banner actions', async () => {
  const image = await uploadSample(owner, 'media_library');
  const profilePhoto = await uploadSample(owner, 'admin_profile');
  const terms = payloadFrom(original.terms);
  const withMedia = (items: Record<string, unknown>[]) => ({
    ...terms,
    media: items.map((item) => ({
      id_attachment: image,
      slot: 'og',
      is_visible: true,
      ...item,
    })),
  });
  const invalidMedia: [Record<string, unknown>[], string][] = [
    [[{ id_attachment: 'bad' }], 'WEBSITE_PAGE_MEDIA_INVALID'],
    [[{ slot: 'home_main' }], 'WEBSITE_PAGE_MEDIA_INVALID'],
    [[{}, {}], 'WEBSITE_PAGE_MEDIA_INVALID'],
    [[{ is_visible: 'yes' }], 'WEBSITE_PAGE_MEDIA_INVALID'],
    [[{ translations: [{ locale: 'xx' }] }], 'WEBSITE_PAGE_MEDIA_INVALID'],
    [[{ translations: 'none' }], 'WEBSITE_PAGE_MEDIA_INVALID'],
    [[{ click_action: 'popup', click_target: '/x' }], 'WEBSITE_PAGE_MEDIA_ACTION_INVALID'],
    [[{ click_action: 'none', click_target: '/x' }], 'WEBSITE_PAGE_MEDIA_ACTION_INVALID'],
    [[{ click_action: 'internal' }], 'WEBSITE_PAGE_MEDIA_ACTION_INVALID'],
    [
      [{ click_action: 'internal', click_target: '//evil.com' }],
      'WEBSITE_PAGE_MEDIA_ACTION_INVALID',
    ],
    [[{ click_action: 'internal', click_target: '/a/../b' }], 'WEBSITE_PAGE_MEDIA_ACTION_INVALID'],
    [
      [{ click_action: 'external', click_target: 'http://example.com' }],
      'WEBSITE_PAGE_MEDIA_ACTION_INVALID',
    ],
    [
      [{ click_action: 'product', click_target: 'Not A Slug' }],
      'WEBSITE_PAGE_MEDIA_ACTION_INVALID',
    ],
    // Only live media-library images can be used.
    [[{ id_attachment: profilePhoto }], 'WEBSITE_PAGE_MEDIA_UNAVAILABLE'],
  ];
  for (const [items, code] of invalidMedia) {
    await expectCode(await save('terms', withMedia(items)), 400, code);
  }
  await expectCode(
    await save('terms', { ...terms, media: Array(11).fill(withMedia([{}]).media[0]) }),
    400,
    'WEBSITE_PAGE_MEDIA_INVALID',
  );
});

test('save stores the page, its translations, and media', async () => {
  const image = await uploadSample(owner, 'media_library');
  const terms = payloadFrom(original.terms);
  const saved = await expectCode(
    await save('terms', {
      ...terms,
      publish_at: '2999-01-01T00:00:00.000Z',
      translations: terms.translations.map((item: any) => ({
        ...item,
        title: `${item.title} (uji)`,
        seo: { ...item.seo, canonical_url: 'https://matexindo.com/uji', schema: { a: 1 } },
      })),
      media: [
        {
          id_attachment: image,
          slot: 'og',
          is_visible: true,
          click_action: 'external',
          click_target: 'https://matexindo.com',
          translations: [{ locale: 'id-ID', caption: 'Keterangan', alt_text: 'Gambar uji' }],
        },
      ],
    }),
    200,
    'WEBSITE_PAGE_UPDATED',
  );
  expect(saved.data).toEqual({ key: 'terms' });

  const page = await detail('terms');
  expect(page).toMatchObject({
    is_published: true,
    effective_status: 'scheduled',
    updated_by: 'E2EAdmin',
    translations: [
      { locale: 'en-US', title: `${original.terms.translations[0].title} (uji)` },
      {
        locale: 'id-ID',
        path: 'syarat-ketentuan',
        seo: { canonical_url: 'https://matexindo.com/uji', schema: { a: 1 } },
      },
    ],
    media: [
      {
        id_attachment: image,
        slot: 'og',
        sort_order: 0,
        click_action: 'external',
        collection_name: 'media_library',
        translations: [{ locale: 'id-ID', caption: 'Keterangan', alt_text: 'Gambar uji' }],
      },
    ],
  });
  // Media in use on a page cannot be deleted.
  await expectCode(await owner.delete(`/api/v1/attachment/${image}`), 409, 'ATTACHMENT_IN_USE');

  // Unpublished pages drop their publication window.
  await expectCode(
    await save('terms', { ...terms, is_published: false, publish_at: '2999-01-01T00:00:00Z' }),
    200,
  );
  expect(await detail('terms')).toMatchObject({
    is_published: false,
    effective_status: 'draft',
    publish_at: null,
    media: [],
  });
});

test('an account without website page rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Halaman', []);
  const account = await createAdminAccount(
    owner,
    'Halaman',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(`${base}/terms`), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.put(`${base}/terms`, { data: {} }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
  } finally {
    await limited.dispose();
  }
});
