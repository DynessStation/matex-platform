import { expect, test } from "@playwright/test";

import { absoluteUrl, adminOrigin, expectNoLegacyBranding } from "./helpers";

const identity = process.env.MATEX_E2E_ADMIN_IDENTITY;
const password = process.env.MATEX_E2E_ADMIN_PASSWORD;

test.describe("MATEX admin release candidate", () => {
  test("login renders without template branding", async ({ page }) => {
    const response = await page.goto(absoluteUrl(adminOrigin, "/auth/login"), {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    await expect(page.locator("#identity")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#login_btn")).toBeVisible();
    await expectNoLegacyBranding(await page.locator("body").innerText());
  });

  for (const path of ["/order", "/theme-option"]) {
    test(`${path} is no longer exposed as an active admin feature`, async ({ page }) => {
      await page.goto(absoluteUrl(adminOrigin, path), {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("body")).toContainText(
        /tidak ditemukan|not found|404/i,
      );
      await expectNoLegacyBranding(await page.locator("body").innerText());
    });
  }

  test("authorized admin reaches the MATEX dashboard", async ({ page }) => {
    test.skip(
      !identity || !password,
      "Set MATEX_E2E_ADMIN_IDENTITY and MATEX_E2E_ADMIN_PASSWORD to run the authenticated flow.",
    );

    await page.goto(absoluteUrl(adminOrigin, "/auth/login"), {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#identity").fill(identity!);
    await page.locator("#password").fill(password!);
    await page.locator("#login_btn").click();
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/);
    await expect(page.locator("body")).toContainText(/dashboard|dasbor/i);
    await expectNoLegacyBranding(await page.locator("body").innerText());
  });
});
