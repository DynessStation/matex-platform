import { expect, request, test, type Page } from '@playwright/test';

import {
  admin,
  adminReferences,
  createAccessProfile,
  createAdminAccount,
  login,
} from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the Email page (frontend/admin/src/app/components/email) against a stand-in
// of the mail provider: reading, the locked frame, writing, and the contact page's numbers.
test.describe.configure({ mode: 'serial' });

const screenshots = process.env.MATEX_E2E_SHOTS;
const mail = 'http://127.0.0.1:3199';

const provider = () => request.newContext({ baseURL: mail });

async function signIn(page: Page, identity = admin.identity, password = admin.password) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(identity);
    await page.locator('#password').fill(password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

async function open(page: Page) {
  await signIn(page);
  await page.goto(`${stack.adminOrigin}/email`);
  await expect(page.getByTestId('email-board')).toBeVisible();
}

test.beforeEach(async () => {
  await (await provider()).post('/__reset');
});

test.afterAll(async () => {
  await (await provider()).post('/__reset');
});

test('the menu leads to the page, and opening a message marks it read', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await expect(page.locator('a[href="/email"]').first()).toBeAttached();
  await expect(page.getByTestId('email-address')).toHaveText('info@example.invalid');
  await expect(page.getByTestId('email-folder')).toHaveCount(3);
  await expect(page.getByTestId('email-unread')).toHaveText('1');

  const rows = page.getByTestId('email-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveClass(/unseen/);

  await rows.nth(0).click();
  await expect(page).toHaveURL(/uid=3/);
  await expect(page.getByTestId('email-open-subject')).toHaveText('Tanya harga kasur');
  await expect(rows.nth(0)).not.toHaveClass(/unseen/);
  await expect(page.getByTestId('email-unread')).toHaveCount(0);

  // Marked unread again, the message closes.
  await page.getByTestId('email-mark-unread').click();
  await expect(rows.nth(0)).toHaveClass(/unseen/);
  await expect(page.getByTestId('email-message')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a mail cannot run in the page or load from outside until allowed', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('track.png')) outside.push(r.url());
  });
  await open(page);
  const title = await page.title();
  await page.getByTestId('email-row').nth(0).click();

  const frame = page.getByTestId('email-frame');
  await expect(frame).toHaveAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
  const inside = page.frameLocator('[data-testid="email-frame"]');
  await expect(inside.locator('#isi')).toContainText('berapa');
  // Its script did not reach this page, and the picture was not asked for.
  expect(await page.title()).toBe(title);
  expect(outside).toEqual([]);

  await expect(page.getByTestId('email-images')).toBeVisible();
  await page.getByTestId('email-images').getByRole('button').click();
  await expect(page.getByTestId('email-images')).toHaveCount(0);
  await expect.poll(() => outside.length).toBeGreaterThan(0);
  expect(await page.title()).toBe(title);
  if (screenshots) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${screenshots}/email.png` });
  }
});

test('searching and moving between folders stay in the address', async ({ page }) => {
  await open(page);
  const search = page.getByTestId('email-search');
  await search.fill('distributor');
  await search.press('Enter');
  await expect(page).toHaveURL(/search=distributor/);
  await expect(page.getByTestId('email-row')).toHaveCount(1);

  await page.getByTestId('email-folder').filter({ hasText: 'Trash' }).click();
  await expect(page).toHaveURL(/folder=INBOX.Trash/);
  await expect(page).not.toHaveURL(/search=/);
  await expect(page.getByTestId('email-row')).toHaveCount(0);
  await expect(page.locator('.email-list .email-empty')).toBeVisible();
});

test('a reply points at its message and quotes it; a new message is checked', async ({ page }) => {
  await open(page);
  await page.getByTestId('email-row').nth(1).click();
  await page.getByTestId('email-reply').click();
  await expect(page.locator('#email_to')).toHaveValue('sari.kantor@example.invalid');
  await expect(page.locator('#email_subject')).toHaveValue('Re: Kerja sama distributor');
  await expect(page.locator('#email_text')).toHaveValue(/Kami tertarik bekerja sama/);
  await page.locator('#email_text').fill('Terima kasih, kami hubungi segera.');
  await page.getByTestId('email-send').click();
  await expect(page.getByTestId('email-compose')).toHaveCount(0);

  const sent = await (await (await provider()).get('/__sent')).json();
  expect(sent[0]).toMatchObject({
    to: ['sari.kantor@example.invalid'],
    subject: 'Re: Kerja sama distributor',
    inReplyTo: { uid: 2, folder: 'INBOX' },
  });

  await page.getByTestId('email-new').click();
  await page.getByTestId('email-send').click();
  await expect(page.locator('#email_to')).toHaveClass(/is-invalid/);
  await page.locator('#email_to').fill('bukan alamat');
  await page.locator('#email_subject').fill('Uji');
  await page.locator('#email_text').fill('Isi');
  await page.getByTestId('email-send').click();
  // The server refuses it, and what was written stays.
  await expect(page.locator('#email_text')).toHaveValue('Isi');
  await page.getByTestId('email-discard').click();
  await expect(page.getByTestId('email-compose')).toHaveCount(0);
});

test('the trash button moves the message and the list follows', async ({ page }) => {
  await open(page);
  await page.getByTestId('email-row').nth(2).click();
  await page.getByTestId('email-trash').click();
  await expect(page.getByTestId('email-row')).toHaveCount(2);
  await expect(page.getByTestId('email-message')).toHaveCount(0);
  await page.getByTestId('email-folder').filter({ hasText: 'Trash' }).click();
  await page.getByTestId('email-row').nth(0).click();
  await expect(page.getByTestId('email-trash')).toHaveCount(0);
});

test('the contact page shows the mailbox numbers and leads to the mail', async ({ page }) => {
  await open(page);
  await page.goto(`${stack.adminOrigin}/public-contact`);
  const audit = page.getByTestId('insight-panel').getByTestId('insight-audit');
  await expect(audit).toContainText('info@example.invalid');
  await expect(audit).toContainText('Dibalas');
  await expect(audit).toContainText('Unread');
  await audit.locator('a', { hasText: 'Buka email' }).click();
  await expect(page).toHaveURL(/\/email/);
});

test('an account that may only read sees no writing or trash buttons', async ({ page }) => {
  const owner = await login(admin.identity, admin.password);
  const profile = await createAccessProfile(owner, 'Baca Email', ['email.view']);
  const account = await createAdminAccount(
    owner,
    'Pembaca',
    await adminReferences(owner, { id_access: profile }),
  );
  await owner.dispose();
  await signIn(page, account.identity, account.password);
  await page.goto(`${stack.adminOrigin}/email`);
  await expect(page.getByTestId('email-board')).toBeVisible();
  await page.getByTestId('email-row').nth(0).click();
  await expect(page.getByTestId('email-open-subject')).toHaveText('Tanya harga kasur');
  await expect(page.getByTestId('email-mark-unread')).toBeVisible();
  await expect(page.getByTestId('email-new')).toHaveCount(0);
  await expect(page.getByTestId('email-reply')).toHaveCount(0);
  await expect(page.getByTestId('email-forward')).toHaveCount(0);
  await expect(page.getByTestId('email-trash')).toHaveCount(0);
});

test('without a token or with the service down, the pages say so', async ({ page }) => {
  await signIn(page);
  const body = (data: unknown) => ({
    json: { success: true, code: 'X', message: 'x', data },
  });
  await page.route('**/api/v1/email/mailboxes', (route) =>
    route.fulfill(body({ configured: false, mailboxes: [] })),
  );
  await page.route('**/api/v1/public-contact/insight/mail', (route) =>
    route.fulfill(body({ configured: false })),
  );
  await page.goto(`${stack.adminOrigin}/email`);
  await expect(page.getByTestId('email-not-configured')).toBeVisible();
  await expect(page.getByTestId('email-new')).toHaveCount(0);

  // The contact page falls back to how the form's mail was delivered.
  await page.goto(`${stack.adminOrigin}/public-contact`);
  await expect(page.getByTestId('insight-panel').getByTestId('insight-audit')).toContainText(
    'Total Pesan Form Kontak',
  );

  await page.unroute('**/api/v1/email/mailboxes');
  await page.route('**/api/v1/email/mailboxes', (route) =>
    route.fulfill({
      status: 502,
      json: { success: false, code: 'MAIL_UNAVAILABLE', message: 'x' },
    }),
  );
  await page.goto(`${stack.adminOrigin}/email`);
  await expect(page.getByTestId('email-failed')).toBeVisible();
});
