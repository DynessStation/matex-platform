import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { AddressInfo } from "node:net";
import { pool } from "../src/db";
import keyhsid from "../src/hsid";

process.env.FILE_STORAGE_ROOT ||= process.cwd();
process.env.FILE_BASE_URL ||= "http://localhost/files";
process.env.JWT_SECRET = "website-page-write-test-secret";

const router = require("../src/ctrl/admin/website-page").default;
const originalQuery = pool.query;
const originalGetConnection = pool.getConnection;
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(router);
const server = app.listen(0, "127.0.0.1");
let base = "";
let poolRows: any[][] = [];
let poolCalls: { sql: string; params: unknown[] }[] = [];
let connectionCalls: { sql: string; params: unknown[] }[] = [];
let began = 0;
let committed = 0;
let rolledBack = 0;
let released = 0;
let connectionRequested = 0;

const token = jwt.sign(
  { id_admin_acct: 9, alias: "Tester" },
  process.env.JWT_SECRET,
);

const connection = {
  beginTransaction: async () => {
    began += 1;
  },
  commit: async () => {
    committed += 1;
  },
  rollback: async () => {
    rolledBack += 1;
  },
  release: () => {
    released += 1;
  },
  query: async (sql: string, params: unknown[] = []) => {
    connectionCalls.push({ sql, params });
    if (sql.includes("FROM website_page") && sql.includes("FOR UPDATE")) {
      return [[{ id_website_page: 42, website_page_is_published: 1 }], []];
    }
    if (sql.includes("FROM attachment")) {
      return [
        [
          {
            id_attachment: 27,
            mime_type: "image/webp",
            width: 1600,
            height: 900,
          },
        ],
        [],
      ];
    }
    if (sql.includes("INSERT INTO website_page_media\n")) {
      return [{ insertId: 88, affectedRows: 1 }, []];
    }
    if (sql.includes("INSERT INTO audit_log")) {
      return [{ insertId: 99, affectedRows: 1 }, []];
    }
    return [{ affectedRows: 1 }, []];
  },
};

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/website-page`;
  pool.query = (async (sql: string, params: unknown[]) => {
    poolCalls.push({ sql, params });
    return [poolRows.shift() || [], []];
  }) as any;
  pool.getConnection = (async () => {
    connectionRequested += 1;
    return connection;
  }) as any;
});

after(async () => {
  pool.query = originalQuery;
  pool.getConnection = originalGetConnection;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});

function reset() {
  poolCalls = [];
  connectionCalls = [];
  began = 0;
  committed = 0;
  rolledBack = 0;
  released = 0;
  connectionRequested = 0;
  poolRows = [
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
    [{ id_admin_acct: 9, id_master_comp: 7, admin_acct_status: 1 }],
  ];
}

const request = (key: string, body: unknown) =>
  fetch(`${base}/${key}`, {
    method: "PUT",
    headers: {
      cookie: `access_token=${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const translations = [
  {
    locale: "id-ID",
    path: "this-input-is-ignored",
    title: "Tentang MATEX",
    summary: "Ringkasan",
    body_html: "<p>Isi</p>",
    content: { features: [] },
    seo: { title: "Tentang MATEX", schema: { "@type": "AboutPage" } },
    is_published: true,
  },
  {
    locale: "en-US",
    path: "also-ignored",
    title: "About MATEX",
    summary: "Summary",
    body_html: "<p>Content</p>",
    content: { features: [] },
    seo: { title: "About MATEX" },
    is_published: true,
  },
];

test("invalid payloads are rejected before a transaction begins", async () => {
  reset();
  const response = await request("about", {
    is_published: true,
    translations: [translations[0]],
    media: [],
  });
  assert.equal(response.status, 400);
  assert.equal(
    (await response.json()).code,
    "WEBSITE_PAGE_TRANSLATIONS_REQUIRED",
  );
  assert.equal(connectionRequested, 0);
  assert.equal(began, 0);
});

test("fixed paths and all related page data are saved in one transaction", async () => {
  reset();
  const response = await request("about", {
    is_published: true,
    publish_at: null,
    unpublish_at: null,
    translations,
    media: [
      {
        id_attachment: keyhsid.idAttachment.encode(27),
        slot: "about_content",
        is_visible: true,
        click_action: "external",
        click_target: "https://example.com/company",
        translations: [
          { locale: "id-ID", alt_text: "Pabrik MATEX", caption: null },
          { locale: "en-US", alt_text: "MATEX factory", caption: null },
        ],
      },
    ],
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).code, "WEBSITE_PAGE_UPDATED");
  assert.equal(began, 1);
  assert.equal(committed, 1);
  assert.equal(rolledBack, 0);
  assert.equal(released, 1);

  const translationWrites = connectionCalls.filter((call) =>
    call.sql.includes("INSERT INTO website_page_i18n"),
  );
  assert.equal(translationWrites.length, 2);
  assert.equal(translationWrites[0].params[3], "tentang-matex");
  assert.equal(translationWrites[1].params[3], "about-matex");

  assert.ok(
    connectionCalls.some((call) =>
      call.sql.includes("DELETE FROM website_page_media"),
    ),
  );
  assert.ok(
    connectionCalls.some((call) =>
      call.sql.includes("INSERT INTO website_page_media_i18n"),
    ),
  );
  assert.ok(
    connectionCalls.some((call) => call.sql.includes("INSERT INTO audit_log")),
  );
});

test("fixed metadata pages keep their localized paths", async () => {
  const cases = [
    { key: "contact", paths: ["kontak", "contact-us"] },
    { key: "faq", paths: ["faq", "faq"] },
    { key: "career", paths: ["karir", "careers"] },
  ];

  for (const item of cases) {
    reset();
    const response = await request(item.key, {
      is_published: true,
      publish_at: null,
      unpublish_at: null,
      translations,
      media: [],
    });

    assert.equal(response.status, 200);
    const writes = connectionCalls.filter((call) =>
      call.sql.includes("INSERT INTO website_page_i18n"),
    );
    assert.deepEqual(
      writes.map((call) => call.params[3]),
      item.paths,
    );
  }
});

test("unavailable media rolls back before existing relations are replaced", async () => {
  reset();
  connection.query = (async (sql: string, params: unknown[] = []) => {
    connectionCalls.push({ sql, params });
    if (sql.includes("FROM website_page") && sql.includes("FOR UPDATE")) {
      return [[{ id_website_page: 42, website_page_is_published: 1 }], []];
    }
    if (sql.includes("FROM attachment")) return [[], []];
    return [{ affectedRows: 1 }, []];
  }) as any;

  const response = await request("about", {
    is_published: true,
    translations,
    media: [
      {
        id_attachment: keyhsid.idAttachment.encode(27),
        slot: "about_content",
        is_visible: true,
        click_action: "none",
        click_target: null,
        translations: [],
      },
    ],
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "WEBSITE_PAGE_MEDIA_UNAVAILABLE");
  assert.equal(committed, 0);
  assert.equal(rolledBack, 1);
  assert.equal(released, 1);
  assert.equal(
    connectionCalls.some((call) =>
      call.sql.includes("DELETE FROM website_page_media"),
    ),
    false,
  );
});
