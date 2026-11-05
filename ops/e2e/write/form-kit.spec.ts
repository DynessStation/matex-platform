import { expect, test, type Page } from '@playwright/test';

import { admin, login, runId } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract of the V1.2 shared parts (frontend/admin/src/app/shared/components/ui/form-kit,
// inline-table, insight, coming-soon), on the sample page /ui-kit that only non-production builds
// have.
test.describe.configure({ mode: 'serial' });

async function open(page: Page) {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
  await page.goto(`${stack.adminOrigin}/ui-kit`);
  await expect(page.getByTestId('inline-table')).toBeVisible();
}

test('the heading follows the title, the address follows until it is customized', async ({
  page,
}) => {
  await open(page);
  const heading = page.getByTestId('form-heading');
  await expect(heading).toContainText('Tanpa Judul');

  await page.locator('#new_title').pressSequentially('Kasur Latex Terbaik!');
  await expect(heading).toHaveText('Kasur Latex Terbaik!');
  await expect(page.locator('#new_slug')).toHaveValue('kasur-latex-terbaik');
  await expect(page.locator('#new_slug')).toHaveAttribute('readonly', '');

  // A custom address is cleaned on closing, and the title stops moving it.
  const main = page.locator('.title-slug').first();
  await main.getByTestId('auto-field-edit').click();
  await page.locator('#new_slug').fill('Alamat Saya Sendiri');
  await main.getByTestId('auto-field-confirm').click();
  await expect(page.locator('#new_slug')).toHaveValue('alamat-saya-sendiri');
  await page.locator('#new_title').pressSequentially(' Lagi');
  await expect(page.locator('#new_slug')).toHaveValue('alamat-saya-sendiri');

  // Escape puts the old value back.
  await main.getByTestId('auto-field-edit').click();
  await page.locator('#new_slug').fill('batal');
  await page.locator('#new_slug').press('Escape');
  await expect(page.locator('#new_slug')).toHaveValue('alamat-saya-sendiri');
});

test('a used address is reported, a saved record keeps its address', async ({ page }) => {
  const owner = await login(admin.identity, admin.password);
  const used = `kit-terpakai-${runId}`;
  const created = await owner.post('/api/v1/articles', {
    data: {
      status: 'draft',
      translations: [
        { locale: 'id-ID', slug: used, title: 'Terpakai', body: '<p>Isi</p>' },
        { locale: 'en-US', slug: `${used}-en`, title: 'Used', body: '<p>Body</p>' },
      ],
    },
  });
  expect(created.status()).toBe(201);

  await open(page);
  await page.locator('#new_title').pressSequentially(used);
  await expect(page.getByTestId('slug-duplicate')).toBeVisible();
  await page.locator('#new_title').pressSequentially('-bebas');
  await expect(page.getByTestId('slug-duplicate')).toHaveCount(0);

  await owner.delete(`/api/v1/articles/${(await created.json()).data.id}`);
  await owner.dispose();

  const saved = page.getByTestId('saved-form');
  await page.locator('#saved_title').pressSequentially(' Diubah');
  await expect(page.locator('#saved_slug')).toHaveValue('judul-tersimpan');
  await expect(saved.getByTestId('internal-key')).toContainText('judul-tersimpan');

  await saved.getByTestId('auto-field-edit').click();
  await page.locator('#saved_slug').fill('alamat-pindah');
  await saved.getByTestId('auto-field-confirm').click();
  await expect(saved.getByTestId('slug-moved')).toBeVisible();
});

test('the tab dot and save note tell what is left', async ({ page }) => {
  await open(page);
  const dot = page.locator('.tab-status');
  await expect(dot).toHaveAttribute('data-state', 'warn');
  await page.getByTestId('form-submit').click();
  await expect(dot).toHaveAttribute('data-state', 'error');
  await expect(page.getByTestId('form-submit-note')).toBeVisible();

  await page.locator('#new_title').pressSequentially('Judul');
  await expect(dot).toHaveAttribute('data-state', 'warn');
  await expect(page.getByTestId('form-submit-note')).toHaveCount(0);
  await page.locator('#excerpt').fill('Ringkasan');
  await expect(dot).toHaveAttribute('data-state', 'ok');
});

test('a value the system fills can be set and put back', async ({ page }) => {
  await open(page);
  const field = page.locator('app-auto-field').filter({ has: page.locator('#canonical') });
  await expect(page.locator('#canonical')).toHaveValue(/alamat-otomatis/);
  await field.getByTestId('auto-field-edit').click();
  await page.locator('#canonical').fill('https://matexindo.com/lain');
  await field.getByTestId('auto-field-confirm').click();
  await expect(page.locator('#canonical')).toHaveValue('https://matexindo.com/lain');
  await field.getByTestId('auto-field-edit').click();
  await field.getByTestId('auto-field-reset').click();
  await expect(page.locator('#canonical')).toHaveValue(/alamat-otomatis/);
});

test('the table edits one row at a time, validates, and saves through the page', async ({
  page,
}) => {
  await open(page);
  const rows = page.getByTestId('inline-row');
  await expect(rows).toHaveCount(2);

  // Editing a row: its pencil becomes a check, and the other rows wait.
  await rows.nth(0).getByTestId('inline-edit').click();
  await expect(rows.nth(0).getByTestId('inline-save')).toBeVisible();
  await expect(rows.nth(1).getByTestId('inline-edit')).toBeDisabled();
  await expect(page.getByTestId('inline-add')).toBeDisabled();
  // An active row has no delete button.
  await expect(rows.nth(0).getByTestId('inline-remove')).toHaveCount(0);

  // Escape leaves it unchanged.
  const name = rows.nth(0).locator('[data-column="name"] input');
  await name.fill('Berubah');
  await name.press('Escape');
  await expect(rows.nth(0).locator('[data-column="name"]')).toHaveText('Akun Contoh');

  // A new row: validation stops the save, then it lands at the end.
  await page.getByTestId('inline-add').click();
  await expect(rows).toHaveCount(3);
  await rows.nth(2).getByTestId('inline-save').click();
  await expect(rows.nth(2).locator('.form-kit-error')).toHaveCount(2);
  await rows.nth(2).locator('[data-column="name"] input').fill('@matex');
  await rows.nth(2).locator('[data-column="url"] input').fill('bukan alamat');
  await rows.nth(2).getByTestId('inline-save').click();
  await expect(rows.nth(2).locator('[data-column="url"] .form-kit-error')).toBeVisible();
  await rows.nth(2).locator('[data-column="url"] input').fill('https://www.tiktok.com/@matex');

  // The dropdown shows the choices, with the status as a pill.
  await rows.nth(2).locator('[data-column="status"] .inline-table-toggle').click();
  await page.locator('.inline-table-menu .dropdown-item', { hasText: 'Aktif' }).first().click();
  await expect(
    rows.nth(2).locator('[data-column="status"] .inline-table-toggle .inline-table-pill-success'),
  ).toBeVisible();

  // A failed save keeps the row open.
  await page.locator('#fail-next').check();
  await rows.nth(2).getByTestId('inline-save').click();
  await expect(rows.nth(2).getByTestId('inline-save')).toBeVisible();
  await rows.nth(2).getByTestId('inline-save').click();
  await expect(rows.nth(2).getByTestId('inline-edit')).toBeVisible();
  await expect(rows.nth(2).locator('[data-column="name"]')).toHaveText('@matex');
});

test('the table moves, folds, and removes rows', async ({ page }) => {
  await open(page);
  const rows = page.getByTestId('inline-row');

  await expect(rows.nth(0).getByTestId('inline-up')).toBeDisabled();
  await expect(rows.nth(1).getByTestId('inline-down')).toBeDisabled();
  await rows.nth(0).getByTestId('inline-down').click();
  await expect(rows.nth(0).locator('[data-column="name"]')).toHaveText('@contoh');

  // Folding hides the row's extra part; opening the row always shows it.
  const detail = page.getByTestId('inline-detail').nth(0);
  await expect(detail.getByTestId('detail-open')).toBeVisible();
  await detail.getByTestId('inline-fold').click();
  await expect(detail.getByTestId('detail-summary')).toBeVisible();
  await rows.nth(0).getByTestId('inline-edit').click();
  await detail.getByTestId('detail-input').fill('Catatan baru');
  await rows.nth(0).getByTestId('inline-save').click();
  await detail.getByTestId('inline-fold').click();
  await expect(detail.getByTestId('detail-open')).toHaveText('Catatan baru');

  // An inactive row can be removed; a new one is just dropped.
  await rows.nth(0).getByTestId('inline-edit').click();
  await rows.nth(0).getByTestId('inline-remove').click();
  await expect(rows).toHaveCount(1);
  await page.getByTestId('inline-add').click();
  await rows.nth(1).getByTestId('inline-remove').click();
  await expect(rows).toHaveCount(1);
});

test('the insight band opens and closes, is remembered, and fits a phone', async ({ page }) => {
  await open(page);
  const panel = page.getByTestId('insight-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('insight-column')).toHaveCount(3);
  await expect(page.getByTestId('insight-total')).toHaveText('20');
  await expect(panel.locator('[data-state="warn"] a')).toHaveAttribute(
    'href',
    /\/blog\?audit=no-en/,
  );

  // The range switch moves.
  const range = panel.locator('.insight-range').first().getByRole('button');
  await expect(range.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await range.nth(0).click();
  await expect(range.nth(0)).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('insight-toggle').click();
  await expect(panel).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('inline-table')).toBeVisible();
  await expect(panel).toHaveCount(0);
  await page.getByTestId('insight-toggle').click();
  await expect(panel).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(panel).toBeVisible();
  const columns = await page
    .getByTestId('insight-column')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().left));
  expect(new Set(columns).size).toBe(1);
  // The table is wider than the phone: it scrolls inside its own box, not the page.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the not-built-yet view shows its drawing', async ({ page }) => {
  await open(page);
  const view = page.getByTestId('coming-soon');
  await expect(view).toContainText('Fitur masih dalam pengembangan');
  const loaded = await view
    .locator('img')
    .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  expect(loaded).toBe(true);
});
