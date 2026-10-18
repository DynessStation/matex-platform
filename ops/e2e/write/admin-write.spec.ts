import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

import { stack } from "./stack.mjs";

// Write-flow scenarios against the isolated e2e stack. They create real rows in the
// throwaway matex_e2e database, so they run in order and share one unique run id.
test.describe.configure({ mode: "serial" });

const { admin } = JSON.parse(fs.readFileSync(stack.stateFile, "utf8")) as {
  admin: { identity: string; password: string };
};
const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "sample.png");
const run = Date.now().toString(36);

async function login(page: Page): Promise<void> {
  await page.goto(`${stack.adminOrigin}/auth/login`);
  await page.locator("#identity").fill(admin.identity);
  await page.locator("#password").fill(admin.password);
  await page.locator("#login_btn").click();
  await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
}

async function openTab(page: Page, name: string): Promise<void> {
  await page.locator("button[id^=ngb-nav-]", { hasText: name }).click();
}

async function chooseSelect2(page: Page, control: string, option: string): Promise<void> {
  await page.locator(`select2[formcontrolname=${control}] .select2-selection`).click();
  await page.locator(".select2-results__option", { hasText: option }).click();
}

async function typeInEditor(page: Page, index: number, text: string): Promise<void> {
  const editor = page.locator(".NgxEditor__Content:visible").nth(index);
  await editor.click();
  await page.keyboard.type(text);
}

async function uploadThroughModal(page: Page): Promise<void> {
  const modal = page.locator(".modal-content");
  await expect(modal).toBeVisible();
  const uploadTab = modal.locator(".nav-link", { hasText: /Unggah|Upload/ });
  if (await uploadTab.count()) await uploadTab.first().click();
  await modal.locator("input[type=file]").setInputFiles(fixture);
  await modal.locator("#media_upload_btn").click();
}

test("admin can log in and reach the dashboard", async ({ page }) => {
  await login(page);
  await expect(page.locator("body")).toContainText(/Dasbor|Dashboard/);
});

test("admin can upload an image to the media library", async ({ page }) => {
  await login(page);
  await page.goto(`${stack.adminOrigin}/media`);
  await page.getByText("Tambah Media", { exact: true }).click();
  await uploadThroughModal(page);
  await expect(page.locator(".modal-content")).toBeHidden();

  const image = page.locator(".library-box img").first();
  await expect(image).toBeVisible();
  const source = await image.getAttribute("src");
  expect(source).toBeTruthy();
  const file = await page.request.get(new URL(source!, stack.adminOrigin).href);
  expect(file.status()).toBe(200);
});

test("admin can publish a product that appears on the public site", async ({ page }) => {
  const slug = `e2e-produk-${run}`;
  const name = `Produk Uji ${run}`;
  const categoryName = `Kategori Uji ${run}`;

  await login(page);

  // Products need a category; the fresh e2e database has none, so create one through the API.
  const category = await page.request.post(`${stack.apiOrigin}/api/v1/product-categories`, {
    data: {
      key: `e2e-category-${run}`,
      status: "published",
      translations: [
        { locale: "id-ID", slug: `e2e-kategori-${run}`, name: categoryName },
        { locale: "en-US", slug: `e2e-category-${run}`, name: `Test Category ${run}` },
      ],
    },
  });
  expect(category.status(), await category.text()).toBe(201);

  await page.goto(`${stack.adminOrigin}/product/create`);
  await page.locator("input[formcontrolname=key]").fill(`e2e-product-${run}`);
  await page.locator("input[formcontrolname=sku]").fill(`E2E-${run}`.toUpperCase());
  await chooseSelect2(page, "status", "Dipublikasikan");
  const categories = page.locator("app-advance-dropdown");
  await categories.locator(".category-breadcrumb-select").click();
  await categories
    .locator(".select-category-box li", { hasText: categoryName })
    .getByRole("link", { name: "Select" })
    .click();

  await openTab(page, "Konten & Bahasa");
  await page.locator("input[formcontrolname=id_slug]").fill(slug);
  await page.locator("input[formcontrolname=id_name]").fill(name);
  await page.getByRole("button", { name: /EN\s*English/ }).click();
  await page.locator("input[formcontrolname=en_slug]").fill(`${slug}-en`);
  await page.locator("input[formcontrolname=en_name]").fill(`Test Product ${run}`);

  await openTab(page, "Harga & Kanal");
  const amounts = page.locator("input[formcontrolname=amount]:visible");
  await expect(amounts.first()).toBeVisible();
  for (let index = 0; index < (await amounts.count()); index += 1) {
    await amounts.nth(index).fill("150000");
  }
  const labels = page.locator("input[formcontrolname=label]:visible");
  for (let index = 0; index < (await labels.count()); index += 1) {
    if (!(await labels.nth(index).inputValue())) await labels.nth(index).fill(`Harga ${index + 1}`);
  }

  // The save button only shows on the last tab.
  await openTab(page, "SEO");
  await page.locator("button#product_btn").click();
  await page.waitForURL(/\/product(?:[?#]|$)/);
  await expect(page.locator("body")).toContainText(name);

  const response = await page.goto(`${stack.publicOrigin}/produk/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1, h2").filter({ hasText: name }).first()).toBeVisible();
});

test("admin can publish an article that appears on the public site", async ({ page }) => {
  const slug = `e2e-artikel-${run}`;
  const title = `Artikel Uji ${run}`;

  await login(page);
  await page.goto(`${stack.adminOrigin}/blog/create`);
  await page.locator("#key").fill(`e2e-article-${run}`);

  await openTab(page, "Konten & Bahasa");
  await page.locator("#id_slug").fill(slug);
  await page.locator("#id_title").fill(title);
  await typeInEditor(page, 0, "Isi artikel uji otomatis.");
  await page.getByRole("button", { name: /EN\s*English/ }).click();
  await page.locator("input[formcontrolname=en_slug]").fill(`${slug}-en`);
  await page.locator("input[formcontrolname=en_title]").fill(`Test Article ${run}`);
  await typeInEditor(page, 0, "Automated test article body.");

  // Pick the image uploaded to the media library in the previous test.
  // (Uploading a new image from inside this picker is tracked separately as audit FE-007.)
  await openTab(page, "Media");
  await page.locator("li.choosefile-input").first().click();
  const modal = page.locator(".modal-content");
  const card = modal.locator(".library-box label").first();
  await expect(card).toBeVisible();
  await card.click();
  const insert = modal.getByRole("button", { name: /Pilih Media|Insert Media/ });
  await expect(insert).toBeEnabled();
  await insert.click();
  await expect(modal).toBeHidden();

  await openTab(page, "Publikasi");
  await page.locator("input[formcontrolname=status][value=published]").check();
  await page.locator("button#article_save").click();
  await page.waitForURL(/\/blog(?:[?#]|$)/);
  await expect(page.locator("body")).toContainText(title);

  const response = await page.goto(`${stack.publicOrigin}/artikel/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toContainText(title);
});
