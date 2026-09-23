import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import express from "express";

import { AddressInfo } from "node:net";

import { pool } from "../src/db";

const router = require("../src/ctrl/public/navigation").default;

const originalQuery = pool.query;

const originalCompany = process.env.PUBLIC_CMS_COMPANY_ID;

const app = express();

app.use(router);

const server = app.listen(0, "127.0.0.1");

let base = "";

let calls: {
  sql: string;
  params: unknown[];
}[] = [];

let rows: any[][] = [];

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }

  base =
    `http://127.0.0.1:` +
    `${(server.address() as AddressInfo).port}` +
    `/api/public/navigation`;

  pool.query = (async (sql: string, params: unknown[]) => {
    calls.push({
      sql,
      params,
    });

    return [rows.shift() || [], []];
  }) as any;
});

after(async () => {
  pool.query = originalQuery;

  if (originalCompany === undefined) {
    delete process.env.PUBLIC_CMS_COMPANY_ID;
  } else {
    process.env.PUBLIC_CMS_COMPANY_ID = originalCompany;
  }

  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  await pool.end();
});

function reset() {
  process.env.PUBLIC_CMS_COMPANY_ID = "7";

  calls = [];

  rows = [];
}

test("missing tenant fails closed before querying", async () => {
  reset();

  delete process.env.PUBLIC_CMS_COMPANY_ID;

  const response = await fetch(`${base}/primary/id-ID`);

  assert.equal(response.status, 503);

  assert.equal(calls.length, 0);

  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = (await response.json()) as any;

  assert.equal(body.code, "NAVIGATION_UNAVAILABLE");
});

test("invalid key and unsupported locale do not query the database", async () => {
  reset();

  const invalidKeyResponse = await fetch(`${base}/Invalid%20Key/id-ID`);

  assert.equal(invalidKeyResponse.status, 404);

  assert.equal(calls.length, 0);

  const invalidLocaleResponse = await fetch(`${base}/primary/fr-FR`);

  assert.equal(invalidLocaleResponse.status, 404);

  assert.equal(calls.length, 0);
});

test("missing or inactive navigation is a generic 404", async () => {
  reset();

  rows = [[]];

  const response = await fetch(`${base}/primary/id-ID`);

  assert.equal(response.status, 404);

  assert.equal(calls.length, 1);

  const body = (await response.json()) as any;

  assert.equal(body.code, "NAVIGATION_NOT_FOUND");

  for (const clause of [
    "id_master_comp = ?",
    "web_navigation_key = ?",
    "web_navigation_status = 1",
    "web_navigation_deleted_at IS NULL",
  ]) {
    assert.ok(calls[0].sql.includes(clause), clause);
  }

  assert.deepEqual(calls[0].params, [7, "primary"]);
});

test("public lookup binds the server tenant and ignores query tenant input", async () => {
  reset();

  rows = [
    [
      {
        id_web_navigation: 14,
        web_navigation_key: "primary",
        web_navigation_location: "header",
        web_navigation_default_locale: "id-ID",
      },
    ],
    [],
  ];

  const response = await fetch(`${base}/primary/id-ID?id_master_comp=999`);

  assert.equal(response.status, 200);

  assert.deepEqual(calls[0].params, [7, "primary"]);

  assert.deepEqual(calls[1].params, ["id-ID", "id-ID", "id-ID", 14, 7]);

  for (const clause of [
    "item.web_navigation_item_status = 1",
    "item.web_navigation_item_deleted_at",
    "cms_page.cms_page_status = 1",
    "cms_page.cms_page_visibility IN (1, 2)",
    "cms_page.cms_page_deleted_at IS NULL",
    "cms_page.cms_page_publish_at <= NOW()",
    "cms_page.cms_page_unpublish_at > NOW()",
    "cms_page_i18n.cms_page_i18n_status = 1",
  ]) {
    assert.ok(calls[1].sql.includes(clause), clause);
  }
});

test("navigation response builds a safe localized tree", async () => {
  reset();

  rows = [
    [
      {
        id_web_navigation: 14,
        web_navigation_key: "primary",
        web_navigation_location: "header",
        web_navigation_default_locale: "id-ID",
      },
    ],
    [
      {
        id_web_navigation_item: 1,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "home",
        web_navigation_item_link_type: "cms_page",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 0,
        label: "Beranda",
        internal_path: null,
        external_url: null,
        cms_page_key: "home",
        cms_page_template: "home",
        cms_page_slug: "home",
      },
      {
        id_web_navigation_item: 2,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "about",
        web_navigation_item_link_type: "cms_page",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 1,
        label: "Tentang Kami",
        internal_path: null,
        external_url: null,
        cms_page_key: "about",
        cms_page_template: "company-profile",
        cms_page_slug: "tentang-kami",
      },
      {
        id_web_navigation_item: 3,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "products",
        web_navigation_item_link_type: "internal",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: "Baru",
        web_navigation_item_badge_color: "bg-danger",
        web_navigation_item_sort_order: 2,
        label: "Produk",
        internal_path: "/produk",
        external_url: null,
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
      {
        id_web_navigation_item: 4,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "marketplace",
        web_navigation_item_link_type: "label",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 3,
        label: "Beli Online",
        internal_path: null,
        external_url: null,
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
      {
        id_web_navigation_item: 5,
        id_parent_web_navigation_item: 4,
        web_navigation_item_key: "shopee",
        web_navigation_item_link_type: "external",
        web_navigation_item_target_blank: 1,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 0,
        label: "Shopee",
        internal_path: null,
        external_url: "https://shopee.co.id/matex",
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
    ],
  ];

  const response = await fetch(`${base}/primary/id-ID`);

  assert.equal(response.status, 200);

  const body = (await response.json()) as any;

  assert.equal(body.code, "NAVIGATION_FOUND");

  assert.equal(body.data.key, "primary");

  assert.equal(body.data.location, "header");

  assert.equal(body.data.locale, "id-ID");

  assert.equal(body.data.items.length, 4);

  assert.equal(body.data.items[0].key, "home");

  assert.equal(body.data.items[0].path, "/");

  assert.equal(body.data.items[1].path, "/tentang-kami");

  assert.equal(body.data.items[2].path, "/produk");

  assert.deepEqual(body.data.items[2].badge, {
    text: "Baru",
    color: "bg-danger",
  });

  assert.equal(body.data.items[3].key, "marketplace");

  assert.equal(body.data.items[3].path, null);

  assert.equal(body.data.items[3].children.length, 1);

  assert.equal(body.data.items[3].children[0].key, "shopee");

  assert.equal(body.data.items[3].children[0].target_blank, true);

  assert.equal(
    body.data.items[3].children[0].url,
    "https://shopee.co.id/matex",
  );

  assert.equal(body.data.items[0].id_web_navigation_item, undefined);

  assert.equal(body.data.items[1].cms_page_slug, undefined);
});

test("english CMS links use production-style localized paths", async () => {
  reset();

  rows = [
    [
      {
        id_web_navigation: 14,
        web_navigation_key: "primary",
        web_navigation_location: "header",
        web_navigation_default_locale: "id-ID",
      },
    ],
    [
      {
        id_web_navigation_item: 1,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "home",
        web_navigation_item_link_type: "cms_page",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 0,
        label: "Home",
        internal_path: null,
        external_url: null,
        cms_page_key: "home",
        cms_page_template: "home",
        cms_page_slug: "home",
      },
      {
        id_web_navigation_item: 2,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "about",
        web_navigation_item_link_type: "cms_page",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 1,
        label: "About Us",
        internal_path: null,
        external_url: null,
        cms_page_key: "about",
        cms_page_template: "company-profile",
        cms_page_slug: "about-us",
      },
    ],
  ];

  const response = await fetch(`${base}/primary/en-US`);

  assert.equal(response.status, 200);

  const body = (await response.json()) as any;

  assert.equal(body.data.items[0].path, "/en");

  assert.equal(body.data.items[1].path, "/en/about-us");

  assert.deepEqual(calls[1].params, ["en-US", "id-ID", "en-US", 14, 7]);
});

test("unsafe, unpublished and orphaned items are omitted", async () => {
  reset();

  rows = [
    [
      {
        id_web_navigation: 14,
        web_navigation_key: "primary",
        web_navigation_location: "header",
        web_navigation_default_locale: "id-ID",
      },
    ],
    [
      {
        id_web_navigation_item: 10,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "unsafe-internal",
        web_navigation_item_link_type: "internal",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 0,
        label: "Unsafe",
        internal_path: "//evil.example/path",
        external_url: null,
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
      {
        id_web_navigation_item: 11,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "unsafe-external",
        web_navigation_item_link_type: "external",
        web_navigation_item_target_blank: 1,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 1,
        label: "Unsafe external",
        internal_path: null,
        external_url: "javascript:alert(1)",
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
      {
        id_web_navigation_item: 12,
        id_parent_web_navigation_item: null,
        web_navigation_item_key: "missing-page",
        web_navigation_item_link_type: "cms_page",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 2,
        label: "Draft page",
        internal_path: null,
        external_url: null,
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
      {
        id_web_navigation_item: 13,
        id_parent_web_navigation_item: 10,
        web_navigation_item_key: "orphan-child",
        web_navigation_item_link_type: "internal",
        web_navigation_item_target_blank: 0,
        web_navigation_item_icon: null,
        web_navigation_item_badge_text: null,
        web_navigation_item_badge_color: null,
        web_navigation_item_sort_order: 0,
        label: "Orphan",
        internal_path: "/safe",
        external_url: null,
        cms_page_key: null,
        cms_page_template: null,
        cms_page_slug: null,
      },
    ],
  ];

  const response = await fetch(`${base}/primary/id-ID`);

  assert.equal(response.status, 200);

  const body = (await response.json()) as any;

  assert.deepEqual(body.data.items, []);
});
