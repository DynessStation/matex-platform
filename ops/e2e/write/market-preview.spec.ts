import { expect, test, type Page } from '@playwright/test';

import { stack } from './stack.mjs';

// Browser contract for the market sign in the public header
// (frontend/public/src/app/shared/components/header/widgets/market-preview, P-1): account,
// favorites, and cart icons with a "Segera" label on desktop and phone; any of them opens one
// "MATEX Market segera hadir" panel with WhatsApp (or the contact page) and the catalog; the
// /account page says the same; no "versi 2" wording reaches visitors.
test.describe.configure({ mode: 'serial' });

const icons = (page: Page) => page.locator('app-market-preview .market-preview__icon');
const panel = (page: Page) => page.locator('app-market-preview .market-preview__panel');

/** The primary WhatsApp link the panel should use, or null when the site has none. */
async function whatsapp(page: Page, locale = 'id-ID'): Promise<string | null> {
  const body = await (
    await page.request.get(`${stack.apiOrigin}/api/public/contact/${locale}`)
  ).json();
  const channels = (body.data?.channels ?? []).filter((item: any) => item.type === 'whatsapp');
  return (channels.find((item: any) => item.is_primary) ?? channels[0])?.url ?? null;
}

test('desktop: three icons with "Segera" open one coming-soon panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto(`${stack.publicOrigin}/`);

  await expect(icons(page)).toHaveCount(3);
  await expect(page.locator('app-market-preview .market-preview__badge')).toHaveText('Segera');
  await expect(icons(page).nth(0)).toHaveAttribute('aria-label', 'Akun, segera hadir');
  await expect(icons(page).nth(1)).toHaveAttribute('aria-label', 'Favorit, segera hadir');
  await expect(icons(page).nth(2)).toHaveAttribute('aria-label', 'Keranjang, segera hadir');

  await icons(page).nth(1).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toContainText('MATEX Market segera hadir');
  await expect(icons(page).nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(panel(page).locator('li.current')).toHaveText('Simpan favorit');
  const link = await whatsapp(page);
  const primary = panel(page).locator('.market-preview__primary');
  if (link) {
    await expect(primary).toHaveText(/Pesan via WhatsApp/);
    await expect(primary).toHaveAttribute('href', link);
  } else {
    await expect(primary).toHaveText(/Hubungi kami/);
    await expect(primary).toHaveAttribute('href', '/kontak');
  }
  await expect(panel(page).locator('.market-preview__secondary')).toHaveAttribute(
    'href',
    '/katalog',
  );

  // Another icon keeps the panel and marks its own feature; the same icon, Escape, and a
  // click outside close it.
  await icons(page).nth(2).click();
  await expect(panel(page).locator('li.current')).toHaveText('Keranjang dan pesanan online');
  await icons(page).nth(2).click();
  await expect(panel(page)).toHaveCount(0);
  await icons(page).nth(0).click();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await icons(page).nth(0).click();
  await page.mouse.click(40, 500);
  await expect(panel(page)).toHaveCount(0);

  await expect(page.locator('body')).not.toContainText(/versi 2|version 2/i);
  expect(errors).toEqual([]);
});

test('phone: all three icons show and the panel fits the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${stack.publicOrigin}/`);
  for (let index = 0; index < 3; index++) await expect(icons(page).nth(index)).toBeVisible();
  await icons(page).nth(0).click();
  await expect(panel(page)).toBeVisible();
  const box = (await panel(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});

test('the account page says the same in both languages', async ({ page }) => {
  await page.goto(`${stack.publicOrigin}/account`);
  await expect(page.locator('h1')).toHaveText('MATEX Market segera hadir');
  await expect(page.locator('.market-features li')).toHaveText([
    /Akun pelanggan/,
    /Simpan favorit/,
    /Keranjang dan pesanan online/,
  ]);
  await expect(page.locator('.secondary-link')).toHaveAttribute('href', '/katalog');
  await expect(page.locator('body')).not.toContainText(/versi 2|version 2/i);

  await page.goto(`${stack.publicOrigin}/en/account`);
  await expect(page.locator('h1')).toHaveText('MATEX Market is coming soon');
  await expect(page.locator('.secondary-link')).toHaveAttribute('href', '/en/catalog');
  const link = await whatsapp(page, 'en-US');
  if (link) await expect(page.locator('.back-home')).toHaveAttribute('href', link);
});
