import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  adminReferences,
  apiContext,
  createAdminAccount,
  expectCode,
  login,
  runId,
  saveRecording,
} from './api-contract';

// API contract for access profiles and the permission matrix (backend/src/ctrl/admin/admin-access.ts):
// validation, permission ids and dependencies, granted permissions taking effect, the status and
// delete rules, and the route order that keeps /permission-matrix ahead of /:id.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/admin-access';
const accessName = `Profil Uji ${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let accessId = '';
let member: { id: string; identity: string; password: string };
const permissionId: Record<string, string> = {};

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('admin-access-api', [
    'admin_access',
    'admin_access_permission',
    'admin_acct',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('access-profile endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.get(`${base}/permission-matrix`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('list and permission matrix', async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200);
  expect(list.data.length).toBeGreaterThan(0);
  expect(list.pagination).toMatchObject({ page: 1 });

  // /permission-matrix is registered before /:id; if that order breaks, it answers "invalid id".
  const matrix = await expectCode(await owner.get(`${base}/permission-matrix`), 200);
  expect(matrix.data.length).toBeGreaterThan(0);
  for (const group of matrix.data) {
    for (const permission of group.permissions)
      permissionId[permission.permission_key] = permission.id_admin_permission;
  }
  for (const key of [
    'admin_access.view',
    'admin_access.update',
    'attachment.view',
    'attachment.create',
  ]) {
    expect(permissionId[key], key).toBeTruthy();
  }
  await expectCode(await owner.get(`${base}/not-a-hash`), 400, 'ADMIN_ACCESS_INVALID_ID');
});

test('create validates input and permission dependencies', async () => {
  const valid = {
    access_name: accessName,
    access_description: 'Profil untuk test kontrak',
    permissions: [],
  };
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ access_name: '  ' }, 'ADMIN_ACCESS_NAME_REQUIRED'],
    [{ access_name: 'N'.repeat(256) }, 'ADMIN_ACCESS_NAME_TOO_LONG'],
    [{ access_description: 'D'.repeat(501) }, 'ADMIN_ACCESS_DESCRIPTION_TOO_LONG'],
    [{ permissions: 'admin_access.view' }, 'ADMIN_ACCESS_PERMISSIONS_ARRAY_INVALID'],
    [{ permissions: [42] }, 'ADMIN_ACCESS_PERMISSION_ID_INVALID'],
    [{ permissions: ['not-a-hash'] }, 'ADMIN_ACCESS_PERMISSION_ID_INVALID'],
    [
      { permissions: [permissionId['attachment.create']] },
      'ADMIN_ACCESS_PERMISSION_DEPENDENCY_REQUIRED',
    ],
  ];
  for (const [patch, code] of cases) {
    await expectCode(await owner.post(base, { data: { ...valid, ...patch } }), 400, code);
  }
});

test('create a profile, then find and read it', async () => {
  const created = await expectCode(
    await owner.post(base, {
      data: {
        access_name: accessName,
        access_description: 'Profil untuk test kontrak',
        permissions: [permissionId['admin_access.view'], permissionId['admin_access.update']],
      },
    }),
    201,
    'ADMIN_ACCESS_CREATED',
  );
  accessId = created.data.id_admin_access;
  expect(accessId).toBeTruthy();

  await expectCode(
    await owner.post(base, { data: { access_name: accessName.toUpperCase(), permissions: [] } }),
    409,
    'ADMIN_ACCESS_NAME_EXISTS',
  );

  const list = await expectCode(await owner.get(base, { params: { search: accessName } }), 200);
  expect(list.data).toHaveLength(1);
  expect(list.data[0]).toMatchObject({
    id_admin_access: accessId,
    permission_count: 2,
    admin_count: 0,
  });

  const detail = await expectCode(await owner.get(`${base}/${accessId}`), 200);
  expect(detail.data).toMatchObject({
    access_name: accessName,
    admin_access_status: 1,
    admin_count: 0,
  });
  expect(detail.data.permission_ids).toHaveLength(2);
});

test('update renames and replaces permissions', async () => {
  const data = {
    access_name: `${accessName} Ubah`,
    access_description: null,
    permissions: [
      permissionId['admin_access.view'],
      permissionId['admin_access.update'],
      permissionId['attachment.view'],
      permissionId['attachment.create'],
    ],
  };
  await expectCode(
    await owner.put(`${base}/${accessId}`, { data: { ...data, access_name: '' } }),
    400,
    'ADMIN_ACCESS_NAME_REQUIRED',
  );
  await expectCode(
    await owner.put(`${base}/${accessId}`, {
      data: { ...data, permissions: [permissionId['attachment.delete']] },
    }),
    400,
    'ADMIN_ACCESS_PERMISSION_DEPENDENCY_REQUIRED',
  );
  await expectCode(await owner.put(`${base}/not-a-hash`, { data }), 400, 'ADMIN_ACCESS_INVALID_ID');
  await expectCode(await owner.put(`${base}/${accessId}`, { data }), 200, 'ADMIN_ACCESS_UPDATED');
  const detail = await expectCode(await owner.get(`${base}/${accessId}`), 200);
  expect(detail.data).toMatchObject({
    access_name: `${accessName} Ubah`,
    access_description: null,
  });
  expect(detail.data.permission_ids).toHaveLength(4);
});

test('granted permissions take effect for an account with the profile', async () => {
  member = await createAdminAccount(
    owner,
    'Akses',
    await adminReferences(owner, { id_access: accessId }),
  );
  const session = await login(member.identity, member.password);
  try {
    await expectCode(await session.get(base), 200);
    await expectCode(await session.get(`${base}/${accessId}`), 200);
    await expectCode(
      await session.post(base, { data: { access_name: 'X', permissions: [] } }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
    await expectCode(await session.delete(`${base}/${accessId}`), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await session.patch(`${base}/${accessId}/status`, { data: { admin_access_status: 0 } }),
      403,
      'ADMIN_ACCESS_SELF_DEACTIVATION_FORBIDDEN',
    );
    await expectCode(
      await session.patch(`${base}/${accessId}/status`, { data: { admin_access_status: 1 } }),
      200,
      'ADMIN_ACCESS_ALREADY_ACTIVE',
    );
  } finally {
    await session.dispose();
  }
});

test('status changes and delete rules', async () => {
  await expectCode(
    await owner.patch(`${base}/${accessId}/status`, { data: { admin_access_status: 9 } }),
    400,
    'ADMIN_ACCESS_INVALID_STATUS',
  );
  await expectCode(await owner.delete(`${base}/${accessId}`), 409, 'ADMIN_ACCESS_MUST_BE_INACTIVE');
  await expectCode(
    await owner.patch(`${base}/${accessId}/status`, { data: { admin_access_status: 0 } }),
    200,
    'ADMIN_ACCESS_DEACTIVATED',
  );
  await expectCode(
    await anonymous.post('/api/v1/admin-acct/login', {
      data: { identity: member.identity, password: member.password },
    }),
    403,
    'AUTH_ACCESS_PROFILE_INACTIVE',
  );
  await expectCode(
    await owner.delete(`${base}/${accessId}`),
    409,
    'ADMIN_ACCESS_HAS_ADMIN_REFERENCES',
  );

  await expectCode(
    await owner.patch(`/api/v1/admin-acct/${member.id}/status`, { data: { admin_acct_status: 0 } }),
    200,
  );
  await expectCode(
    await owner.delete(`/api/v1/admin-acct/${member.id}`),
    200,
    'ADMIN_ACCOUNT_DELETED',
  );
  await expectCode(await owner.delete(`${base}/${accessId}`), 200, 'ADMIN_ACCESS_DELETED');
  await expectCode(await owner.get(`${base}/${accessId}`), 404, 'ADMIN_ACCESS_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/not-a-hash`), 400, 'ADMIN_ACCESS_INVALID_ID');
});
