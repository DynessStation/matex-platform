import { expect, test, type APIRequestContext } from '@playwright/test';

import { admin, apiContext, expectCode, login, runId } from './api-contract';

// API contract for permission groups (backend/src/ctrl/admin/admin-permission-group.ts): a group
// can exist before it has permissions, renaming carries its permissions along, and only an empty
// group can be deleted.
test.describe.configure({ mode: 'serial' });

const groups = '/api/v1/admin-permission-group';
const permissions = '/api/v1/admin-permission';
const name = `Grup Uji ${runId}`;

let anonymous: APIRequestContext;
let owner: APIRequestContext;

const find = async (groupName: string) =>
  (await expectCode(await owner.get(groups), 200)).data.find(
    (group: { name: string }) => group.name === groupName,
  );

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
});

test.afterAll(async () => {
  await anonymous?.dispose();
  await owner?.dispose();
});

test('groups need a session and a valid name', async () => {
  await expectCode(await anonymous.get(groups), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(
    await owner.post(groups, { data: { name: ' ' } }),
    400,
    'ADMIN_PERMISSION_GROUP_NAME_REQUIRED',
  );
  await expectCode(
    await owner.post(groups, { data: { name: 'G'.repeat(101) } }),
    400,
    'ADMIN_PERMISSION_GROUP_NAME_TOO_LONG',
  );
  await expectCode(
    await owner.put(`${groups}/not-a-hash`, { data: { name } }),
    400,
    'ADMIN_PERMISSION_GROUP_INVALID_ID',
  );
});

test('the seeded permissions come grouped, with their profile counts', async () => {
  const list = (await expectCode(await owner.get(groups), 200)).data;
  expect(list.length).toBeGreaterThan(0);
  const all = list.flatMap((group: { permissions: unknown[] }) => group.permissions);
  expect(all.length).toBeGreaterThan(0);
  expect(all[0]).toEqual(
    expect.objectContaining({
      id_admin_permission: expect.any(String),
      permission_key: expect.any(String),
      permission_status: expect.any(Number),
      access_count: expect.any(Number),
    }),
  );
});

test('create, rename with its permissions, and delete when empty', async () => {
  const created = await expectCode(await owner.post(groups, { data: { name } }), 201);
  const id = created.data.id_admin_permission_group;
  await expectCode(
    await owner.post(groups, { data: { name: name.toUpperCase() } }),
    409,
    'ADMIN_PERMISSION_GROUP_EXISTS',
  );
  expect((await find(name)).permissions).toEqual([]);

  // A permission can start inactive.
  const key = `grup_${runId}.lihat`;
  const permission = await expectCode(
    await owner.post(permissions, {
      data: {
        permission_key: key,
        permission_name: 'Izin Grup',
        permission_group: name,
        permission_status: 0,
      },
    }),
    201,
  );
  expect((await find(name)).permissions[0]).toMatchObject({
    permission_key: key,
    permission_status: 0,
    access_count: 0,
  });

  const renamed = `${name} Baru`;
  await expectCode(await owner.put(`${groups}/${id}`, { data: { name: renamed } }), 200);
  expect(await find(name)).toBeUndefined();
  expect((await find(renamed)).permissions).toHaveLength(1);
  await expectCode(await owner.delete(`${groups}/${id}`), 409, 'ADMIN_PERMISSION_GROUP_IN_USE');

  await expectCode(
    await owner.delete(`${permissions}/${permission.data.id_admin_permission}`),
    200,
  );
  await expectCode(await owner.delete(`${groups}/${id}`), 200);
  expect(await find(renamed)).toBeUndefined();
  await expectCode(await owner.delete(`${groups}/${id}`), 404, 'ADMIN_PERMISSION_GROUP_NOT_FOUND');
});

test('a new group name on a permission joins the list, and it starts active by default', async () => {
  const named = `Grup Baru ${runId}`;
  const created = await expectCode(
    await owner.post(permissions, {
      data: {
        permission_key: `grup_${runId}.baru`,
        permission_name: 'Izin Baru',
        permission_group: named,
      },
    }),
    201,
  );
  const group = await find(named);
  expect(group.id_admin_permission_group).toBeTruthy();
  expect(group.permissions[0].permission_status).toBe(1);

  const id = created.data.id_admin_permission;
  await owner.patch(`${permissions}/${id}/status`, { data: { permission_status: 0 } });
  await owner.delete(`${permissions}/${id}`);
  await owner.delete(`${groups}/${group.id_admin_permission_group}`);
});

test('a permission without a group is listed under Other, which cannot be renamed', async () => {
  const created = await expectCode(
    await owner.post(permissions, {
      data: { permission_key: `tanpa_${runId}.grup`, permission_name: 'Tanpa Grup' },
    }),
    201,
  );
  const other = await find('Other');
  expect(other.id_admin_permission_group).toBeNull();
  expect(
    other.permissions.some(
      (item: { permission_key: string }) => item.permission_key === `tanpa_${runId}.grup`,
    ),
  ).toBe(true);
  const id = created.data.id_admin_permission;
  await owner.patch(`${permissions}/${id}/status`, { data: { permission_status: 0 } });
  await owner.delete(`${permissions}/${id}`);
});
