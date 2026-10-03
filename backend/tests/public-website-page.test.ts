import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { AddressInfo } from "node:net";
import { pool } from "../src/db";

process.env.FILE_STORAGE_ROOT ||= process.cwd();
process.env.FILE_BASE_URL ||= "http://localhost/files";

const router = require("../src/ctrl/public/website-page").default;
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
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/website-page`;
  pool.query = (async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });
    return [rows.shift() || [], []];
  }) as any;
});

after(async () => {
  pool.query = originalQuery;
  if (originalCompany === undefined) delete process.env.PUBLIC_CMS_COMPANY_ID;
  else process.env.PUBLIC_CMS_COMPANY_ID = originalCompany;
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

test("missing deployment company fails closed before querying", async () => {
  reset();
  delete process.env.PUBLIC_CMS_COMPANY_ID;
  const response = await fetch(`${base}/id-ID/tentang-matex`);
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("unsupported locale and malformed paths do not query", async () => {
  reset();
  assert.equal((await fetch(`${base}/fr-FR/about-matex`)).status, 404);
  assert.equal((await fetch(`${base}/id-ID/not%20safe`)).status, 404);
  assert.equal(calls.length, 0);
});

test("missing or unpublished content returns a generic 404", async () => {
  reset();
  const response = await fetch(`${base}/en-US/missing`);
  assert.equal(response.status, 404);
  assert.equal(calls.length, 1);
  assert.equal((await response.json()).code, "WEBSITE_PAGE_NOT_FOUND");
});

test("lookup is tenant-bound and enforces both publication levels", async () => {
  reset();
  await fetch(`${base}/id-ID/tentang-matex?id_master_comp=99`);
  assert.deepEqual(calls[0].params, [7, "id-ID", "tentang-matex"]);
  for (const clause of [
    "translation.id_master_comp = page.id_master_comp",
    "page.website_page_is_published = 1",
    "translation.website_page_translation_is_published = 1",
    "page.website_page_publish_at <= NOW()",
    "page.website_page_unpublish_at > NOW()",
  ]) {
    assert.ok(calls[0].sql.includes(clause), clause);
  }
});

test("response exposes the clean website contract and safe media", async () => {
  reset();
  rows = [
    [
      {
        id_website_page: 42,
        website_page_key: "about",
        website_page_locale: "id-ID",
        website_page_path: "tentang-matex",
        website_page_title: "Tentang MATEX",
        website_page_summary: "Tentang perusahaan",
        website_page_body_html: "<p>Isi</p>",
        website_page_content_json: JSON.stringify({ features: [] }),
        website_page_social_title: "Kenali MATEX",
      },
    ],
    [
      { locale: "en-US", path: "about-matex" },
      { locale: "id-ID", path: "tentang-matex" },
    ],
    [
      {
        slot: "about_content",
        storage_path: "website/about.webp",
        name: "About",
        alt_text: "Pabrik MATEX",
        caption: "",
        click_action: "external",
        click_target: "https://example.com/company",
      },
    ],
  ];

  const response = await fetch(`${base}/id-ID/tentang-matex`);
  assert.equal(response.status, 200);
  const { data } = await response.json();

  assert.equal(data.key, "about");
  assert.equal(data.path, "tentang-matex");
  assert.deepEqual(data.content, { features: [] });
  assert.equal(data.template, undefined);
  assert.equal(data.id_website_page, undefined);
  assert.equal(data.seo.title, "Tentang MATEX");
  assert.equal(data.seo.social_title, "Kenali MATEX");
  assert.equal(data.media[0].slot, "about_content");
  assert.equal(data.media[0].storage_path, undefined);
  assert.equal(data.media[0].alt_text, "Pabrik MATEX");
  assert.equal(data.media[0].click_action, "external");

  assert.deepEqual(calls[1].params, [42, 7]);
  assert.deepEqual(calls[2].params.slice(0, 3), ["id-ID", 42, 7]);
  for (const clause of [
    "relation.website_page_media_is_visible = 1",
    "attachment.id_master_comp = ?",
    "attachment.attachment_status = 1",
    "attachment.deleted_at IS NULL",
  ]) {
    assert.ok(calls[2].sql.includes(clause), clause);
  }
});
