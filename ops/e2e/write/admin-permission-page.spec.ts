import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for Hak Akses (frontend/admin/src/app/components/admin-permission) and the
// Dasbor tabs: one page with its state in the URL, adding and editing in the panels.
test.describe.configure({ mode: 'serial' });

const groupName = `Halaman Uji ${runId}`;
let owner: APIRequestContext;

async function login(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

const groupRow = (page: Page, name: string) =>
  page.getByTestId('permission-group').filter({ hasText: name });
const permissionRow = (page: Page, name: string) =>
  page.getByTestId('permission-row').filter({ hasText: name });

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
});

test.afterAll(async () => {
  await owner?.dispose();
});

test('the old form addresses lead to the page', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/admin-permission/create`);
  await expect(page).toHaveURL(/\/admin-permission\/?$/);
  await page.goto(`${stack.adminOrigin}/admin-permission/edit/abc123`);
  await expect(page).toHaveURL(/\/admin-permission\?edit=abc123$/);
  await expect(page.getByTestId('permission-form')).toBeVisible();
});

test('a group, its permissions, and the delete rules work in the panels', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.goto(`${stack.adminOrigin}/admin-permission`);

  // New group: chosen right away, and its key start comes from its name.
  await page.locator('#group_name').fill(groupName);
  await page.locator('#group_save').click();
  await expect(page.getByTestId('permission-active-group')).toHaveText(groupName);
  await expect(page).toHaveURL(/group=Halaman/);
  const prefix = `halaman_uji_${runId}`;
  await expect(page.getByTestId('key-prefix')).toHaveText(`${prefix}.`);

  // New permission starts inactive and shows up in the list.
  await page.locator('#permission_name').fill('Lihat Uji');
  await page.getByTestId('permission-submit').click();
  await expect(page.locator('#permission_action')).toHaveClass(/is-invalid/);
  await page.locator('#permission_action').fill('view');
  await page.getByTestId('permission-submit').click();
  await expect(permissionRow(page, 'Lihat Uji')).toContainText(`${prefix}.view`);
  await expect(permissionRow(page, 'Lihat Uji').getByTestId('permission-status')).toHaveText(
    'Tidak Aktif',
  );
  await expect(groupRow(page, groupName).getByTestId('group-count')).toHaveText('1');
  // A group with permissions cannot be deleted.
  await expect(groupRow(page, groupName).getByTestId('group-delete')).toHaveCount(0);

  // A second one: the key already used is refused before it reaches the server.
  await expect(page.getByTestId('key-existing')).toContainText('view');
  await page.locator('#permission_name').fill('Buat Uji');
  await page.locator('#permission_action').fill('view');
  await expect(page.getByTestId('key-taken')).toBeVisible();
  await page.locator('#permission_action').fill('create');
  await page.getByTestId('permission-submit').click();
  await expect(permissionRow(page, 'Buat Uji')).toBeVisible();

  // Editing: the key is locked, the status can change, the address names the row.
  await permissionRow(page, 'Buat Uji').getByTestId('permission-edit').click();
  await expect(page).toHaveURL(/edit=/);
  await expect(page.locator('#permission_action')).toBeDisabled();
  await expect(page.locator('#permission_action')).toHaveValue('create');
  await page.locator('#permission_name').fill('Buat Uji Diubah');
  await page.locator('#permission_active').check();
  await page.getByTestId('permission-submit').click();
  await expect(page).not.toHaveURL(/edit=/);
  const active = permissionRow(page, 'Buat Uji Diubah');
  await expect(active.getByTestId('permission-status')).toHaveText('Aktif');
  // An active permission has no delete button or checkbox.
  await expect(active.getByTestId('permission-delete')).toHaveCount(0);
  await expect(active.locator('input[type="checkbox"]')).toHaveCount(0);

  // Renaming the group keeps it open.
  const renamed = `${groupName} Baru`;
  await groupRow(page, groupName).getByTestId('group-edit').click();
  await expect(page.locator('#group_name')).toHaveValue(groupName);
  await page.locator('#group_name').fill(renamed);
  await page.locator('#group_save').click();
  await expect(page.getByTestId('permission-active-group')).toHaveText(renamed);

  // Select all takes only the deletable ones; deleting asks first.
  await page.getByTestId('permission-select-all').check();
  await expect(page.getByTestId('permission-selected')).toContainText('1 dari 1');
  await page.getByTestId('permission-delete-selected').click();
  await page.locator('#confirm_yes_btn').last().click();
  await expect(permissionRow(page, 'Lihat Uji')).toHaveCount(0);

  // Last one: deactivate, delete, then the empty group can go.
  await active.getByTestId('permission-edit').click();
  await page.locator('#permission_active').uncheck();
  await page.getByTestId('permission-submit').click();
  await expect(active.getByTestId('permission-status')).toHaveText('Tidak Aktif');
  await active.getByTestId('permission-delete').click();
  await page.locator('#confirm_yes_btn').last().click();
  await expect(page.getByTestId('permission-row')).toHaveCount(0);
  await groupRow(page, renamed).getByTestId('group-delete').click();
  await page.locator('#confirm_yes_btn').last().click();
  await expect(groupRow(page, renamed)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('searching filters both panels and lives in the address', async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/admin-permission?searchgroup=catalog`);
  const groups = page.getByTestId('permission-group');
  await expect(groups).toHaveCount(1);
  await expect(page.locator('#search_group')).toHaveValue('catalog');
  await expect(page.getByTestId('permission-active-group')).toHaveText('Catalog');

  await page.locator('#search_permission').fill('product.creat');
  await expect(page).toHaveURL(/searchpermission=product\.creat/);
  await expect(groups.getByTestId('group-count')).toHaveText('1');
  await expect(page.getByTestId('permission-row')).toHaveCount(1);
  await expect(page.getByTestId('permission-row')).toContainText('product.create');

  // A group with several key starts offers them all.
  await page.locator('#search_permission').fill('');
  await expect(page.locator('#permission_prefix option')).not.toHaveCount(0);
  expect(await page.locator('#permission_prefix option').count()).toBeGreaterThan(1);

  // A shared address opens the same view.
  await page.goto(`${stack.adminOrigin}/admin-permission?searchpermission=tidak-ada-apa-apa`);
  await expect(groups).toHaveCount(0);
  await expect(page.locator('.permission-board-main .permission-board-empty')).toBeVisible();
});

test('the dashboard has a Website tab and three that are not built yet', async ({ page }) => {
  await login(page);
  const tabs = page.getByTestId('page-tabs').getByRole('tab');
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.dashboard-heading')).toBeVisible();
  await expect(page.getByTestId('coming-soon')).toHaveCount(0);
  await expect(page.locator('.page-tabs-soon')).toHaveCount(3);

  await page.locator('[data-tab="finance"]').click();
  await expect(page).toHaveURL(/\?tab=finance$/);
  await expect(page.getByTestId('coming-soon')).toContainText('Fitur masih dalam pengembangan');
  await expect(page.locator('.dashboard-heading')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('coming-soon')).toBeVisible();
  await expect(page.locator('[data-tab="finance"]')).toHaveAttribute('aria-selected', 'true');

  await page.locator('[data-tab="website"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.dashboard-heading')).toBeVisible();
});
