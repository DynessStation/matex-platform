import { expect, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  e2eRow,
  expectCode,
  login,
  runId,
  saveRecording,
  uploadSample,
} from './api-contract';

// API contract for the one soft delete (A-3): deleting a row answers data: { id }, the row is
// gone from its detail and its list, and the table keeps it, inactive (status 0), with a
// deletion time in its *_deleted_at column (migration 026). Before A-3 five tables marked a
// deleted row with status 99 instead.
test.describe.configure({ mode: 'serial' });

let owner: APIRequestContext;

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
});

test.afterAll(async () => {
  await saveRecording('soft-delete-api', []);
  await owner?.dispose();
});

/** Deletes `id` at `base`, then checks the answer, the 404, and that the list leaves it out. */
async function deleteAndCheck(base: string, id: string, deletedCode: string, search: string) {
  const deleted = await expectCode(await owner.delete(`${base}/${id}`), 200, deletedCode);
  expect(deleted.data).toEqual({ id });
  expect((await owner.get(`${base}/${id}`)).status()).toBe(404);
  const list = await expectCode(await owner.get(base, { params: { search } }), 200);
  expect(list.data.map((item: { id?: string }) => item.id)).not.toContain(id);
  expect(list.meta.total).toBe(0);
}

/** The status and deletion time of a row, read from the e2e database. */
const stored = (
  table: string,
  status: string,
  deletedAt: string,
  idColumn: string,
  value: string,
) =>
  e2eRow(
    `SELECT ${status} AS status, ${deletedAt} IS NOT NULL AS deleted FROM ${table} WHERE ${idColumn} = ?`,
    [value],
  );

test('a position: status 0 and chair_deleted_at', async () => {
  const name = `Jabatan Hapus ${runId}`;
  const base = '/api/v1/chair';
  const created = await expectCode(await owner.post(base, { data: { chair_name: name } }), 201);
  const id = created.data.id_chair;
  await expectCode(await owner.patch(`${base}/${id}/status`, { data: { chair_status: 0 } }), 200);
  await deleteAndCheck(base, id, 'CHAIR_DELETED', name);
  expect(await stored('chair', 'chair_status', 'chair_deleted_at', 'chair_name', name)).toEqual({
    status: 0,
    deleted: 1,
  });
});

test('an access profile: status 0 and admin_access_deleted_at', async () => {
  const name = `Akses Hapus ${runId}`;
  const base = '/api/v1/admin-access';
  const created = await expectCode(
    await owner.post(base, {
      data: { access_name: name, access_description: '', permissions: [] },
    }),
    201,
  );
  const id = created.data.id_admin_access;
  await expectCode(
    await owner.patch(`${base}/${id}/status`, { data: { admin_access_status: 0 } }),
    200,
  );
  await deleteAndCheck(base, id, 'ADMIN_ACCESS_DELETED', name);
  expect(
    await stored(
      'admin_access',
      'admin_access_status',
      'admin_access_deleted_at',
      'access_name',
      name,
    ),
  ).toEqual({ status: 0, deleted: 1 });
});

test('a permission: status 0 and permission_deleted_at', async () => {
  const key = `hapus_${runId}.view`;
  const base = '/api/v1/admin-permission';
  const created = await expectCode(
    await owner.post(base, { data: { permission_key: key, permission_name: 'Izin Hapus' } }),
    201,
  );
  const id = created.data.id_admin_permission;
  await expectCode(
    await owner.patch(`${base}/${id}/status`, { data: { permission_status: 0 } }),
    200,
  );
  await deleteAndCheck(base, id, 'ADMIN_PERMISSION_DELETED', key);
  expect(
    await stored(
      'admin_permission',
      'permission_status',
      'permission_deleted_at',
      'permission_key',
      key,
    ),
  ).toEqual({ status: 0, deleted: 1 });
});

test('an office: status 0 and deleted_at', async () => {
  const code = `HAPUS${runId}`.toUpperCase().slice(0, 20);
  const base = '/api/v1/office';
  const created = await expectCode(
    await owner.post(base, {
      data: {
        office_code: code,
        office_name: `Kantor Hapus ${runId}`,
        address: 'Jl. Uji No. 2',
        lat: -6.9175,
        lng: 107.6191,
        attendance_enabled: 0,
        is_public: 0,
      },
    }),
    201,
  );
  const id = created.data.id_office;
  await expectCode(await owner.patch(`${base}/${id}/status`, { data: { status: 0 } }), 200);
  await deleteAndCheck(base, id, 'OFFICE_DELETED', code);
  expect(await stored('office', 'status', 'deleted_at', 'office_code', code)).toEqual({
    status: 0,
    deleted: 1,
  });
});

test('an attachment: status 0 and deleted_at', async () => {
  const id = await uploadSample(owner, 'office_media');
  const deleted = await expectCode(
    await owner.delete(`/api/v1/attachment/${id}`),
    200,
    'ATTACHMENT_DELETED',
  );
  expect(deleted.data).toEqual({ id });
  const row = await e2eRow(
    `SELECT attachment_status AS status, deleted_at IS NOT NULL AS deleted FROM attachment
     ORDER BY id_attachment DESC LIMIT 1`,
    [],
  );
  expect(row).toEqual({ status: 0, deleted: 1 });
});
