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

// API contract for positions (chair) (backend/src/ctrl/admin/chair.ts): validation, unique names,
// create/read/update, status changes, the delete rules, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/chair';
const chairName = `Jabatan Uji ${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let chairId = '';
let seededChairName = '';

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('chair-api', ['chair', 'admin_acct', 'audit_log']);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('position endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('list, paging, and sorting', async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200);
  expect(list.data.length).toBeGreaterThan(0);
  seededChairName = list.data[0].chair_name;
  expect(list.pagination).toMatchObject({ page: 1, limit: 15 });

  const sorted = await expectCode(
    await owner.get(base, { params: { ord: 'chair_name', srt: 'desc', limit: '1' } }),
    200,
  );
  expect(sorted.pagination).toMatchObject({ limit: 1, length: 1 });
  await expectCode(await owner.get(base, { params: { ord: 'toString' } }), 200);
  await expectCode(await owner.get(`${base}/not-a-hash`), 400, 'CHAIR_INVALID_ID');
});

test('create validates input and unique names', async () => {
  await expectCode(
    await owner.post(base, { data: { chair_name: ' ' } }),
    400,
    'CHAIR_NAME_REQUIRED',
  );
  await expectCode(
    await owner.post(base, { data: { chair_name: 'N'.repeat(256) } }),
    400,
    'CHAIR_NAME_TOO_LONG',
  );
  await expectCode(
    await owner.post(base, { data: { chair_name: seededChairName.toUpperCase() } }),
    409,
    'CHAIR_ALREADY_EXISTS',
  );

  const created = await expectCode(
    await owner.post(base, {
      data: { chair_name: chairName, chair_description: 'Jabatan untuk test kontrak' },
    }),
    201,
    'CHAIR_CREATED',
  );
  chairId = created.data.id_chair;

  const detail = await expectCode(await owner.get(`${base}/${chairId}`), 200);
  expect(detail.data).toMatchObject({
    id_chair: chairId,
    chair_name: chairName,
    chair_description: 'Jabatan untuk test kontrak',
    chair_status: 1,
    admin_count: 0,
  });
  const found = await expectCode(await owner.get(base, { params: { search: chairName } }), 200);
  expect(found.pagination).toMatchObject({ total: 1 });
});

test('update validates and changes the position', async () => {
  const update = (data: Record<string, unknown>) => owner.put(`${base}/${chairId}`, { data });
  await expectCode(await update({ chair_name: '' }), 400, 'CHAIR_NAME_REQUIRED');
  await expectCode(await update({ chair_name: seededChairName }), 409, 'CHAIR_ALREADY_EXISTS');
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: { chair_name: chairName } }),
    400,
    'CHAIR_INVALID_ID',
  );
  await expectCode(
    await update({ chair_name: `${chairName} Ubah`, chair_description: null }),
    200,
    'CHAIR_UPDATED',
  );
  // An update without changes succeeds without writing.
  await expectCode(
    await update({ chair_name: `${chairName} Ubah`, chair_description: '' }),
    200,
    'CHAIR_UPDATED',
  );
  const detail = await expectCode(await owner.get(`${base}/${chairId}`), 200);
  expect(detail.data).toMatchObject({
    chair_name: `${chairName} Ubah`,
    chair_description: null,
  });
});

test('an account without position permissions is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Jabatan', []);
  const account = await createAdminAccount(
    owner,
    'Jabatan',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.post(base, { data: { chair_name: 'X' } }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
    await expectCode(await limited.delete(`${base}/${chairId}`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});

test('status changes and delete rules', async () => {
  const status = (value: number) =>
    owner.patch(`${base}/${chairId}/status`, { data: { chair_status: value } });
  await expectCode(await status(5), 400, 'CHAIR_INVALID_STATUS');
  await expectCode(await status(1), 200, 'CHAIR_ALREADY_ACTIVE');
  await expectCode(await owner.delete(`${base}/${chairId}`), 409, 'CHAIR_MUST_BE_INACTIVE');

  const member = await createAdminAccount(
    owner,
    'Pemegang',
    await adminReferences(owner, { id_chair: chairId }),
  );
  const deactivated = await expectCode(await status(0), 200, 'CHAIR_DEACTIVATED');
  expect(deactivated.data).toMatchObject({ chair_status: 0, affected_accounts: 1 });
  await expectCode(await status(0), 200, 'CHAIR_ALREADY_INACTIVE');
  const blocked = await expectCode(
    await owner.delete(`${base}/${chairId}`),
    409,
    'CHAIR_HAS_ADMIN_REFERENCES',
  );
  expect(blocked.data).toEqual({ assigned_accounts: 1 });

  await expectCode(
    await owner.patch(`/api/v1/admin-acct/${member.id}/status`, { data: { admin_acct_status: 0 } }),
    200,
  );
  await expectCode(await owner.delete(`/api/v1/admin-acct/${member.id}`), 200);
  await expectCode(await owner.delete(`${base}/${chairId}`), 200, 'CHAIR_DELETED');
  await expectCode(await owner.get(`${base}/${chairId}`), 404, 'CHAIR_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/not-a-hash`), 400, 'CHAIR_INVALID_ID');
});
