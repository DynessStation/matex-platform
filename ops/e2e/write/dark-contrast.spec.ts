import { expect, test, type Page } from '@playwright/test';

import { admin } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for dark mode text contrast (frontend/admin/src/styles.scss): on the pages
// where dark #212529 text sat on dark surfaces (full system access card, office switch labels,
// website page General tab facts) every visible text reaches 3:1 against its background.
// The brand's white-on-orange buttons are a separate, owner-level choice and are skipped.
test.describe.configure({ mode: 'serial' });

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await expect(async () => {
    await page.locator('#identity').fill(admin.identity);
    await page.locator('#password').fill(admin.password);
    await page.locator('#login_btn').click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
}

/** Visible texts below 3:1 against the first opaque background behind them. */
function lowContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const parse = (value: string) => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(',').map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const backgroundOf = (el: Element | null) => {
      for (let node = el; node; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('gradient')) return null;
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0.5) return c;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const issues: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = (walker.currentNode.textContent ?? '').trim();
      const el = walker.currentNode.parentElement;
      if (!text || !el) continue;
      if (el.closest('.sidebar-wrapper, .page-header, .footer, option, [aria-hidden=true]'))
        continue;
      if (el.closest(':disabled, .disabled, .ng-select-disabled')) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      let opacity = 1;
      for (let node: Element | null = el; node; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      if (opacity === 0) continue;
      const fg = parse(getComputedStyle(el).color);
      const bg = backgroundOf(el);
      if (!fg || !bg) continue;
      if (bg.r === 255 && bg.g === 168 && bg.b === 0) continue;
      const alpha = fg.a * opacity;
      const shown = {
        r: fg.r * alpha + bg.r * (1 - alpha),
        g: fg.g * alpha + bg.g * (1 - alpha),
        b: fg.b * alpha + bg.b * (1 - alpha),
      };
      const [l1, l2] = [lum(shown), lum(bg)];
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3) issues.push(`${text.slice(0, 40)} (${ratio.toFixed(2)})`);
    }
    return issues;
  });
}

async function darkPage(page: Page, path: string): Promise<void> {
  await page.goto(`${stack.adminOrigin}${path}`);
  await page.evaluate(() => document.body.classList.add('dark-only'));
  await expect(page.locator('.title-header h5')).toBeVisible();
  await page.waitForTimeout(800);
}

test('dark mode texts reach 3:1 on the fixed pages', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);

  await darkPage(page, '/admin-account/create');
  await expect(page.locator('.all-access-content .fw-semibold')).toBeVisible();
  expect(await lowContrast(page), '/admin-account/create').toEqual([]);

  await darkPage(page, '/office/create');
  for (const tab of ['Jam Operasional', 'Media', 'Publikasi']) {
    await page.locator('.office-nav .nav-link', { hasText: tab }).first().click();
    await page.waitForTimeout(300);
    expect(await lowContrast(page), `/office/create ${tab}`).toEqual([]);
  }

  await darkPage(page, '/website-page/home');
  await expect(page.locator('.website-page-facts')).toBeVisible();
  expect(await lowContrast(page), '/website-page/home Umum').toEqual([]);
  await page.locator('.vertical-tabs .nav-link', { hasText: 'Konten' }).first().click();
  await page.waitForTimeout(300);
  expect(await lowContrast(page), '/website-page/home Konten').toEqual([]);
});
