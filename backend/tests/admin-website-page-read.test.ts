import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { AddressInfo } from "node:net";
import { pool } from "../src/db";

process.env.FILE_STORAGE_ROOT ||= process.cwd();
process.env.FILE_BASE_URL ||= "http://localhost/files";
process.env.JWT_SECRET = "website-page-read-test-secret";

const router = require("../src/ctrl/admin/website-page").default;
const originalQuery = pool.query;
const app = express();
app.use(cookieParser());
app.use(router);
const server = app.listen(0, "127.0.0.1");
let base = "";
let calls: { sql: string; params: unknown[] }[] = [];
let rows: any[][] = [];

const token = jwt.sign(
  { id_admin_acct: 9, alias: "Tester" },
  process.env.JWT_SECRET,
);

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/website-page`;
  pool.query = (async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });
    return [rows.shift() || [], []];
  }) as any;
});

after(async () => {
  pool.query = originalQuery;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});

const request = (key: string) =>
  fetch(`${base}/${key}`, {
    headers: { cookie: `access_token=${token}` },
  });

function reset() {
  calls = [];
  rows = [
    [
      {
        id_admin_acct: 9,
        alias: "Tester",
        id_master_comp: 7,
        id_access: 3,
        is_all_access: 1,
        admin_acct_status: 1,
        access_master_comp: 7,
        admin_access_status: 1,
      },
    ],
  ];
}

test("unknown keys are rejected after normal authentication", async () => {
  reset();
  const response = await request("custom-page");
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, "WEBSITE_PAGE_NOT_FOUND");
  assert.equal(calls.length, 1);
});

test("page lookup requires the dedicated website page permission", async () => {
  reset();
  rows[0][0].is_all_access = 0;
  rows.push([{ id_admin_permission: 81 }]);

  const response = await request("custom-page");

  assert.equal(response.status, 404);
  assert.deepEqual(calls[1].params, [3, "website_page.view"]);
});

test("page lookup is restricted to the signed-in admin company", async () => {
  reset();
  rows.push(
    [
      {
        id_admin_acct: 9,
        id_master_comp: 7,
        admin_acct_status: 1,
      },
    ],
    [],
  );

  const response = await request("about");
  assert.equal(response.status, 404);
  assert.deepEqual(calls[1].params, [9]);
  assert.deepEqual(calls[2].params, [7, "about"]);
  assert.ok(calls[2].sql.includes("page.id_master_comp = ?"));
});

test("detail returns only fixed-page fields and groups media translations", async () => {
  reset();
  rows.push(
    [
      {
        id_admin_acct: 9,
        id_master_comp: 7,
        admin_acct_status: 1,
      },
    ],
    [
      {
        id_website_page: 42,
        website_page_key: "about",
        website_page_default_locale: "id-ID",
        website_page_is_published: 1,
        website_page_publish_at: null,
        website_page_unpublish_at: null,
        created_by_alias: "Admin",
        updated_by_alias: "Editor",
        created: "2026-10-03T00:00:00.000Z",
        updated: "2026-10-03T01:00:00.000Z",
      },
    ],
    [
      {
        website_page_locale: "id-ID",
        website_page_path: "tentang-matex",
        website_page_title: "Tentang MATEX",
        website_page_summary: "Ringkasan",
        website_page_body_html: "<p>Isi</p>",
        website_page_content_json: JSON.stringify({ features: [] }),
        website_page_schema_json: JSON.stringify({ "@type": "AboutPage" }),
        website_page_translation_is_published: 1,
      },
    ],
    [
      {
        id_website_page_media: 5,
        id_attachment: 27,
        website_page_media_slot: "about_content",
        website_page_media_sort_order: 0,
        website_page_media_is_visible: 1,
        website_page_media_click_action: "none",
        website_page_media_click_target: null,
        collection_name: "media_library",
        name: "Factory",
        original_name: "factory.jpg",
        file_name: "factory.webp",
        mime_type: "image/webp",
        extension: "webp",
        file_size: 1234,
        width: 1600,
        height: 900,
        storage_path: "media/factory.webp",
        website_page_media_locale: "en-US",
        website_page_media_caption: "Factory",
        website_page_media_alt_text: "MATEX factory",
      },
      {
        id_website_page_media: 5,
        id_attachment: 27,
        website_page_media_slot: "about_content",
        website_page_media_sort_order: 0,
        website_page_media_is_visible: 1,
        website_page_media_click_action: "none",
        website_page_media_click_target: null,
        collection_name: "media_library",
        name: "Factory",
        original_name: "factory.jpg",
        file_name: "factory.webp",
        mime_type: "image/webp",
        extension: "webp",
        file_size: 1234,
        width: 1600,
        height: 900,
        storage_path: "media/factory.webp",
        website_page_media_locale: "id-ID",
        website_page_media_caption: "Pabrik",
        website_page_media_alt_text: "Pabrik MATEX",
      },
    ],
  );

  const response = await request("about");
  assert.equal(response.status, 200);
  const { data } = await response.json();

  assert.equal(data.key, "about");
  assert.equal(data.effective_status, "published");
  assert.equal(data.template, undefined);
  assert.equal(data.parent, undefined);
  assert.deepEqual(data.translations[0].content, { features: [] });
  assert.deepEqual(data.translations[0].seo.schema, {
    "@type": "AboutPage",
  });
  assert.equal(data.media.length, 1);
  assert.equal(data.media[0].slot, "about_content");
  assert.equal(data.media[0].storage_path, undefined);
  assert.equal(data.media[0].translations.length, 2);
  assert.equal(data.created_by, "Admin");

  assert.deepEqual(calls[2].params, [7, "about"]);
  assert.deepEqual(calls[3].params, [42, 7]);
  assert.deepEqual(calls[4].params, [42, 7]);
  assert.ok(calls[4].sql.includes("attachment.id_master_comp = ?"));
});
