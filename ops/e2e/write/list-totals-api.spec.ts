import { expect, test, type APIRequestContext } from '@playwright/test';

import { admin, expectCode, login, saveRecording } from './api-contract';

// API contract for the list totals every paged admin list answers (5D, D-4): `total` counts the
// rows that match the search and filters, `total_all` the rows before them, for the admin table's
// "showing x of y".
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;

// Where each list keeps its totals.
const lists: { path: string; totals: (body: any) => { total: number; total_all: number } }[] = [
  { path: '/api/v1/admin-acct', totals: (body) => body.pagination },
  { path: '/api/v1/admin-access', totals: (body) => body.pagination },
  { path: '/api/v1/admin-permission', totals: (body) => body.pagination },
  { path: '/api/v1/audit-log', totals: (body) => body.pagination },
  { path: '/api/v1/chair', totals: (body) => body.pagination },
  { path: '/api/v1/office', totals: (body) => body.pagination },
  { path: '/api/v1/attachment', totals: (body) => body.pagination },
  { path: '/api/v1/faq', totals: (body) => body.data.pagination },
  { path: '/api/v1/articles', totals: (body) => body.data },
  { path: '/api/v1/products', totals: (body) => body.data },
  { path: '/api/v1/product-categories', totals: (body) => body.data },
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
