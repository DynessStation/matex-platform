import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeNavigationItemInput } from "../src/helper/web-navigation.helper";

const validInput = (): any => ({
  web_navigation_item_key: "about",
  web_navigation_item_sort_order: 1,
  web_navigation_item_status: 1,
  translations: [
    {
      locale: "id-ID",
      label: "Tentang MATEX",
      path: "/path-yang-tidak-dipercaya",
      url: null,
      status: 1,
    },
    {
      locale: "en-US",
      label: "About MATEX",
      path: "/another-untrusted-path",
      url: null,
      status: 1,
    },
  ],
});

test("fixed navigation derives public paths from the selected section", () => {
  const result = normalizeNavigationItemInput(validInput(), "id-ID");

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.deepEqual(
    result.data.translations.map(({ locale, path, url }) => ({
      locale,
      path,
      url,
    })),
    [
      { locale: "id-ID", path: "/tentang-matex", url: null },
      { locale: "en-US", path: "/en/about-matex", url: null },
    ],
  );
});

test("navigation rejects sections outside the fixed public header", () => {
  const input = validInput();
  input.web_navigation_item_key = "marketplace";

  const result = normalizeNavigationItemInput(input, "id-ID");

  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.code, "WEB_NAVIGATION_ITEM_KEY_INVALID");
});

test("navigation requires localized labels for Indonesian and English", () => {
  const input = validInput();
  input.translations = input.translations.slice(0, 1);

  const result = normalizeNavigationItemInput(input, "id-ID");

  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.code, "WEB_NAVIGATION_ITEM_TRANSLATIONS_REQUIRED");
});
