import { expect, test, type Page, type Request } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the form "Kembali" button (frontend/admin/src/app/shared/components/
// ui/back-button, U-7): it returns to the form's list with the query the list was left
// with, for lists that keep their query in memory (FAQ) and in the URL (Produk); coming
// to a list any other way starts it fresh.
test.describe.configure({ mode: 'serial' });

// Retries the form: on a busy machine hydration can clear a field typed too early.
async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

/** Waits for the next GET of this list endpoint and returns its query. */
function nextList(page: Page, path: string): Promise<URLSearchParams> {
  return page
    .waitForRequest((r: Request) => r.method() === 'GET' && new URL(r.url()).pathname === path)
    .then((r) => new URL(r.url()).searchParams);
}

test.beforeAll(async () => {
  const owner = await apiLogin(admin.identity, admin.password);
  for (const index of [1, 2]) {
    const res = await owner.post('/api/v1/faq', {
      data: {
        key: `kembali-${runId}-${index}`,
        sort_order: index,
        translations: [
          { locale: 'id-ID', question: `Pertanyaan kembali ${index}?`, answer: 'Jawaban.' },
          { locale: 'en-US', question: `Back question ${index}?`, answer: 'Answer.' },
        ],
      },
    });
    expect(res.status(), await res.text()).toBe(201);
  }
  await owner.dispose();
});

test('a list kept in memory comes back with its search and sort', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const path = '/api/v1/faq';

  await page.goto(`${stack.adminOrigin}/faq`);
  const table = page.locator('app-table');
  await expect(table.locator('tbody tr')).not.toHaveCount(0);
  let query = nextList(page, path);
  await table.locator('.product-search input').fill(`kembali-${runId}`);
  await query;
  await expect(table.locator('tbody tr')).toHaveCount(2);
  const sortButton = table.locator('.table-sort-btn').first();
  query = nextList(page, path);
  await sortButton.click();
  const left = Object.fromEntries(await query);
  expect(left['search']).toBe(`kembali-${runId}`);
  // The API query names the column `sort` and the order `direction` (A-2).
  expect(left['direction']).toMatch(/^(asc|desc)$/);

  // The form has the button in its header; it opens the list as it was left.
  await page.locator('.title-header a', { hasText: /Tambah/ }).click();
  await page.waitForURL(/\/faq\/create/);
  const back = page.locator('.title-header app-back-button a');
  await expect(back).toHaveText(/Kembali/);
  query = nextList(page, path);
  await back.click();
  await page.waitForURL(/\/faq(?:[?#]|$)/);
  expect(Object.fromEntries(await query)).toMatchObject({
    search: left['search'],
    sort: left['sort'],
    direction: left['direction'],
  });
  await expect(table.locator('.product-search input')).toHaveValue(`kembali-${runId}`);
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await expect(sortButton).toHaveClass(/active/);

  // From the sidebar the list starts fresh.
  await page.goto(`${stack.adminOrigin}/faq/create`);
  query = nextList(page, path);
  // The submenu may be folded; the link's click still goes through the router.
  await page.locator('.sidebar-wrapper a[href="/faq"]').first().dispatchEvent('click');
  await page.waitForURL(/\/faq(?:[?#]|$)/);
  expect((await query).get('search') ?? '').toBe('');
  await expect(table.locator('.product-search input')).toHaveValue('');

  expect(errors).toEqual([]);
});

test('a list kept in the URL comes back with its query string', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);

  await page.goto(`${stack.adminOrigin}/product?search=kembali&field=name&sort=desc`);
  await expect(page.locator('app-table .product-search input')).toHaveValue('kembali');
  await page.locator('.title-header a', { hasText: /Tambah/ }).click();
  await page.waitForURL(/\/product\/create/);
  const back = page.locator('.title-header app-back-button a');
  await expect(back).toHaveAttribute('href', '/product?search=kembali&field=name&sort=desc');
  await back.click();
  await page.waitForURL(/\/product\?/);
  const url = new URL(page.url());
  expect(Object.fromEntries(url.searchParams)).toEqual({
    search: 'kembali',
    field: 'name',
    sort: 'desc',
  });
  await expect(page.locator('app-table .product-search input')).toHaveValue('kembali');

  expect(errors).toEqual([]);
});

test('every form page has the button, pointing at its list', async ({ page }) => {
  await login(page);
  for (const list of [
    'admin-account',
    'admin-access',
    'admin-permission',
    'chair',
    'office',
    'blog',
    'faq',
    'product',
  ]) {
    await page.goto(`${stack.adminOrigin}/${list}/create`);
    await expect(page.locator('.title-header app-back-button a'), list).toHaveAttribute(
      'href',
      new RegExp(`^/${list}(\\?|$)`),
    );
  }
});
