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

// API contract for admin permissions (backend/src/ctrl/admin/admin-permission.ts): validation,
// unique keys, create/read/update, status changes, the delete rules, and permission checks.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/admin-permission';
const permissionKey = `contract_${runId}.check`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let permissionId = '';

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('admin-permission-api', [
    'admin_permission',
    'admin_access_permission',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('permission endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('list, paging, and sorting', async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200);
  expect(list.data.length).toBeGreaterThan(0);
  expect(list.pagination).toMatchObject({ page: 1, limit: 15 });

  const sorted = await expectCode(
    await owner.get(base, { params: { field: 'permission_key', sort: 'desc', paginate: '2' } }),
    200,
  );
  expect(sorted.pagination).toMatchObject({ limit: 2, length: 2 });
  expect(sorted.data[0].permission_key > sorted.data[1].permission_key).toBe(true);

  const page2 = await expectCode(await owner.get(base, { params: { limit: '3', page: '2' } }), 200);
  expect(page2.pagination).toMatchObject({ page: 2, limit: 3 });
  const capped = await expectCode(await owner.get(base, { params: { paginate: '500' } }), 200);
  expect(capped.pagination).toMatchObject({ limit: 100 });
  await expectCode(await owner.get(base, { params: { field: 'toString' } }), 200);
  await expectCode(await owner.get(base, { params: { page: 'x', limit: '-4' } }), 200);
  await expectCode(await owner.get(`${base}/not-a-hash`), 400, 'ADMIN_PERMISSION_INVALID_ID');
});

test('create validates input and unique keys', async () => {
  const create = (data: Record<string, unknown>) => owner.post(base, { data });
  const valid = { permission_key: permissionKey, permission_name: 'Izin Uji Kontrak' };
  await expectCode(
    await create({ ...valid, permission_key: ' ' }),
    400,
    'ADMIN_PERMISSION_KEY_REQUIRED',
  );
  await expectCode(
    await create({ ...valid, permission_name: '' }),
    400,
    'ADMIN_PERMISSION_NAME_REQUIRED',
  );
  await expectCode(
    await create({ ...valid, permission_key: 'no_dot' }),
    400,
    'ADMIN_PERMISSION_KEY_INVALID',
  );
  await expectCode(
    await create({ ...valid, permission_key: `${'a'.repeat(100)}.b` }),
    400,
    'ADMIN_PERMISSION_KEY_TOO_LONG',
  );
  await expectCode(
    await create({ ...valid, permission_name: 'N'.repeat(151) }),
    400,
    'ADMIN_PERMISSION_NAME_TOO_LONG',
  );
  await expectCode(
    await create({ ...valid, permission_group: 'G'.repeat(101) }),
    400,
    'ADMIN_PERMISSION_GROUP_TOO_LONG',
  );
  await expectCode(
    await create({ ...valid, permission_description: 'D'.repeat(501) }),
    400,
    'ADMIN_PERMISSION_DESCRIPTION_TOO_LONG',
  );
  // Keys are stored in lower case, so an existing key in upper case is a duplicate.
  await expectCode(
    await create({ ...valid, permission_key: 'CHAIR.VIEW' }),
    409,
    'ADMIN_PERMISSION_KEY_EXISTS',
  );

  const created = await expectCode(
    await create({
      ...valid,
      permission_key: ` ${permissionKey.toUpperCase()} `,
      permission_group: 'Uji Kontrak',
      permission_description: 'Izin untuk test kontrak',
    }),
    201,
    'ADMIN_PERMISSION_CREATED',
  );
  permissionId = created.data.id_admin_permission;

  const detail = await expectCode(await owner.get(`${base}/${permissionId}`), 200);
  expect(detail.data).toMatchObject({
    id_admin_permission: permissionId,
    permission_key: permissionKey,
    permission_name: 'Izin Uji Kontrak',
    permission_group: 'Uji Kontrak',
    permission_description: 'Izin untuk test kontrak',
    permission_status: 1,
    access_count: 0,
  });
  const found = await expectCode(await owner.get(base, { params: { search: permissionKey } }), 200);
  expect(found.pagination).toMatchObject({ total: 1 });
  expect(found.data[0]).toMatchObject({ status_label: 'Active', access_count: 0 });
  await expectCode(await create(valid), 409, 'ADMIN_PERMISSION_KEY_EXISTS');
});

test('update validates and keeps the key', async () => {
  const update = (data: Record<string, unknown>) => owner.put(`${base}/${permissionId}`, { data });
  await expectCode(await update({ permission_name: ' ' }), 400, 'ADMIN_PERMISSION_NAME_REQUIRED');
  await expectCode(
    await update({ permission_name: 'N'.repeat(151) }),
    400,
    'ADMIN_PERMISSION_NAME_TOO_LONG',
  );
  await expectCode(
    await update({ permission_name: 'X', permission_group: 'G'.repeat(101) }),
    400,
    'ADMIN_PERMISSION_GROUP_TOO_LONG',
  );
  await expectCode(
    await update({ permission_name: 'X', permission_description: 'D'.repeat(501) }),
    400,
    'ADMIN_PERMISSION_DESCRIPTION_TOO_LONG',
  );
  await expectCode(
    await owner.put(`${base}/not-a-hash`, { data: { permission_name: 'X' } }),
    400,
    'ADMIN_PERMISSION_INVALID_ID',
  );
  await expectCode(
    await update({
      permission_key: 'other.key',
      permission_name: 'Izin Uji Ubah',
      permission_group: '',
    }),
    200,
    'ADMIN_PERMISSION_UPDATED',
  );
  // An update without changes succeeds without an audit entry.
  await expectCode(
    await update({
      permission_name: 'Izin Uji Ubah',
      permission_description: 'Izin untuk test kontrak',
    }),
    200,
    'ADMIN_PERMISSION_UPDATED',
  );
  const detail = await expectCode(await owner.get(`${base}/${permissionId}`), 200);
  expect(detail.data).toMatchObject({
    permission_key: permissionKey,
    permission_name: 'Izin Uji Ubah',
    permission_group: null,
    permission_description: 'Izin untuk test kontrak',
  });
});

test('an account without permission rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Permission', []);
  const account = await createAdminAccount(
    owner,
    'Permission',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.post(base, { data: { permission_key: 'a.b', permission_name: 'X' } }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
    await expectCode(
      await limited.delete(`${base}/${permissionId}`),
      403,
      'AUTH_PERMISSION_DENIED',
    );
  } finally {
    await limited.dispose();
  }
});

test('status changes and delete rules', async () => {
  const status = (id: string, value: unknown) =>
    owner.patch(`${base}/${id}/status`, { data: { permission_status: value } });
  await expectCode(await status(permissionId, 5), 400, 'ADMIN_PERMISSION_INVALID_STATUS');
  await expectCode(await status(permissionId, 1), 200, 'ADMIN_PERMISSION_ALREADY_ACTIVE');
  await expectCode(await status('not-a-hash', 0), 400, 'ADMIN_PERMISSION_INVALID_ID');
  await expectCode(
    await owner.delete(`${base}/${permissionId}`),
    409,
    'ADMIN_PERMISSION_MUST_BE_INACTIVE',
  );

  await createAccessProfile(owner, 'Pemegang Izin Uji', [permissionKey]);
  const assigned = await expectCode(await owner.get(`${base}/${permissionId}`), 200);
  expect(assigned.data.access_count).toBe(1);

  const deactivated = await expectCode(
    await status(permissionId, '0'),
    200,
    'ADMIN_PERMISSION_DEACTIVATED',
  );
  expect(deactivated.data).toMatchObject({ permission_status: 0 });
  await expectCode(await status(permissionId, 0), 200, 'ADMIN_PERMISSION_ALREADY_INACTIVE');
  const blocked = await expectCode(
    await owner.delete(`${base}/${permissionId}`),
    409,
    'ADMIN_PERMISSION_HAS_ACCESS_REFERENCES',
  );
  expect(blocked.data).toEqual({ access_roles: 1 });
  await expectCode(await status(permissionId, 1), 200, 'ADMIN_PERMISSION_ACTIVATED');

  // A permission no access profile holds can be deleted once inactive.
  const spare = await expectCode(
    await owner.post(base, {
      data: { permission_key: `contract_${runId}.spare`, permission_name: 'Izin Cadangan' },
    }),
    201,
  );
  const spareId = spare.data.id_admin_permission;
  await expectCode(await status(spareId, 0), 200, 'ADMIN_PERMISSION_DEACTIVATED');
  await expectCode(await owner.delete(`${base}/${spareId}`), 200, 'ADMIN_PERMISSION_DELETED');
  await expectCode(await owner.get(`${base}/${spareId}`), 404, 'ADMIN_PERMISSION_NOT_FOUND');
  await expectCode(await status(spareId, 1), 404, 'ADMIN_PERMISSION_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/${spareId}`), 404, 'ADMIN_PERMISSION_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/not-a-hash`), 400, 'ADMIN_PERMISSION_INVALID_ID');
  // The deleted key stays reserved.
  await expectCode(
    await owner.post(base, {
      data: { permission_key: `contract_${runId}.spare`, permission_name: 'Izin Cadangan' },
    }),
    409,
    'ADMIN_PERMISSION_KEY_EXISTS',
  );
});
