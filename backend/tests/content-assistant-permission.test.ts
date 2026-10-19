import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'node:net';

import { pool } from '../src/db';

process.env.JWT_SECRET = 'content-assistant-permission-test-secret';
delete process.env.OPENAI_API_KEY;

const router = require('../src/ctrl/admin/content-assistant').default;
const originalQuery = pool.query;
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(router);
const server = app.listen(0, '127.0.0.1');
let base = '';
let hasAssistantPermission = false;
let permissionChecks = 0;

const token = jwt.sign({ id_admin_acct: 11, alias: 'Content Editor' }, process.env.JWT_SECRET);

before(async () => {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once('listening', resolve));
  }
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/content-assistant`;
  pool.query = (async (sql: string, params?: unknown[]) => {
    if (sql.includes('INSERT INTO audit_log')) return [{ insertId: 1 }, []];
    if (sql.includes('FROM admin_access_permission')) {
      permissionChecks += 1;
      assert.deepEqual(params, [5, 'content_assistant.use']);
      return [hasAssistantPermission ? [{ id_admin_permission: 99 }] : [], []];
    }
    return [
      [
        {
          id_admin_acct: 11,
          alias: 'Content Editor',
          id_master_comp: 7,
          id_access: 5,
          is_all_access: 0,
          admin_acct_status: 1,
          access_master_comp: 7,
          access_name: 'Editor',
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

const post = (withToken = true) =>
  fetch(base, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(withToken ? { cookie: `access_token=${token}` } : {}),
    },
    body: JSON.stringify({}),
  });

test('content assistant requires a session', async () => {
  const response = await post(false);
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.code, 'AUTH_TOKEN_REQUIRED');
});

test('content assistant rejects admins without content_assistant.use', async () => {
  hasAssistantPermission = false;
  permissionChecks = 0;
  const response = await post();
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.code, 'AUTH_PERMISSION_DENIED');
  assert.equal(permissionChecks, 1);
});

test('content assistant lets permitted admins reach request validation', async () => {
  hasAssistantPermission = true;
  permissionChecks = 0;
  const response = await post();
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.code, 'CONTENT_ASSISTANT_PAYLOAD_INVALID');
  assert.equal(permissionChecks, 1);
});
