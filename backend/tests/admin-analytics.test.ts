import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { AddressInfo } from "node:net";

import { pool } from "../src/db";

process.env.JWT_SECRET = "admin-analytics-test-secret";
process.env.PUBLIC_ANALYTICS_ENABLED = "true";

const router = require("../src/ctrl/admin/analytics").default;
const originalQuery = pool.query;
const app = express();
app.use(cookieParser());
app.use(router);
const server = app.listen(0, "127.0.0.1");
let base = "";
let calls: { sql: string; params: unknown[] }[] = [];
let rows: any[][] = [];

const token = jwt.sign(
  { id_admin_acct: 9, alias: "Analytics Tester" },
  process.env.JWT_SECRET,
);

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/analytics/overview`;
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

const request = (query = "?from=2026-10-01&to=2026-10-02") =>
  fetch(`${base}${query}`, { headers: { cookie: `access_token=${token}` } });

const authenticatedRows = () => [
  [
    {
      id_admin_acct: 9,
      alias: "Analytics Tester",
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

test("analytics overview rejects an invalid date range before analytics queries", async () => {
  calls = [];
  rows = [authenticatedRows()[0]];

  const response = await request("?from=2026-01-01&to=2026-10-02");

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "ANALYTICS_RANGE_INVALID");
  assert.equal(calls.length, 1);
});

test("analytics overview is tenant scoped and returns real content totals", async () => {
  calls = [];
  rows = [
    ...authenticatedRows(),
    [
      {
        page_views: 18,
        visitors: 7,
        outbound_clicks: 3,
        contact_starts: 2,
        contact_submissions: 1,
        updated_at: "2026-10-02T07:00:00.000Z",
      },
    ],
    [{ date: "2026-10-02", page_views: 18, visitors: 7 }],
    [{ path: "/produk", page_views: 12, visitors: 6 }],
    [{ source: "Direct", page_views: 10 }],
    [{ country_code: "ID", visitors: 7 }],
    [
      {
        products_total: 53,
        products_published: 51,
        products_draft: 2,
        articles_total: 3,
        articles_published: 2,
        articles_pending: 1,
        faq_active: 4,
        inquiries_today: 1,
      },
    ],
  ];

  const response = await request();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.source, "matex_first_party");
  assert.equal(payload.data.collection_enabled, true);
  assert.equal(payload.data.totals.visitors, 7);
  assert.equal(payload.data.top_pages[0].path, "/produk");
  assert.equal(payload.data.content.products_total, 53);
  assert.equal(payload.data.content.articles_pending, 1);
  assert.equal(payload.data.content.inquiries_today, 1);

  const analyticsCalls = calls.slice(2);
  assert.equal(analyticsCalls.length, 6);
  for (const call of analyticsCalls.slice(0, 5)) {
    assert.equal(call.params[0], 7);
    assert.match(call.sql, /id_master_comp = \?/);
  }
  assert.deepEqual(analyticsCalls[5].params, Array(8).fill(7));
});
