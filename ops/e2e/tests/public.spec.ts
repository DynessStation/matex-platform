import { expect, test } from '@playwright/test';

import { absoluteUrl, expectNoLegacyBranding, expectedPublicOrigin, publicOrigin } from './helpers';

const publicPages = [
  '/',
  '/en',
  '/katalog',
  '/en/catalog',
  '/artikel',
  '/en/articles',
  '/faq',
  '/en/faq',
  '/kontak',
  '/en/contact-us',
  '/tentang-matex',
  '/en/about-matex',
  '/syarat-ketentuan',
  '/en/terms-and-conditions',
];

test.describe('MATEX public release candidate', () => {
  for (const path of publicPages) {
    test(`${path} renders with production metadata`, async ({ page }) => {
      const response = await page.goto(absoluteUrl(publicOrigin, path), {
        waitUntil: 'domcontentloaded',
      });

      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
      await expectNoLegacyBranding(await page.locator('body').innerText());

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', absoluteUrl(expectedPublicOrigin, path));
    });
  }

  for (const path of [
    '/account',
    '/en/account',
    '/cart',
    '/en/cart',
    '/wishlist',
    '/en/wishlist',
  ]) {
    test(`${path} clearly identifies its version 2 status`, async ({ page }) => {
      const response = await page.goto(absoluteUrl(publicOrigin, path), {
        waitUntil: 'domcontentloaded',
      });

      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toContainText(
        /versi 2|version 2|segera hadir|coming soon/i,
      );
      await expectNoLegacyBranding(await page.locator('body').innerText());
    });
  }

  test('unknown public URL returns a real noindex 404', async ({ page }) => {
    const response = await page.goto(
      absoluteUrl(publicOrigin, '/__matex_browser_test_not_found__'),
      { waitUntil: 'domcontentloaded' },
    );

    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expectNoLegacyBranding(await page.locator('body').innerText());
  });
});
