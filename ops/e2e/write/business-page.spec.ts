import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  admin,
  adminReferences,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
  runId,
  saveRecording,
} from './api-contract';
import { stack } from './stack.mjs';

// Browser contract of Bisnis > Entitas & Toko: an entity, its store, and a revenue share rule
// typed in the inline tables, and the partner login that sees only its own entity.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;
const entityName = `Koh Joni ${runId}`;
let entityId = '';
let partner = { identity: '', password: '' };

async function signIn(page: Page, identity = admin.identity, password = admin.password) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(identity);
  await page.locator('#password').fill(password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
});

test.afterAll(async () => {
  await saveRecording('business-page', []);
  await owner?.dispose();
});

test('an entity is typed into the table and gets a store', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/business`);
  const table = page.locator('[data-testid=business-entities] [data-testid=inline-table]');
  await expect(table.locator('[data-testid=inline-row]').first()).toBeVisible();

  await table.locator('[data-testid=inline-add]').click();
  const editing = table.locator('tr.inline-table-editing');
  await editing.locator('input').first().fill(entityName);
  await table.locator('[data-testid=entity-note]').fill('Mitra lama');
  await table.locator('[data-testid=inline-save]').click();
  await expect(table.locator('tr.inline-table-editing')).toHaveCount(0);
  await expect(table).toContainText(entityName);
  await expect(table).toContainText('Mitra lama');

  const list = await expectCode(await owner.get('/api/v1/business/entities'), 200);
  const saved = list.data.find((item: { name: string }) => item.name === entityName);
  expect(saved).toMatchObject({ kind: 'partner', note: 'Mitra lama', status: true });
  entityId = saved.id;

  await page.goto(`${stack.adminOrigin}/business?tab=stores`);
  const group = page.locator(`[data-testid=business-store-group][data-entity="${entityName}"]`);
  await expect(group).toBeVisible();
  await group.locator('[data-testid=inline-add]').click();
  const storeRow = group.locator('tr.inline-table-editing');
  await storeRow.locator('input').nth(0).fill(`Toko Joni ${runId}`);
  await storeRow.locator('input').nth(1).fill('https://example.invalid/joni');
  await group.locator('[data-testid=inline-save]').click();
  await expect(group.locator('tr.inline-table-editing')).toHaveCount(0);
  await expect(group).toContainText(`Toko Joni ${runId}`);
  const stores = await expectCode(
    await owner.get('/api/v1/business/stores', { params: { entity: entityId } }),
    200,
  );
  expect(stores.data).toHaveLength(1);
  expect(stores.data[0].url).toBe('https://example.invalid/joni');
});

test('a rule is written with its components and summarised', async ({ page }) => {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/business?tab=rules`);
  const group = page.locator(`[data-testid=business-rule-group][data-entity="${entityName}"]`);
  await expect(group).toBeVisible();
  await group.locator('[data-testid=inline-add]').click();
  const row = group.locator('tr.inline-table-editing');
  await row.locator('input').first().fill(`Konsinyasi ${runId}`);
  await group.locator('[data-testid=slot-platform_fee]').fill('10');
  await group.locator('[data-testid=slot-platform_fee]').press('Tab');
  await group.locator('[data-testid=inline-save]').click();
  await expect(group.locator('tr.inline-table-editing')).toHaveCount(0);
  await expect(group.locator('[data-testid=rule-summary]')).toContainText(
    'Komisi platform 10% dari harga pembeli',
  );

  const rules = await expectCode(
    await owner.get('/api/v1/business/rules', { params: { entity: entityId } }),
    200,
  );
  expect(rules.data).toHaveLength(1);
  expect(rules.data[0].components).toEqual([
    expect.objectContaining({ kind: 'platform_fee', type: 'percent', value: 10, base: 'gross' }),
  ]);
});

test('a partner login sees its own entity only', async ({ page }) => {
  const account = await createAdminAccount(owner, 'MitraUi', {
    ...(await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Mitra UI ${runId}`, [
        'business.view',
        'product.view',
      ]),
    })),
    id_business_entity: entityId,
  } as Awaited<ReturnType<typeof adminReferences>>);
  partner = account;

  await signIn(page, partner.identity, partner.password);
  await page.goto(`${stack.adminOrigin}/business`);
  const table = page.locator('[data-testid=business-entities] [data-testid=inline-table]');
  await expect(table.locator('[data-testid=inline-row]')).toHaveCount(1);
  await expect(table).toContainText(entityName);
  // No manage permission: nothing to add or edit.
  await expect(table.locator('[data-testid=inline-add]')).toHaveCount(0);
  await expect(table.locator('[data-testid=inline-edit]')).toHaveCount(0);
});
