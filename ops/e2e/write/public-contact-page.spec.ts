import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { admin, login as apiLogin, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for Pengaturan Kontak (frontend/admin/src/app/components/public-contact) and
// the website's use of it: rows saved on their own, the rules of each table, the insight band, and
// the social accounts and click tagging on the public site.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/public-contact';
const screenshots = process.env.MATEX_E2E_SHOTS;
const accountName = `@uji${runId}`;

let owner: APIRequestContext;
let original: { socials: unknown[]; channels: unknown[]; topics: unknown[] };

async function open(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
  await page.goto(`${stack.adminOrigin}/public-contact`);
  await expect(page.getByTestId('channels').getByTestId('inline-row').first()).toBeVisible();
}

/** The next save: what was sent, and that it worked. */
const savedBody = (page: Page) =>
  page
    .waitForRequest((r) => r.method() === 'PUT' && new URL(r.url()).pathname === base)
    .then((r) => r.postDataJSON());

async function choose(page: Page, cell: ReturnType<Page['locator']>, label: string) {
  await cell.locator('.inline-table-toggle').click();
  await page.locator('.inline-table-menu.show .dropdown-item', { hasText: label }).first().click();
}

test.beforeAll(async () => {
  owner = await apiLogin(admin.identity, admin.password);
  original = (await (await owner.get(base)).json()).data;
});

test.afterAll(async () => {
  await owner.put(base, { data: { channels: original.channels, topics: original.topics } });
  const now = (await (await owner.get(base)).json()).data;
  const inactive = now.socials.map((item: Record<string, unknown>) => ({ ...item, is_active: 0 }));
  await owner.put(base, { data: { socials: inactive } });
  await owner.put(base, { data: { socials: [] } });
  await owner?.dispose();
});

test('a social account is added on its row, with its rules', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  const table = page.getByTestId('socials');
  const rows = table.getByTestId('inline-row');
  const start = await rows.count();

  await table.getByTestId('inline-add').click();
  const row = rows.nth(start);
  // New accounts start inactive and hidden; the row checks itself before saving.
  await expect(
    row.locator('[data-column="status"] .inline-table-toggle .inline-table-pill-danger'),
  ).toBeVisible();
  await row.getByTestId('inline-save').click();
  await expect(row.locator('.form-kit-error')).toHaveCount(2);

  await choose(page, row.locator('[data-column="platform"]'), 'TikTok');
  await row.locator('[data-column="name"] input').fill(accountName);
  await row.locator('[data-column="url"] input').fill('https://www.tiktok.com/@matex');
  await choose(page, row.locator('[data-column="status"]'), 'Aktif');
  await choose(page, row.locator('[data-column="shown"]'), 'Published');
  await table.getByTestId('social-followers').fill('450');
  await table.getByTestId('social-content').fill('13');

  const sent = savedBody(page);
  await row.getByTestId('inline-save').click();
  const body = await sent;
  // Only this list goes to the server.
  expect(Object.keys(body)).toEqual(['socials']);
  await expect(rows.nth(start).getByTestId('inline-edit')).toBeVisible();
  await expect(rows.nth(start).locator('[data-column="name"]')).toHaveText(accountName);

  const saved = (await (await owner.get(base)).json()).data.socials.find(
    (item: { name: string }) => item.name === accountName,
  );
  expect(saved).toMatchObject({
    platform: 'tiktok',
    is_active: 1,
    is_public: 1,
    followers: 450,
    content_count: 13,
  });
  expect(saved.key).toBeTruthy();
  expect(errors).toEqual([]);
});

test('an active account cannot be deleted, a fourth on a platform is refused', async ({ page }) => {
  await open(page);
  const table = page.getByTestId('socials');
  const rows = table.getByTestId('inline-row');
  const account = rows.filter({ hasText: accountName });

  await account.getByTestId('inline-edit').click();
  const editing = table.locator('.inline-table-editing').first();
  await expect(editing.getByTestId('inline-remove')).toHaveCount(0);
  await editing.getByTestId('inline-cancel').click();

  // Fill TikTok up to three, then try a fourth.
  for (const name of ['Dua', 'Tiga']) {
    await table.getByTestId('inline-add').click();
    const row = table.locator('.inline-table-editing').first();
    await choose(page, row.locator('[data-column="platform"]'), 'TikTok');
    await row.locator('[data-column="name"] input').fill(`${name} ${runId}`);
    await row.locator('[data-column="url"] input').fill(`https://www.tiktok.com/@${name}`);
    await row.getByTestId('inline-save').click();
    await expect(
      rows.filter({ hasText: `${name} ${runId}` }).getByTestId('inline-edit'),
    ).toBeVisible();
  }
  await table.getByTestId('inline-add').click();
  const fourth = table.locator('.inline-table-editing').first();
  await choose(page, fourth.locator('[data-column="platform"]'), 'TikTok');
  await fourth.locator('[data-column="name"] input').fill('Empat');
  await fourth.locator('[data-column="url"] input').fill('https://www.tiktok.com/@empat');
  await fourth.getByTestId('inline-save').click();
  await expect(fourth.locator('[data-column="platform"] .form-kit-error')).toBeVisible();
  // Trash on a new row just drops it.
  await fourth.getByTestId('inline-remove').click();
  await expect(rows.filter({ hasText: 'Empat' })).toHaveCount(0);

  // An inactive one can go; it is hidden on the website whatever Publikasi said.
  const two = rows.filter({ hasText: `Dua ${runId}` });
  await two.getByTestId('inline-edit').click();
  const removeSent = savedBody(page);
  await table.locator('.inline-table-editing').first().getByTestId('inline-remove').click();
  const body = await removeSent;
  expect(body.socials.map((item: { name: string }) => item.name)).not.toContain(`Dua ${runId}`);
  await expect(two).toHaveCount(0);
});

test('a channel: link from its value, tidy number, one main per type, order', async ({ page }) => {
  await open(page);
  const table = page.getByTestId('channels');
  const rows = table.getByTestId('inline-row');
  const start = await rows.count();

  await table.getByTestId('inline-add').click();
  const row = rows.nth(start);
  await row.locator('[data-column="value"] input').fill('0812 9999 0000');
  await expect(row.locator('[data-column="link"]')).toContainText('https://wa.me/6281299990000');
  // Labels are required and sit in the row's extra part.
  await row.getByTestId('inline-save').click();
  await expect(table.getByTestId('channel-id-label')).toHaveClass(/is-invalid/);
  await table.getByTestId('channel-id-label').fill(`Sales ${runId}`);
  await table.getByTestId('channel-en-label').fill(`Sales EN ${runId}`);
  await choose(page, row.locator('[data-column="rank"]'), 'Utama');
  await choose(page, row.locator('[data-column="shown"]'), 'Published');
  const sent = savedBody(page);
  await row.getByTestId('inline-save').click();
  const body = await sent;
  expect(
    body.channels.filter((c: any) => c.type === 'whatsapp' && c.is_primary === 1),
  ).toHaveLength(1);

  await expect(rows.nth(start).locator('[data-column="value"]')).toHaveText('+6281299990000');
  const data = (await (await owner.get(base)).json()).data;
  const mine = data.channels.find((c: { value: string }) => c.value === '+6281299990000');
  expect(mine.is_primary).toBe(1);
  expect(mine.key).toBeTruthy();

  // Folded, the row sums up its labels; the arrow moves it and saves at once.
  await expect(table.getByTestId('channel-summary').nth(start)).toContainText(`Sales ${runId}`);
  const moved = savedBody(page);
  await rows.nth(start).getByTestId('inline-up').click();
  const order = (await moved).channels.map((c: { key: string }) => c.key);
  expect(order[start - 1]).toBe(mine.key);
  await expect(rows.nth(start - 1).locator('[data-column="value"]')).toHaveText('+6281299990000');
});

test('a topic: email checked on its row, seeded topics without one do not block', async ({
  page,
}) => {
  await open(page);
  const table = page.getByTestId('topics');
  const rows = table.getByTestId('inline-row');
  const start = await rows.count();

  await table.getByTestId('inline-add').click();
  const row = rows.nth(start);
  await row.locator('[data-column="recipient_email"] input').fill('salah.example');
  await row.locator('[data-column="id_label"] input').fill(`Topik ${runId}`);
  await row.locator('[data-column="en_label"] input').fill(`Topic ${runId}`);
  await row.getByTestId('inline-save').click();
  await expect(row.locator('[data-column="recipient_email"] .form-kit-error')).toContainText(
    'Format email salah',
  );
  await row.locator('[data-column="recipient_email"] input').fill('kontak-uji@example.invalid');
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && new URL(r.url()).pathname === base,
  );
  await row.getByTestId('inline-save').click();
  expect((await saved).status()).toBe(200);
  await expect(rows.nth(start).getByTestId('inline-edit')).toBeVisible();

  await rows.nth(start).getByTestId('inline-edit').click();
  await table.locator('.inline-table-editing').getByTestId('inline-remove').click();
  await expect(rows).toHaveCount(start);
});

test('the website shows the accounts, and tags its links so clicks can be told apart', async ({
  page,
}) => {
  await page.goto(`${stack.publicOrigin}/kontak`);
  const header = page.getByTestId('header-socials').first();
  const accounts = (await (await owner.get('/api/public/contact/id-ID')).json()).data.socials;
  const mine = accounts.find((item: { name: string }) => item.name === accountName);
  expect(mine).toBeTruthy();
  const link = page
    .getByTestId('footer-social')
    .filter({ has: page.locator('.ri-tiktok-line') })
    .first();
  await expect(link).toHaveAttribute('href', mine.url);
  await expect(link).toHaveAttribute('data-track', `social:${mine.key}`);
  expect(await header.locator('a').count()).toBeGreaterThanOrEqual(0);

  const sent = page.waitForRequest(
    (r) =>
      r.url().includes('/analytics/event') && (r.postData() ?? '').includes('"outbound_click"'),
  );
  const popup = page.context().waitForEvent('page');
  await link.click();
  await (await popup).close();
  expect(JSON.parse((await sent).postData() ?? '{}').target_key).toBe(`social:${mine.key}`);

  await expect(page.locator(`[data-track^="channel:"]`).first()).toBeVisible();
});

test('the insight band counts per account and per channel', async ({ page, request }) => {
  const data = (await (await owner.get(base)).json()).data;
  const account = data.socials.find((item: { name: string }) => item.name === accountName);
  for (const target of [`social:${account.key}`, `channel:${data.channels[0].key}`]) {
    const response = await request.post(`${stack.apiOrigin}/api/public/analytics/event`, {
      data: {
        event_id: randomUUID(),
        session_id: randomUUID(),
        event_name: 'outbound_click',
        target_key: target,
        path: '/kontak',
        locale: 'id-ID',
        occurred_at: new Date().toISOString(),
      },
    });
    expect(response.status()).toBe(202);
  }

  await open(page);
  const panel = page.getByTestId('insight-panel');
  await expect(panel).toBeVisible();
  const socials = panel.getByTestId('insight-column').nth(0);
  await expect(socials.getByTestId('insight-rank')).toContainText(accountName);
  await expect(socials.getByTestId('insight-rank')).toContainText('450 Follower');
  await expect(socials.getByTestId('missing-platform').first()).toContainText('Facebook');
  await expect(socials.getByTestId('missing-platform')).not.toContainText(['TikTok']);
  const channels = panel.getByTestId('insight-column').nth(1);
  await expect(channels.getByTestId('insight-rank').locator('li').first()).toContainText('1');
  await expect(panel.getByTestId('insight-audit')).toContainText('Total Pesan Form Kontak');
  if (screenshots) {
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.reload();
    await expect(panel).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${screenshots}/contact.png`, fullPage: true });
  }
});
