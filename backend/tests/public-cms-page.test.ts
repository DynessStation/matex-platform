import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { AddressInfo } from "node:net";
import { pool } from "../src/db";
// No database or file writes: use deterministic storage settings for URL projection.
process.env.FILE_STORAGE_ROOT ||= process.cwd();
process.env.FILE_BASE_URL ||= "http://localhost/files";
const router = require("../src/ctrl/public/cms-page").default;

const originalQuery = pool.query;
const originalCompany = process.env.PUBLIC_CMS_COMPANY_ID;
const app = express();
app.use(router);
const server = app.listen(0, "127.0.0.1");
let base = "";
let calls: { sql: string; params: unknown[] }[] = [];
let rows: any[][] = [];

before(async () => {
  if (!server.listening)
    await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/cms-page`;
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

test("missing tenant fails closed before querying", async () => {
  reset();
  delete process.env.PUBLIC_CMS_COMPANY_ID;
  const response = await fetch(`${base}/id-ID/about`);
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("unsupported locale is not resolved to a draft or another language", async () => {
  reset();
  const response = await fetch(`${base}/fr-FR/about`);
  assert.equal(response.status, 404);
  assert.equal(calls.length, 0);
});

test("missing or ineligible page is a generic 404 and does not fetch media", async () => {
  reset();
  const response = await fetch(`${base}/en-US/missing`);
  assert.equal(response.status, 404);
  assert.equal(calls.length, 1);
  assert.equal((await response.json()).code, "CMS_PAGE_NOT_FOUND");
});

test("public lookup binds server tenant and slug, with publication boundary filters", async () => {
  reset();
  const slug = "x' OR 1=1 --";
  await fetch(`${base}/id-ID/${encodeURIComponent(slug)}?id_master_comp=99`);
  assert.deepEqual(calls[0].params, [7, "id-ID", slug]);
  assert.ok(!calls[0].sql.includes(slug));
  for (const clause of [
    "p.cms_page_deleted_at IS NULL",
    "p.cms_page_status = 1",
    "p.cms_page_visibility IN (1, 2)",
    "t.cms_page_i18n_status = 1",
    "t.id_master_comp = p.id_master_comp",
    "p.cms_page_publish_at <= NOW()",
    "p.cms_page_unpublish_at > NOW()",
  ])
    assert.ok(calls[0].sql.includes(clause), clause);
});

test("unlisted response is noindex and strips internal fields and storage paths", async () => {
  reset();
  rows = [
    [
      {
        id_cms_page: 42,
        cms_page_visibility: 2,
        cms_page_locale: "id-ID",
        cms_page_key: "about",
        cms_page_template: "company-profile",
        cms_page_slug: "about",
        cms_page_title: "About",
        cms_page_content: "<p>Public</p>",
        cms_page_content_json: JSON.stringify({ sections: ["intro"] }),
        cms_page_meta_robots: "index, follow",
        cms_page_settings_json: "private",
      },
    ],
    [{ locale: "id-ID", slug: "about" }],
    [
      {
        role: "hero",
        storage_path: "cms/hero.png",
        name: "Hero",
        alt: "Alt",
        caption: "Caption",
      },
    ],
  ];
  const response = await fetch(`${base}/id-ID/about`);
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.seo.robots, "noindex, nofollow");
  assert.equal(data.seo.title, "About");
  assert.equal(data.key, "about");
  assert.equal(data.template, "company-profile");
  assert.deepEqual(data.content_json, { sections: ["intro"] });
  assert.equal(data.id_cms_page, undefined);
  assert.equal(data.cms_page_settings_json, undefined);
  assert.equal(data.attachments[0].storage_path, undefined);
  assert.equal(data.attachments[0].alt, "Alt");
  assert.deepEqual(calls[1].params, [42, 7]);
  assert.deepEqual(calls[2].params.slice(0, 3), ["id-ID", 42, 7]);
  assert.ok(calls[2].params.includes("home_main"));
  for (const clause of [
    "c.cms_page_attachment_is_public = 1",
    "a.attachment_status = 1",
    "a.deleted_at IS NULL",
  ]) {
    assert.ok(calls[2].sql.includes(clause), clause);
  }
});
