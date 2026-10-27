import { expect, test, type APIRequestContext } from '@playwright/test';

import { admin, expectCode, login, saveRecording } from './api-contract';

// API contract for the list format every admin list answers (A-2): { success, code, message,
// data: [...items], meta }. `meta.total` counts the rows that match the search and filters,
// `meta.total_all` the rows before them (5D, D-4, the admin table's "showing x of y"); paged lists
// also answer page, limit, and total_pages. Sorting is ?sort=<key>&direction=asc|desc.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;

// Every admin list; the category tree is the one list without pages.
const lists: { path: string; totals: (body: any) => { total: number; total_all: number } }[] = [
  { path: '/api/v1/admin-acct', totals: (body) => body.meta },
  { path: '/api/v1/admin-access', totals: (body) => body.meta },
  { path: '/api/v1/admin-permission', totals: (body) => body.meta },
  { path: '/api/v1/audit-log', totals: (body) => body.meta },
  { path: '/api/v1/chair', totals: (body) => body.meta },
  { path: '/api/v1/office', totals: (body) => body.meta },
  { path: '/api/v1/attachment', totals: (body) => body.meta },
  { path: '/api/v1/faq', totals: (body) => body.meta },
  { path: '/api/v1/articles', totals: (body) => body.meta },
  { path: '/api/v1/products', totals: (body) => body.meta },
  { path: '/api/v1/product-categories', totals: (body) => body.meta },
];

test.afterAll(async () => {
  await saveRecording('list-totals-api', []);
  await owner?.dispose();
});

test('every paged admin list answers total and total_all', async () => {
  owner = await login(admin.identity, admin.password);
  for (const list of lists) {
    const all = list.totals(await expectCode(await owner.get(list.path), 200));
    expect(all.total_all, list.path).toBe(all.total);
    const none = list.totals(
      await expectCode(
        await owner.get(list.path, { params: { search: 'no-row-matches-this-search' } }),
        200,
      ),
    );
    expect(none, list.path).toEqual(
      expect.objectContaining({ total: 0, total_all: all.total_all }),
    );
  }
});

test('every admin list answers code, data, and meta', async () => {
  for (const list of lists) {
    const body = await expectCode(await owner.get(list.path), 200);
    expect(typeof body.code, list.path).toBe('string');
    expect(Array.isArray(body.data), list.path).toBe(true);
    expect(body).not.toHaveProperty('pagination');
    if (list.path === '/api/v1/product-categories') continue;
    expect(body.meta, list.path).toMatchObject({
      page: 1,
      limit: expect.any(Number),
      total_pages: Math.ceil(body.meta.total / body.meta.limit),
    });
  }
});

test('sort and direction order a list; unknown keys fall back', async () => {
  const names = async (params: Record<string, string>) =>
    (await expectCode(await owner.get('/api/v1/admin-permission', { params }), 200)).data.map(
      (item: { permission_key: string }) => item.permission_key,
    );
  const ascending = await names({ sort: 'permission_key', direction: 'asc', limit: '5' });
  const descending = await names({ sort: 'permission_key', direction: 'desc', limit: '5' });
  expect([...ascending].sort()).toEqual(ascending);
  expect([...descending].sort().reverse()).toEqual(descending);
  expect(ascending[0] < descending[0]).toBe(true);
  // The older names still work for one release.
  expect(await names({ field: 'permission_key', sort: 'desc', paginate: '5' })).toEqual(descending);
  await expectCode(
    await owner.get('/api/v1/admin-permission', { params: { sort: 'toString' } }),
    200,
  );
});
