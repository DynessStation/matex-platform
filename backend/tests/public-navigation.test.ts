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
let calls: { sql: string; params: unknown[] }[] = [];
let rows: any[][] = [];

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }

  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/navigation`;

  pool.query = (async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });
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

const navigation = {
  id_web_navigation: 14,
  web_navigation_key: "primary",
  web_navigation_location: "header",
  web_navigation_default_locale: "id-ID",
};

test("missing tenant fails closed before querying", async () => {
  reset();
  delete process.env.PUBLIC_CMS_COMPANY_ID;
  const response = await fetch(`${base}/primary/id-ID`);

  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(((await response.json()) as any).code, "NAVIGATION_UNAVAILABLE");
});

test("only the fixed primary navigation and supported locales are accepted", async () => {
  reset();

  for (const path of [
    "secondary/id-ID",
    "primary/fr-FR",
    "Invalid%20Key/id-ID",
  ]) {
    const response = await fetch(`${base}/${path}`);
    assert.equal(response.status, 404);
  }

  assert.equal(calls.length, 0);
});

test("missing or inactive navigation is a generic 404", async () => {
  reset();
  rows = [[]];
  const response = await fetch(`${base}/primary/id-ID`);

  assert.equal(response.status, 404);
  assert.equal(calls.length, 1);
  assert.equal(((await response.json()) as any).code, "NAVIGATION_NOT_FOUND");
  assert.deepEqual(calls[0].params, [7, "primary"]);

  for (const clause of [
    "id_master_comp = ?",
    "web_navigation_key = ?",
    "web_navigation_status = 1",
    "web_navigation_deleted_at IS NULL",
  ]) {
    assert.ok(calls[0].sql.includes(clause), clause);
  }
});

test("public lookup uses the server tenant and does not join legacy CMS tables", async () => {
  reset();
  rows = [[navigation], []];
  const response = await fetch(`${base}/primary/id-ID?id_master_comp=999`);

  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].params, [7, "primary"]);
  assert.deepEqual(calls[1].params, ["id-ID", "id-ID", 14, 7]);
  assert.equal(calls[1].sql.includes("cms_page"), false);
  assert.equal(calls[1].sql.includes("id_cms_page"), false);
});

test("fixed items keep database order and localized labels", async () => {
  reset();
  rows = [
    [navigation],
    [
      {
        id_web_navigation_item: 1,
        web_navigation_item_key: "home",
        web_navigation_item_sort_order: 0,
        label: "Beranda",
      },
      {
        id_web_navigation_item: 2,
        web_navigation_item_key: "about",
        web_navigation_item_sort_order: 1,
        label: "Tentang MATEX",
      },
      {
        id_web_navigation_item: 3,
        web_navigation_item_key: "categories",
        web_navigation_item_sort_order: 2,
        label: "Kategori",
      },
      {
        id_web_navigation_item: 4,
        web_navigation_item_key: "products",
        web_navigation_item_sort_order: 3,
        label: "Produk",
      },
      {
        id_web_navigation_item: 5,
        web_navigation_item_key: "articles",
        web_navigation_item_sort_order: 4,
        label: "Artikel",
      },
      {
        id_web_navigation_item: 6,
        web_navigation_item_key: "contact",
        web_navigation_item_sort_order: 5,
        label: "Hubungi",
      },
    ],
  ];

  const response = await fetch(`${base}/primary/id-ID`);
  const body = (await response.json()) as any;

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data.items.map((item: any) => [item.key, item.label, item.path]),
    [
      ["home", "Beranda", "/"],
      ["about", "Tentang MATEX", "/tentang-matex"],
      ["categories", "Kategori", "/katalog"],
      ["products", "Produk", "/katalog"],
      ["articles", "Artikel", "/artikel"],
      ["contact", "Hubungi", "/kontak"],
    ],
  );
  assert.deepEqual(body.data.items[0], {
    key: "home",
    label: "Beranda",
    link_type: "internal",
    path: "/",
    url: null,
    target_blank: false,
    icon: null,
    badge: null,
    children: [],
  });
});

test("English uses stable localized paths", async () => {
  reset();
  rows = [
    [navigation],
    [
      {
        id_web_navigation_item: 1,
        web_navigation_item_key: "home",
        web_navigation_item_sort_order: 0,
        label: "Home",
      },
      {
        id_web_navigation_item: 2,
        web_navigation_item_key: "about",
        web_navigation_item_sort_order: 1,
        label: "About MATEX",
      },
      {
        id_web_navigation_item: 3,
        web_navigation_item_key: "contact",
        web_navigation_item_sort_order: 2,
        label: "Contact",
      },
    ],
  ];

  const response = await fetch(`${base}/primary/en-US`);
  const body = (await response.json()) as any;

  assert.equal(response.status, 200);
  assert.deepEqual(calls[1].params, ["en-US", "id-ID", 14, 7]);
  assert.deepEqual(
    body.data.items.map((item: any) => item.path),
    ["/en", "/en/about-matex", "/en/contact-us"],
  );
});

test("unknown, duplicate and legacy alias items cannot extend the fixed header", async () => {
  reset();
  rows = [
    [navigation],
    [
      {
        id_web_navigation_item: 1,
        web_navigation_item_key: "blog",
        web_navigation_item_sort_order: 0,
        label: "Blog",
      },
      {
        id_web_navigation_item: 2,
        web_navigation_item_key: "articles",
        web_navigation_item_sort_order: 1,
        label: "Articles duplicate",
      },
      {
        id_web_navigation_item: 3,
        web_navigation_item_key: "marketplace",
        web_navigation_item_sort_order: 2,
        label: "Marketplace",
      },
      {
        id_web_navigation_item: 4,
        web_navigation_item_key: "contact",
        web_navigation_item_sort_order: 3,
        label: "",
      },
    ],
  ];

  const response = await fetch(`${base}/primary/en-US`);
  const body = (await response.json()) as any;

  assert.equal(response.status, 200);
  assert.deepEqual(body.data.items, [
    {
      key: "articles",
      label: "Blog",
      link_type: "internal",
      path: "/en/articles",
      url: null,
      target_blank: false,
      icon: null,
      badge: null,
      children: [],
    },
  ]);
});
