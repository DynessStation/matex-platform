import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'node:net';

import { pool } from '../src/db';

process.env.JWT_SECRET = 'seo-console-route-test-secret';
delete process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
delete process.env.GOOGLE_PAGESPEED_API_KEY;

const router = require('../src/ctrl/admin/seo-console').default;
const originalQuery = pool.query;
const app = express();
app.use(cookieParser());
app.use(router);
const server = app.listen(0, '127.0.0.1');
let base = '';
let queryCalls = 0;

const token = jwt.sign({ id_admin_acct: 9, alias: 'SEO Console Tester' }, process.env.JWT_SECRET);

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once('listening', resolve));
  }
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/seo-console`;
  pool.query = (async () => {
    queryCalls += 1;
    return [
      [
        {
          id_admin_acct: 9,
          alias: 'SEO Console Tester',
          id_master_comp: 7,
          id_access: 3,
          is_all_access: 1,
          admin_acct_status: 1,
          access_master_comp: 7,
          admin_access_status: 1,
        },
      ],
      [],
    ];
  }) as any;
});

after(async () => {
  pool.query = originalQuery;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});

const request = (path: string) =>
  fetch(`${base}${path}`, {
    headers: { cookie: `access_token=${token}` },
  });

test('SEO overview rejects unsupported ranges without calling Google', async () => {
  queryCalls = 0;
  const response = await request('/overview?days=30');
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.code, 'SEO_RANGE_INVALID');
  assert.equal(queryCalls, 1);
});

test('SEO overview reports a safe unconfigured state', async () => {
  queryCalls = 0;
  const response = await request('/overview?days=28');
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.code, 'SEO_CONSOLE_NOT_CONFIGURED');
  assert.equal(payload.data.configured, false);
  assert.equal(payload.data.range.days, 28);
  assert.equal(payload.data.page_speed_configured, false);
  assert.equal(queryCalls, 1);
});
