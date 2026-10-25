import { expect, test, type Page, type Request } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the shared list table (frontend/admin/src/app/shared/components/ui/table):
// search, sort, page size, row selection, the status switch, the row action menu, and the
// date range filter each change the list query (or, for the activity log, its URL). Guards the 6C clean-up of the table.
test.describe.configure({ mode: 'serial' });

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

/** Waits for the next GET of this list endpoint and returns its query. */
function nextList(page: Page, path: string): Promise<URLSearchParams> {
  return page
    .waitForRequest((r: Request) => r.method() === 'GET' && new URL(r.url()).pathname === path)
    .then((r) => new URL(r.url()).searchParams);
}

test.beforeAll(async () => {
  const owner = await apiLogin(admin.identity, admin.password);
  for (const index of [1, 2, 3]) {
    const res = await owner.post('/api/v1/faq', {
      data: {
        key: `tabel-${runId}-${index}`,
        sort_order: index,
        translations: [
          { locale: 'id-ID', question: `Pertanyaan tabel ${index}?`, answer: 'Jawaban.' },
          { locale: 'en-US', question: `Table question ${index}?`, answer: 'Answer.' },
        ],
      },
    });
    expect(res.status(), await res.text()).toBe(201);
  }
  await owner.dispose();
});

test('the FAQ table searches, sorts, pages, selects, and opens row actions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const path = '/api/v1/faq';

  // The first page may come from server rendering, so the queries below are the checks.
  await page.goto(`${stack.adminOrigin}/faq`);
  const table = page.locator('app-table');
  await expect(table.locator('tbody tr')).not.toHaveCount(0);

  // Search (debounced) resets to page 1.
  let query = nextList(page, path);
  await table.locator('.product-search input').fill(`tabel-${runId}`);
  expect(Object.fromEntries(await query)).toMatchObject({ search: `tabel-${runId}`, page: '1' });
  await expect(table.locator('tbody tr')).toHaveCount(3);
  // The summary counts the matching rows against all rows (total and total_all).
  const summary = table.locator('.table-summary');
  await expect(summary).toContainText('Menampilkan 3 dari');
  const all = Number(/dari ([\d.]+) data/.exec(await summary.innerText())![1].replace(/\./g, ''));
  expect(all).toBeGreaterThan(3);

  // The small sort button in a header flips between ascending and descending.
  const header = table
    .locator('thead th', { hasText: 'Nama internal FAQ' })
    .locator('.table-sort-btn');
  query = nextList(page, path);
  await header.click();
  expect(Object.fromEntries(await query)).toMatchObject({ field: 'key', sort: 'desc' });
  query = nextList(page, path);
  await header.click();
  expect(Object.fromEntries(await query)).toMatchObject({ field: 'key', sort: 'asc' });

  // Page size (the FAQ service sends it as limit).
  query = nextList(page, path);
  await table.locator('.selection-box select').selectOption('25');
  expect(Object.fromEntries(await query)).toMatchObject({ limit: '25', page: '1' });

  // Reload keeps the query, reset clears it; both pause for three seconds after use.
  const reload = table.locator('.table-tool').nth(0);
  const reset = table.locator('.table-tool').nth(1);
  query = nextList(page, path);
  await reload.click();
  expect(Object.fromEntries(await query)).toMatchObject({ search: `tabel-${runId}`, limit: '25' });
  await expect(reload).toBeDisabled();
  await expect(reload).toBeEnabled({ timeout: 6000 });
  query = nextList(page, path);
  await reset.click();
  const cleared = Object.fromEntries(await query);
  expect(cleared).toMatchObject({ page: '1', limit: '15' });
  expect(cleared['search']).toBeUndefined();
  await expect(table.locator('.product-search input')).toHaveValue('');
  await expect(table.locator('.table-tool:disabled')).toHaveCount(4);
  await expect(reset).toBeEnabled({ timeout: 6000 });

  // Selection: one row shows the bulk delete, select all checks every row.
  const deleteAll = table.locator('.selection-box a', { hasText: 'Hapus' });
  await expect(deleteAll).toHaveCount(0);
  await table.locator('tbody tr').first().locator('input[type=checkbox]').first().check();
  await expect(deleteAll).toBeVisible();
  await table.locator('#table-checkbox').check();
  await expect(table.locator('#table-checkbox')).toBeChecked();
  await deleteAll.click();
  await expect(page.locator('.modal-content')).toBeVisible();
  await page.locator('#delete_no_btn').click();
  await expect(page.locator('.modal-content')).toHaveCount(0);
  await table.locator('#table-checkbox').uncheck();
  await expect(deleteAll).toHaveCount(0);

  // The status switch asks for confirmation first.
  const statusSwitch = table.locator('tbody tr').first().locator('.status-switch-cell input');
  const wasOn = await statusSwitch.isChecked();
  await table.locator('tbody tr').first().locator('.status-switch-cell .switch-state').click();
  await expect(page.locator('#confirm_no_btn')).toBeVisible();
  await page.locator('#confirm_no_btn').click();
  await expect(statusSwitch).toBeChecked({ checked: wasOn });

  // Clicking a row does nothing; actions live in the row menu only.
  await table.locator('tbody tr').first().locator('td').nth(2).click();
  await expect(page).toHaveURL(/\/faq(?:[?#]|$)/);

  // The gear in the action column header holds the display settings, kept per admin.
  const wrapper = table.locator('.datatable-wrapper');
  const gear = table.locator('.table-settings-toggle');
  const option = (index: number) =>
    page.locator('.table-settings-menu .table-settings-option').nth(index);
  await expect(wrapper).toHaveClass(/table-striped-rows/);
  await gear.click();
  await option(0).locator('.switch-state').click();
  await expect(wrapper).toHaveClass(/table-full-text/);
  await option(1).locator('.switch-state').click();
  await expect(table.locator('.table-sort-btn').first()).toBeHidden();
  await option(2).locator('.switch-state').click();
  await expect(wrapper).not.toHaveClass(/table-striped-rows/);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(table.locator('.datatable-wrapper')).toHaveClass(/table-full-text/);
  await expect(table.locator('.datatable-wrapper')).toHaveClass(/table-hide-sort/);
  await gear.click();
  for (const index of [0, 1, 2]) await option(index).locator('.switch-state').click();
  await expect(table.locator('.datatable-wrapper')).toHaveClass(/table-striped-rows/);
  await expect(table.locator('.table-sort-btn').first()).toBeVisible();
  await page.keyboard.press('Escape');

  // The row action menu opens and Edit goes to the edit page.
  await table.locator('tbody tr').first().locator('.action-dropdown-toggle').click();
  const menu = page.locator('.action-dropdown-menu.show');
  await expect(menu.locator('.action-dropdown-item')).not.toHaveCount(0);
  await menu.locator('.action-dropdown-item').first().click();
  await page.waitForURL(/\/faq\/edit\//);

  expect(errors).toEqual([]);
});

test('the activity log table filters by a date range', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);

  // The activity log keeps the table state in its URL (start_date, end_date).
  const urlQuery = () => new URL(page.url()).searchParams;
  await page.goto(`${stack.adminOrigin}/activity-log`);
  const table = page.locator('app-table');
  await expect(table.locator('#start_date')).toHaveCount(1);

  await table.locator('.custom-dt-picker button').first().click();
  const picker = page.locator('ngb-datepicker');
  await expect(picker).toBeVisible();
  const days = picker.locator('.ngb-dp-day:not(.hidden) .custom-day');
  await days.nth(2).click();
  await page.waitForURL(/start_date=/);
  const start = urlQuery().get('start_date');
  expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(urlQuery().get('end_date')).toBeNull();
  await expect(table.locator('input[name=dpFromDate]')).toHaveValue(start!);

  await days.nth(6).click();
  await page.waitForURL(/end_date=/);
  expect(urlQuery().get('start_date')).toBe(start);
  expect(urlQuery().get('end_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(table.locator('input[name=dpToDate]')).toHaveValue(urlQuery().get('end_date')!);

  await picker.locator('button.btn-primary').click();
  await page.waitForURL((url) => !url.searchParams.has('start_date'));
  expect(urlQuery().get('end_date')).toBeNull();
  await expect(table.locator('input[name=dpFromDate]')).toHaveValue('');

  expect(errors).toEqual([]);
});
