import assert from 'node:assert/strict';
import { after } from 'node:test';
import test from 'node:test';

import jwt from 'jsonwebtoken';
import type { Response } from 'express';

import { pool } from '../src/db';
import { adminHasPermission, getAdminScope } from '../src/helper/admin-scope.helper';
import { AuthRequest, verifyToken } from '../src/middleware/auth-jwt.middleware';
import { requirePermission } from '../src/middleware/auth-permission.middleware';

// requirePermission() stores the admin scope on req, and getAdminScope() reuses it, so a request
// behind the middleware queries the account once.

const originalQuery = pool.query;
const accountRow = {
  id_admin_acct: 11,
  alias: 'Editor',
  id_master_comp: 7,
  id_office: 3,
  id_access: 5,
  is_all_access: 0,
  admin_acct_status: 1,
  access_master_comp: 7,
  access_name: 'Editor',
  admin_access_status: 1,
};

const stubPool = (row: Record<string, unknown> | null, allowed = true) => {
  const queries: string[] = [];
  pool.query = (async (sql: string) => {
    queries.push(sql.replace(/\s+/g, ' ').trim().slice(0, 40));
    if (sql.includes('INSERT INTO audit_log')) return [{ insertId: 1 }, []];
    if (sql.includes('FROM admin_access_permission')) {
      return [allowed ? [{ id_admin_permission: 1 }] : [], []];
    }
    return [row ? [row] : [], []];
  }) as unknown as typeof pool.query;
  return queries;
};

// Enough of an Express request for the middleware and its audit log.
const fakeReq = () => ({
  user: { id_admin_acct: 11 },
  headers: {},
  get: () => undefined,
});

type FakeResponse = Response & { statusCode: number; body: { code?: string } | null };

const fakeRes = (): FakeResponse => {
  const res = { statusCode: 200, body: null } as unknown as FakeResponse;
  res.status = ((code: number) => ((res.statusCode = code), res)) as FakeResponse['status'];
  res.json = ((body: { code?: string }) => ((res.body = body), res)) as FakeResponse['json'];
  return res;
};

const asRequest = (value: object) => value as unknown as AuthRequest;
type ScopeFailure = { status?: number; code?: string };

after(async () => {
  pool.query = originalQuery;
  await pool.end();
});

test('getAdminScope queries the account once and caches it on req', async () => {
  const queries = stubPool(accountRow);
  const req = asRequest(fakeReq());
  const first = await getAdminScope(req, pool);
  const second = await getAdminScope(req, pool);
  const expected = {
    success: true,
    idAdminAcct: 11,
    idMasterComp: 7,
    idOffice: 3,
    idAccess: 5,
    isAllAccess: 0,
  };
  assert.deepEqual(first, expected);
  assert.deepEqual(second, expected);
  assert.equal(queries.length, 1);
});

test('getAdminScope rejects missing, unknown, and inactive accounts', async () => {
  stubPool(null);
  assert.deepEqual(await getAdminScope(asRequest({ user: {} }), pool), {
    success: false,
    status: 401,
    code: 'AUTH_SESSION_INVALID',
    message: 'Invalid session',
  });
  assert.equal(
    ((await getAdminScope(asRequest({ user: { id_admin_acct: 11 } }), pool)) as ScopeFailure).code,
    'AUTH_SESSION_INVALID',
  );

  stubPool({ ...accountRow, admin_acct_status: 0 });
  const inactive = (await getAdminScope(
    asRequest({ user: { id_admin_acct: 11 } }),
    pool,
  )) as ScopeFailure;
  assert.equal(inactive.status, 403);
  assert.equal(inactive.code, 'AUTH_ACCOUNT_INACTIVE');
});

test('requirePermission stores the scope, so the handler needs no account query', async () => {
  const queries = stubPool(accountRow);
  const req = asRequest(fakeReq());
  let nextCalled = false;
  await requirePermission('faq.view')(req, fakeRes(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.adminScope, {
    idAdminAcct: 11,
    idMasterComp: 7,
    idOffice: 3,
    idAccess: 5,
    isAllAccess: 0,
  });

  const before = queries.length;
  const scope = await getAdminScope(req, pool);
  assert.equal(scope.success, true);
  assert.equal(queries.length, before);
});

test('requirePermission stores the scope for full-access accounts too', async () => {
  stubPool({ ...accountRow, is_all_access: 1 });
  const req = asRequest(fakeReq());
  await requirePermission('faq.view')(req, fakeRes(), () => {});
  assert.equal(req.adminScope?.isAllAccess, 1);
});

test('adminHasPermission: full access passes, others need the permission row', async () => {
  const scope = { idAdminAcct: 11, idMasterComp: 7, idOffice: 3, idAccess: 5, isAllAccess: 0 };
  stubPool(accountRow, true);
  assert.equal(await adminHasPermission(scope, 'attachment.view', pool), true);
  stubPool(accountRow, false);
  assert.equal(await adminHasPermission(scope, 'attachment.view', pool), false);
  const queries = stubPool(accountRow, false);
  assert.equal(
    await adminHasPermission({ ...scope, isAllAccess: 1 }, 'attachment.view', pool),
    true,
  );
  assert.equal(await adminHasPermission({ ...scope, idAccess: 0 }, 'attachment.view', pool), false);
  assert.equal(queries.length, 0);
});

test('requirePermission leaves no scope when it refuses', async () => {
  stubPool(accountRow, false);
  const req = asRequest(fakeReq());
  const res = fakeRes();
  let nextCalled = false;
  await requirePermission('faq.delete')(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.code, 'AUTH_PERMISSION_DENIED');
  assert.equal(req.adminScope, undefined);
});

const SECRET = 'admin-scope-test-secret';
const signed = (payload: Record<string, unknown>) => jwt.sign(payload, SECRET);
const runVerify = async (token: string) => {
  const req = asRequest({ cookies: { access_token: token }, headers: {}, get: () => undefined });
  const res = fakeRes();
  let nextCalled = false;
  await verifyToken(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
};

test('verifyToken: a token from before the last logout is revoked (audit SEC-003)', async () => {
  process.env.JWT_SECRET = SECRET;
  stubPool({ ...accountRow, token_version: 2 });

  const current = await runVerify(signed({ id_admin_acct: 11, tv: 2 }));
  assert.equal(current.nextCalled, true);
  assert.equal(current.req.adminAccount?.id_admin_acct, 11);

  const revoked = await runVerify(signed({ id_admin_acct: 11, tv: 1 }));
  assert.equal(revoked.nextCalled, false);
  assert.equal(revoked.res.statusCode, 401);
  assert.equal(revoked.res.body?.code, 'AUTH_TOKEN_INVALID_OR_EXPIRED');

  // Tokens issued before token versions existed count as version 0.
  stubPool({ ...accountRow, token_version: 0 });
  assert.equal((await runVerify(signed({ id_admin_acct: 11 }))).nextCalled, true);
});

test('requirePermission reuses the account loaded by verifyToken', async () => {
  const queries = stubPool(accountRow);
  const req = asRequest({ ...fakeReq(), adminAccount: { ...accountRow } });
  let nextCalled = false;
  await requirePermission('faq.view')(req, fakeRes(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(queries.filter((sql) => sql.includes('FROM admin_acct')).length, 0);
});
