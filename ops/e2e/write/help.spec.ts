import { expect, test, type Page } from '@playwright/test';

import { admin } from './api-contract';
import { stack } from './stack.mjs';

// Browser contract for the admin help (frontend/admin/src/app/shared/components/ui/help):
// the "?" tip (U-4) shows a short note on hover or keeps it open after a click, and its
// "Selengkapnya" opens the help drawer (U-5) at the same section; the drawer lists the
// sections and jumps to the clicked one. Guides live in public/assets/help/*.md.
test.describe.configure({ mode: 'serial' });

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator('#identity').fill(admin.identity);
  await page.locator('#password').fill(admin.password);
  await page.locator('#login_btn').click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

test('the page tip shows a note on hover, stays after a click, and closes outside', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);

  await page.goto(`${stack.adminOrigin}/faq`);
  const tip = page.locator('.title-header app-help-tip button');
  const note = page.locator('.help-tip-popover');

  // Hover: the page summary without its "Untuk apa:" label; leaving hides it.
  await tip.hover();
  await expect(note).toBeVisible();
  await expect(note.locator('p')).not.toContainText('Untuk apa');
  await expect(note.locator('p')).toContainText(/\S/);
  await page.mouse.move(5, 600);
  await expect(note).toBeHidden();

  // Hovering into the note keeps it open, so its link can be clicked.
  await tip.hover();
  await note.hover();
  await page.waitForTimeout(400);
  await expect(note).toBeVisible();
  await page.mouse.move(5, 600);
  await expect(note).toBeHidden();

  // Click: stays open when the cursor leaves, closes on a click outside.
  await tip.click();
  await page.mouse.move(5, 600);
  await page.waitForTimeout(400);
  await expect(note).toBeVisible();
  await expect(tip).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.title-header h5').click();
  await expect(note).toBeHidden();

  // A second click on the tip closes it too; Escape as well.
  await tip.click();
  await expect(note).toBeVisible();
  await tip.click();
  await expect(note).toBeHidden();
  await tip.click();
  await page.keyboard.press('Escape');
  await expect(note).toBeHidden();

  expect(errors).toEqual([]);
});

test('"Selengkapnya" opens the drawer at the section, and every placed tip has its section', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const drawer = page.locator('app-help-drawer .help-drawer');

  for (const [path, title] of [
    ['/dashboard', 'Halaman Dasbor'],
    ['/public-analytics', 'Halaman Analitik Publik'],
    ['/seo-console', 'Halaman SEO dan Mesin Pencari'],
  ]) {
    await page.goto(`${stack.adminOrigin}${path}`);
    await expect(page.locator('app-help-tip[section]').first()).toBeVisible();
    const sections = await page
      .locator('app-help-tip[section]')
      .evaluateAll((tips) => tips.map((tip) => tip.getAttribute('section')!));
    expect(sections.length, path).toBeGreaterThan(0);

    // The first section tip: its note, then the drawer scrolled to that section.
    const tip = page.locator(`app-help-tip[section="${sections[0]}"] button`).first();
    await tip.hover();
    await page.locator('.help-tip-popover .help-tip-more').click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('#help-drawer-title')).toHaveText(title);
    const target = drawer.locator(`#help-${sections[0]}`);
    await expect(target).toHaveClass(/is-target/);
    await expect(target).toBeInViewport();

    // Every tip on the page points at a section that exists in the guide.
    for (const section of sections) {
      await expect(drawer.locator(`#help-${section}`), `${path} #${section}`).toHaveCount(1);
    }

    await drawer.locator('.help-drawer-close').click();
    await expect(drawer).toBeHidden();
  }

  expect(errors).toEqual([]);
});

test('the header button opens the page guide; sections, other guides, and navigation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await login(page);
  const drawer = page.locator('app-help-drawer .help-drawer');

  // The guide of the current page, below the header; wide screens make room for it.
  await page.goto(`${stack.adminOrigin}/product`);
  await page.locator('.header-help').click();
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('#help-drawer-title')).toHaveText('Halaman Produk');
  await expect(drawer.locator('.help-summary')).toContainText('Untuk apa');
  const [headerBottom, drawerTop] = await page.evaluate(() => [
    document.querySelector('.page-header')!.getBoundingClientRect().bottom,
    document.querySelector('.help-drawer')!.getBoundingClientRect().top,
  ]);
  expect(Math.abs(drawerTop - headerBottom)).toBeLessThanOrEqual(1);
  // The page narrows with a short transition, without a horizontal scroll.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('.page-body .card')!.getBoundingClientRect().right <=
            document.querySelector('.help-drawer')!.getBoundingClientRect().left &&
          document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(page.locator('.tooltip')).toHaveCount(0);

  // A section link jumps to that section.
  const links = drawer.locator('.help-toc a');
  await expect(links).not.toHaveCount(0);
  const last = links.last();
  const id = (await last.getAttribute('href'))!.slice(1);
  await last.click();
  await expect(drawer.locator(`#${id}`)).toHaveClass(/is-target/);
  await expect(drawer.locator(`#${id}`)).toBeInViewport();

  // The page stays usable while the guide is open: going to another page shows its guide.
  await page.goto(`${stack.adminOrigin}/faq`);
  await page.locator('.header-help').click();
  await expect(drawer.locator('#help-drawer-title')).toHaveText('Halaman FAQ');
  await page.locator('a.sidebar-link, a.sidebar-title', { hasText: 'Media' }).first().click();
  await page.waitForURL(/\/media(?:[/?#]|$)/);
  await expect(drawer.locator('#help-drawer-title')).toHaveText('Halaman Media');

  // Every guide in the list loads.
  const select = drawer.locator('.help-drawer-switch select');
  const keys = await select
    .locator('option')
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(keys.length).toBe(22);
  for (const key of keys) {
    await select.selectOption(key);
    await expect(drawer.locator('.help-section').first(), key).toBeVisible();
    await expect(drawer.locator('.help-drawer-muted'), key).toHaveCount(0);
  }

  // Escape closes it, and the page gets its width back.
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/help-drawer-open/);

  expect(errors).toEqual([]);
});

test('every "?" on lists and forms points at an anchor in its guide', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const drawer = page.locator('app-help-drawer .help-drawer');
  const select = drawer.locator('.help-drawer-switch select');

  for (const path of [
    '/admin-account/create',
    '/admin-access/create',
    '/admin-permission/create',
    '/chair/create',
    '/office/create',
    '/product',
    '/product/create',
    '/category',
    '/blog/create',
    '/faq/create',
    '/website-page/home',
    '/public-contact',
    '/activity-log',
    '/account',
  ]) {
    await page.goto(`${stack.adminOrigin}${path}`);
    await expect(page.locator('.title-header h5')).toBeVisible();

    // Tips inside tabs exist only while their tab is open.
    const found = new Set<string>();
    const collect = async () => {
      const tips = await page.evaluate(() =>
        [...document.querySelectorAll('app-help-tip[data-anchor]')].map(
          (tip) => `${tip.getAttribute('data-guide') ?? ''}|${tip.getAttribute('data-anchor')}`,
        ),
      );
      tips.forEach((tip) => found.add(tip));
    };
    await collect();
    const tabs = page.locator('.page-body .nav-link');
    for (let index = 0; index < (await tabs.count()); index++) {
      await tabs.nth(index).click();
      await collect();
    }
    expect(found.size, path).toBeGreaterThan(0);

    // Each tip's guide (the page's own unless the tip names one) has its anchor.
    await page.locator('.header-help').click();
    await expect(drawer.locator('.help-section').first()).toBeVisible();
    const own = await select.inputValue();
    for (const tip of found) {
      const [guide, anchor] = tip.split('|');
      const key = guide || own;
      if ((await select.inputValue()) !== key) {
        await select.selectOption(key);
        await expect(drawer.locator('.help-section').first()).toBeVisible();
      }
      await expect(drawer.locator(`[id="help-${anchor}"]`), `${path} ${key}#${anchor}`).toHaveCount(1);
    }
    await drawer.locator('.help-drawer-close').click();
  }

  expect(errors).toEqual([]);
});
