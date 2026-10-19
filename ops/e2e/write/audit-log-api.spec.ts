import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  adminReferences,
  apiContext,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
  runId,
  saveRecording,
} from './api-contract';

// API contract for the audit log (backend/src/ctrl/admin/audit-log.ts): list paging, sorting,
// and filters, company scope (including global entries), detail with integrity check, and
// permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/audit-log';
const chairName = `Jabatan Audit ${runId}`;
const permissionKey = `audit_${runId}.check`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('audit-log-api', ['audit_log']);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('audit log endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.get(`${base}/not-a-hash`), 401, 'AUTH_TOKEN_REQUIRED');
});

test('changes leave entries that the list finds', async () => {
  owner = await login(admin.identity, admin.password);
  // A company entry (positions belong to a company) and a global one (permissions do not).
  await expectCode(await owner.post('/api/v1/chair', { data: { chair_name: chairName } }), 201);
  await expectCode(
    await owner.post('/api/v1/admin-permission', {
      data: { permission_key: permissionKey, permission_name: 'Izin Audit' },
    }),
    201,
  );

  const company = await expectCode(await owner.get(base, { params: { search: chairName } }), 200);
  expect(company.pagination).toMatchObject({ total: 1, length: 1, has_more: false });
  expect(company.data[0]).toMatchObject({
    event_code: 'chair.created',
    category: 'data_change',
    module: 'chair',
    action: 'create',
    actor: { type: 'admin', label: expect.any(String) },
    entity: { type: 'chair', label: chairName },
    outcome: 'success',
    http: { method: 'POST', status: 201 },
    has_integrity: true,
    integrity_version: 1,
  });
  expect(company.data[0].id_master_comp).toEqual(expect.any(String));

  // Global entries (no company) are shown to the company of the admin who made them.
  const global = await expectCode(
    await owner.get(base, { params: { search: permissionKey } }),
    200,
  );
  expect(global.pagination).toMatchObject({ total: 1 });
  expect(global.data[0]).toMatchObject({
    event_code: 'admin_permission.created',
    id_master_comp: null,
  });
});

test('paging and sorting', async () => {
  const list = await expectCode(await owner.get(base), 200);
  expect(list.pagination).toMatchObject({ page: 1, limit: 20 });
  const first = await expectCode(await owner.get(base, { params: { limit: '2' } }), 200);
  expect(first.pagination).toMatchObject({ limit: 2, length: 2, has_more: true });
  expect(list.pagination.total_pages).toBe(list.pagination.pagerows);
  // Newest first by default.
  expect(list.data[0].event_code).toBe('admin_permission.created');

  const oldest = await expectCode(
    await owner.get(base, { params: { srt: 'asc', limit: '1', page: '2' } }),
    200,
  );
  expect(oldest.pagination).toMatchObject({ page: 2, limit: 1, length: 1 });
  const capped = await expectCode(await owner.get(base, { params: { limit: '500' } }), 200);
  expect(capped.pagination).toMatchObject({ limit: 100 });
  await expectCode(await owner.get(base, { params: { page: 'x', limit: '0' } }), 200);
  await expectCode(await owner.get(base, { params: { ord: 'toString' } }), 200);
  const byModule = await expectCode(
    await owner.get(base, { params: { ord: 'module', srt: 'false', limit: '1' } }),
    200,
  );
  expect(byModule.data).toHaveLength(1);
});

test('filters', async () => {
  const filtered = async (params: Record<string, string>) =>
    (await expectCode(await owner.get(base, { params: { limit: '100', ...params } }), 200)).data;

  const chairEvents = await filtered({ module: 'chair', action: 'create', source: 'admin_web' });
  expect(chairEvents.length).toBeGreaterThan(0);
  expect(chairEvents.every((item: any) => item.module === 'chair')).toBe(true);

  const security = await filtered({ category: 'access_control', outcome: 'success' });
  expect(security.every((item: any) => item.category === 'access_control')).toBe(true);
  const byEvent = await filtered({ event_code: 'admin_permission.created', actor_type: 'admin' });
  expect(byEvent.every((item: any) => item.event_code === 'admin_permission.created')).toBe(true);
  const byEntity = await filtered({ entity_type: 'chair', search: chairName });
  expect(byEntity).toHaveLength(1);
  const byIds = await filtered({
    actor_id: byEntity[0].actor.id,
    entity_id: byEntity[0].entity.id,
    entity_type: 'chair',
  });
  expect(byIds).toHaveLength(1);

  // Unknown enum values and invalid dates are ignored; other values filter exactly.
  const all = await expectCode(await owner.get(base), 200);
  const ignored = await expectCode(
    await owner.get(base, { params: { category: 'nope', outcome: 'x', date_from: 'not-a-date' } }),
    200,
  );
  expect(ignored.pagination.total).toBe(all.pagination.total);
  expect(await filtered({ module: 'no_such_module' })).toHaveLength(0);
  expect(await filtered({ date_from: '2999-01-01' })).toHaveLength(0);
  expect(await filtered({ date_to: '2000-01-01' })).toHaveLength(0);
  const thisYear = await filtered({ date_from: '2000-01-01', date_to: '2999-12-31T00:00:00Z' });
  expect(thisYear.length).toBeGreaterThan(0);
  expect(await filtered({ request_id: 'missing', correlation_id: 'missing' })).toHaveLength(0);
});

test('detail with changes and integrity', async () => {
  const [entry] = (await expectCode(await owner.get(base, { params: { search: chairName } }), 200))
    .data;
  const detail = await expectCode(await owner.get(`${base}/${entry.id_audit_log}`), 200);
  expect(detail.data).toMatchObject({
    id_audit_log: entry.id_audit_log,
    event_code: 'chair.created',
    entity: { type: 'chair', label: chairName },
    http: { method: 'POST', status: 201 },
    changes: { before: null, after: { chair_name: chairName, chair_status: 1 } },
    integrity: { version: 1, valid: true },
  });

  const [global] = (
    await expectCode(await owner.get(base, { params: { search: permissionKey } }), 200)
  ).data;
  const globalDetail = await expectCode(await owner.get(`${base}/${global.id_audit_log}`), 200);
  expect(globalDetail.data).toMatchObject({ id_master_comp: null, integrity: { valid: true } });

  await expectCode(await owner.get(`${base}/not-a-hash`), 400, 'AUDIT_LOG_INVALID_ID');
  await expectCode(await owner.get(`${base}/%20`), 400, 'AUDIT_LOG_INVALID_ID');
});

test('an account without audit log rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Audit', []);
  const account = await createAdminAccount(
    owner,
    'Audit',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.get(`${base}/not-a-hash`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});
