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

// API contract for website navigation (backend/src/ctrl/admin/web-navigation.ts): navigation
// metadata, fixed menu items with Indonesian/English labels, reordering, status and the public
// endpoint (which serves only the "primary" navigation), deletion, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/web-navigation';
const key = `uji-${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let navigationId = '';
const itemId: Record<string, string> = {};

const metadata = {
  web_navigation_key: key,
  web_navigation_name: 'Navigasi Uji Kontrak',
  web_navigation_location: 'footer',
  web_navigation_default_locale: 'id-ID',
  web_navigation_settings_json: { theme: 'gelap' },
};

const item = (itemKey: string, sortOrder: number, label: string) => ({
  web_navigation_item_key: itemKey,
  web_navigation_item_sort_order: sortOrder,
  web_navigation_item_status: 1,
  translations: [
    { locale: 'id-ID', label, status: 1 },
    { locale: 'en-US', label: `${label} EN`, status: 1 },
  ],
});

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('web-navigation-api', [
    'web_navigation',
    'web_navigation_item',
    'web_navigation_item_i18n',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('navigation endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: metadata }), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(
    await anonymous.put(`${base}/x/reorder-items`, { data: {} }),
    401,
    'AUTH_TOKEN_REQUIRED',
  );
});

test('the list shows the seeded navigation', async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200, 'WEB_NAVIGATION_LIST_FOUND');
  expect(list.data.navigations.length).toBeGreaterThan(0);
  await expectCode(await owner.get(`${base}/not-a-hash`), 400, 'WEB_NAVIGATION_INVALID_ID');
});

test('create validates navigation metadata', async () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ web_navigation_key: 'Bad Key!' }, 'WEB_NAVIGATION_KEY_INVALID'],
    [{ web_navigation_name: ' ' }, 'WEB_NAVIGATION_NAME_INVALID'],
    [{ web_navigation_location: 'Bad Location' }, 'WEB_NAVIGATION_LOCATION_INVALID'],
    [{ web_navigation_default_locale: 'fr-FR' }, 'WEB_NAVIGATION_LOCALE_UNSUPPORTED'],
    [{ web_navigation_settings_json: '{not json' }, 'WEB_NAVIGATION_SETTINGS_INVALID'],
    [{ web_navigation_settings_json: [1, 2] }, 'WEB_NAVIGATION_SETTINGS_INVALID'],
  ];
  for (const [patch, code] of cases) {
    await expectCode(await owner.post(base, { data: { ...metadata, ...patch } }), 400, code);
  }
});

test('create a navigation and update its metadata', async () => {
  const created = await expectCode(
    await owner.post(base, { data: metadata }),
    201,
    'WEB_NAVIGATION_CREATED',
  );
  navigationId = created.data.id_web_navigation;
  expect(navigationId).toBeTruthy();
  await expectCode(await owner.post(base, { data: metadata }), 409, 'WEB_NAVIGATION_KEY_EXISTS');

  const detail = await expectCode(
    await owner.get(`${base}/${navigationId}`),
    200,
    'WEB_NAVIGATION_FOUND',
  );
  expect(JSON.stringify(detail.data)).toContain(key);

  await expectCode(
    await owner.put(`${base}/${navigationId}`, { data: { ...metadata, web_navigation_name: '' } }),
    400,
    'WEB_NAVIGATION_NAME_INVALID',
  );
  await expectCode(
    await owner.put(`${base}/${navigationId}`, {
      data: { ...metadata, web_navigation_name: 'Navigasi Uji Diubah' },
    }),
    200,
    'WEB_NAVIGATION_UPDATED',
  );
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: metadata }),
    400,
    'WEB_NAVIGATION_INVALID_ID',
  );
});

test('menu items: create, validate, and update', async () => {
  const items = `${base}/${navigationId}/items`;
  for (const [itemKey, sortOrder, label] of [
    ['home', 1, 'Beranda'],
    ['about', 2, 'Tentang'],
    ['contact', 3, 'Kontak'],
  ] as const) {
    const created = await expectCode(
      await owner.post(items, { data: item(itemKey, sortOrder, label) }),
      201,
      'WEB_NAVIGATION_ITEM_CREATED',
    );
    itemId[itemKey] = created.data.id_web_navigation_item;
  }
  await expectCode(await owner.post(items, { data: item('home', 9, 'Lagi') }), 409);
  await expectCode(
    await owner.post(items, { data: item('blog', 4, 'Blog') }),
    400,
    'WEB_NAVIGATION_ITEM_KEY_INVALID',
  );
  await expectCode(
    await owner.post(items, {
      data: {
        ...item('articles', 4, 'Artikel'),
        translations: [{ locale: 'id-ID', label: 'Artikel' }],
      },
    }),
    400,
    'WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED',
  );
  await expectCode(
    await owner.post(items, {
      data: { ...item('articles', 4, 'Artikel'), web_navigation_item_sort_order: -1 },
    }),
    400,
    'WEB_NAVIGATION_ITEM_SORT_INVALID',
  );

  await expectCode(
    await owner.put(`${items}/${itemId.about}`, { data: item('about', 2, 'Tentang Kami') }),
    200,
    'WEB_NAVIGATION_ITEM_UPDATED',
  );
  await expectCode(
    await owner.put(`${items}/not-a-hash`, { data: item('about', 2, 'Tentang Kami') }),
    400,
    'WEB_NAVIGATION_ITEM_INVALID_ID',
  );
  const detail = await expectCode(await owner.get(`${base}/${navigationId}`), 200);
  expect(JSON.stringify(detail.data)).toContain('Tentang Kami');
});

test('reorder requires every item exactly once', async () => {
  const reorder = `${base}/${navigationId}/reorder-items`;
  const all = (order: Record<string, number>) =>
    Object.entries(order).map(([itemKey, sort]) => ({
      id_web_navigation_item: itemId[itemKey],
      sort_order: sort,
    }));
  const cases: Array<[unknown, number, string]> = [
    [{}, 400, 'WEB_NAVIGATION_REORDER_ITEMS_REQUIRED'],
    [{ items: all({ home: 1, about: 2 }) }, 409, 'WEB_NAVIGATION_REORDER_INCOMPLETE'],
    [
      {
        items: [
          ...all({ home: 1, about: 2 }),
          { id_web_navigation_item: 'not-a-hash', sort_order: 3 },
        ],
      },
      400,
      'WEB_NAVIGATION_REORDER_ITEM_INVALID',
    ],
    [
      {
        items: [
          ...all({ home: 1, about: 2 }),
          { id_web_navigation_item: itemId.home, sort_order: 3 },
        ],
      },
      400,
      'WEB_NAVIGATION_REORDER_ITEM_DUPLICATE',
    ],
    [
      { items: all({ home: 1, about: -2, contact: 3 }) },
      400,
      'WEB_NAVIGATION_REORDER_SORT_INVALID',
    ],
    [
      { items: all({ home: 1, about: 1, contact: 3 }) },
      400,
      'WEB_NAVIGATION_REORDER_SORT_DUPLICATE',
    ],
  ];
  for (const [data, status, code] of cases) {
    await expectCode(await owner.put(reorder, { data }), status, code);
  }
  await expectCode(
    await owner.put(reorder, { data: { items: all({ contact: 1, home: 2, about: 3 }) } }),
    200,
    'WEB_NAVIGATION_ITEMS_REORDERED',
  );
  const detail = await expectCode(await owner.get(`${base}/${navigationId}`), 200);
  const text = JSON.stringify(detail.data);
  expect(text.indexOf('"key":"contact"')).toBeLessThan(text.indexOf('"key":"home"'));
  expect(text.indexOf('"key":"home"')).toBeLessThan(text.indexOf('"key":"about"'));
});

test('status changes, and only the primary navigation is public', async () => {
  await expectCode(
    await owner.patch(`${base}/${navigationId}/status`, { data: { web_navigation_status: 3 } }),
    400,
    'WEB_NAVIGATION_STATUS_INVALID',
  );
  await expectCode(
    await owner.patch(`${base}/${navigationId}/status`, { data: { web_navigation_status: 1 } }),
    200,
  );
  // The public site serves the fixed "primary" header navigation only.
  await expectCode(
    await anonymous.get(`/api/public/navigation/${key}/id-ID`),
    404,
    'NAVIGATION_NOT_FOUND',
  );
  await expectCode(
    await owner.patch(`${base}/${navigationId}/status`, { data: { web_navigation_status: 0 } }),
    200,
  );

  // Deactivating the seeded primary navigation hides it from the public site; restore it after.
  const list = await expectCode(await owner.get(base), 200);
  const primary = list.data.navigations.find((navigation: any) => navigation.key === 'primary');
  expect(primary).toBeTruthy();
  const primaryStatus = `${base}/${primary.id_web_navigation}/status`;
  const published = await expectCode(
    await anonymous.get('/api/public/navigation/primary/en-US'),
    200,
  );
  expect(JSON.stringify(published.data)).toContain('/en/contact-us');
  await expectCode(await owner.patch(primaryStatus, { data: { web_navigation_status: 0 } }), 200);
  await expectCode(
    await anonymous.get('/api/public/navigation/primary/en-US'),
    404,
    'NAVIGATION_NOT_FOUND',
  );
  await expectCode(await owner.patch(primaryStatus, { data: { web_navigation_status: 1 } }), 200);
  await expectCode(await anonymous.get('/api/public/navigation/primary/en-US'), 200);
});

test('an account without navigation permissions is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Navigasi', []);
  const account = await createAdminAccount(
    owner,
    'Navigasi',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.post(base, { data: metadata }), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.patch(`${base}/${navigationId}/status`, { data: { web_navigation_status: 1 } }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
  } finally {
    await limited.dispose();
  }
});

test('delete an item, restore it, then delete the navigation', async () => {
  const items = `${base}/${navigationId}/items`;
  await expectCode(
    await owner.delete(`${items}/${itemId.about}`),
    200,
    'WEB_NAVIGATION_ITEM_DELETED',
  );
  await expectCode(
    await owner.delete(`${items}/${itemId.about}`),
    404,
    'WEB_NAVIGATION_ITEM_NOT_FOUND',
  );
  await expectCode(
    await owner.post(items, { data: item('about', 4, 'Tentang Lagi') }),
    201,
    'WEB_NAVIGATION_ITEM_CREATED',
  );

  await expectCode(await owner.delete(`${base}/${navigationId}`), 200, 'WEB_NAVIGATION_DELETED');
  await expectCode(await owner.get(`${base}/${navigationId}`), 404, 'WEB_NAVIGATION_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/not-a-hash`), 400, 'WEB_NAVIGATION_INVALID_ID');
});
