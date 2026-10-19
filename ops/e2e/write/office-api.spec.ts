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
  uploadSample,
} from './api-contract';

// API contract for the office endpoints (backend/src/ctrl/admin/office.ts): validation of
// codes, contacts, coordinates, operating hours and photos, the status and delete rules,
// and permission checks. Runs against real MySQL in the isolated e2e stack.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/office';
const code = `KT-${runId}`.toUpperCase();

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let officeId = '';
let coverId = '';
let galleryId = '';

const hours = [
  { day_of_week: 1, sequence: 1, open_time: '08:00', close_time: '12:00' },
  { day_of_week: 1, sequence: 2, open_time: '13:00', close_time: '17:00' },
  { day_of_week: 7, sequence: 1, is_closed: 1 },
];

const newOffice = () => ({
  office_code: code,
  office_name: 'Kantor Uji Kontrak',
  office_description: 'Kantor untuk test kontrak API',
  address: 'Jl. Uji No. 1',
  city: 'Bandung',
  province: 'Jawa Barat',
  postal_code: '40111',
  email: 'kantor.uji@example.invalid',
  phone: '+62221234567',
  lat: -6.9175,
  lng: 107.6191,
  attendance_enabled: 1,
  attendance_radius_meter: 150,
  website_url: 'https://example.invalid/kantor',
  is_public: 1,
  public_slug: `kantor-uji-${runId}`,
  public_sort_order: 3,
  google_maps_url: 'https://maps.example.invalid/kantor',
  operating_hours: hours,
  attachments: [
    { id_attachment: coverId, attachment_role: 'cover', caption: 'Tampak depan' },
    { id_attachment: galleryId, attachment_role: 'gallery' },
  ],
});

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('office-api', [
    'office',
    'office_operating_hour',
    'office_attachment',
    'attachment',
    'admin_acct',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('office endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.get(`${base}/anything`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test("the list shows the company's first office", async () => {
  owner = await login(admin.identity, admin.password);
  const list = await expectCode(await owner.get(base), 200);
  expect(list.data.length).toBeGreaterThan(0);
  expect(list.pagination).toMatchObject({ page: 1 });
  await expectCode(await owner.get(`${base}/not-a-hash`), 400, 'OFFICE_INVALID_ID');
});

test('create validates office fields', async () => {
  coverId = await uploadSample(owner, 'office_media');
  galleryId = await uploadSample(owner, 'office_media');
  const valid = newOffice();
  const cases: Array<[Record<string, unknown>, number, string]> = [
    [{ office_code: '' }, 400, 'OFFICE_CODE_REQUIRED'],
    [{ office_code: 'BAD CODE!' }, 400, 'OFFICE_CODE_INVALID'],
    [{ office_code: 'X'.repeat(51) }, 400, 'OFFICE_CODE_TOO_LONG'],
    [{ office_name: ' ' }, 400, 'OFFICE_NAME_REQUIRED'],
    [{ office_name: 'N'.repeat(256) }, 400, 'OFFICE_NAME_TOO_LONG'],
    [{ email: 'not-an-email' }, 400, 'OFFICE_EMAIL_INVALID'],
    [{ website_url: 'ftp://example.invalid' }, 400, 'OFFICE_URLS_INVALID'],
    [{ lat: 91 }, 400, 'OFFICE_LATITUDE_INVALID'],
    [{ lng: -181 }, 400, 'OFFICE_LONGITUDE_INVALID'],
    [{ attendance_radius_meter: 0 }, 400, 'OFFICE_ATTENDANCE_RADIUS_INVALID'],
    [{ lat: null }, 400, 'OFFICE_LOCATION_AND_ATTENDANCE_RADIUS_REQUIRED'],
    [{ office_name: '!!!', public_slug: '' }, 400, 'OFFICE_PUBLIC_SLUG_REQUIRED'],
  ];
  for (const [patch, status, expected] of cases) {
    await expectCode(await owner.post(base, { data: { ...valid, ...patch } }), status, expected);
  }
});

test('create validates operating hours', async () => {
  const valid = newOffice();
  const cases: Array<[unknown, string]> = [
    ['every day', 'OFFICE_OPERATING_HOURS_ARRAY_INVALID'],
    [Array.from({ length: 31 }, () => hours[0]), 'OFFICE_OPERATING_HOURS_AMOUNT_INVALID'],
    [[{ ...hours[0], day_of_week: 8 }], 'OFFICE_OPERATING_DAY_INVALID'],
    [[{ ...hours[0], sequence: 11 }], 'OFFICE_OPERATING_HOURS_SEQUENCE_INVALID'],
    [[hours[0], hours[0]], 'OFFICE_OPERATING_HOURS_DUPLICATED'],
    [[{ day_of_week: 2, sequence: 2, is_closed: 1 }], 'OFFICE_OPERATING_DAY_SEQUENCE_INVALID'],
    [
      [{ day_of_week: 2, sequence: 1, open_time: '08:00' }],
      'OFFICE_OPERATING_HOURS_OPEN_CLOSE_INVALID',
    ],
    [[{ ...hours[0], close_time: '08:00' }], 'OFFICE_OPERATING_HOURS_SAME_OPEN_CLOSE'],
    [
      [hours[2], { ...hours[0], day_of_week: 7, sequence: 2 }],
      'OFFICE_OPERATING_HOURS_CONTAIN_ANOTHER_OPERATING_TIME',
    ],
  ];
  for (const [operatingHours, expected] of cases) {
    await expectCode(
      await owner.post(base, { data: { ...valid, operating_hours: operatingHours } }),
      400,
      expected,
    );
  }
});

test('create validates office photos', async () => {
  const valid = newOffice();
  const mediaLibraryId = await uploadSample(owner, 'media_library');
  const cases: Array<[unknown, string]> = [
    ['cover.png', 'OFFICE_ATTACHMENTS_ARRAY_INVALID'],
    [
      Array.from({ length: 21 }, () => ({ id_attachment: coverId })),
      'OFFICE_ATTACHMENTS_LIMIT_EXCEEDED',
    ],
    [[{ id_attachment: 'not-a-hash' }], 'OFFICE_ATTACHMENT_ID_INVALID'],
    [[{ id_attachment: coverId }, { id_attachment: coverId }], 'OFFICE_ATTACHMENT_DUPLICATED'],
    [[{ id_attachment: coverId, attachment_role: 'banner' }], 'OFFICE_ATTACHMENT_ROLE_INVALID'],
    [[{ id_attachment: coverId, caption: 'C'.repeat(256) }], 'OFFICE_ATTACHMENT_CAPTION_TOO_LONG'],
    [
      [
        { id_attachment: coverId, attachment_role: 'cover' },
        { id_attachment: galleryId, attachment_role: 'cover' },
      ],
      'OFFICE_ATTACHMENT_MULTIPLE_COVER',
    ],
    [[{ id_attachment: mediaLibraryId }], 'OFFICE_ATTACHMENT_NOT_AVAILABLE'],
  ];
  for (const [attachments, expected] of cases) {
    await expectCode(await owner.post(base, { data: { ...valid, attachments } }), 400, expected);
  }
});

test('create an office, then find and read it', async () => {
  const created = await expectCode(
    await owner.post(base, { data: newOffice() }),
    201,
    'OFFICE_CREATED',
  );
  officeId = created.data.id_office;
  expect(officeId).toBeTruthy();

  await expectCode(
    await owner.post(base, { data: { ...newOffice(), public_slug: `lain-${runId}` } }),
    409,
    'OFFICE_ALREADY_EXISTS',
  );
  // The office name must be unique too, case-insensitively.
  await expectCode(
    await owner.post(base, {
      data: {
        ...newOffice(),
        office_code: `${code}-B`,
        office_name: 'kantor uji KONTRAK',
        public_slug: `lain-${runId}`,
      },
    }),
    409,
    'OFFICE_ALREADY_EXISTS',
  );
  await expectCode(
    await owner.post(base, {
      data: {
        ...newOffice(),
        office_code: `${code}-B`,
        office_name: 'Kantor Uji Kedua',
        attachments: [],
      },
    }),
    409,
    'OFFICE_PUBLIC_SLUG_EXISTS',
  );

  const list = await expectCode(await owner.get(base, { params: { search: code } }), 200);
  expect(list.data).toHaveLength(1);
  expect(list.data[0]).toMatchObject({ id_office: officeId, office_code: code });

  const detail = await expectCode(await owner.get(`${base}/${officeId}`), 200);
  expect(detail.data).toMatchObject({
    id_office: officeId,
    office_code: code,
    city: 'Bandung',
    lat: -6.9175,
    attendance_enabled: 1,
    is_public: 1,
    status: 1,
    admin_count: 0,
  });
  expect(detail.data.operating_hours).toHaveLength(3);
  expect(detail.data.attachments).toHaveLength(2);
  expect(
    detail.data.attachments.find((item: any) => item.attachment_role === 'cover'),
  ).toMatchObject({
    caption: 'Tampak depan',
  });
});

test('update replaces fields, hours, and photos', async () => {
  const data = {
    ...newOffice(),
    office_name: 'Kantor Uji Kontrak Diubah',
    attendance_enabled: 0,
    operating_hours: [hours[2]],
    attachments: [{ id_attachment: coverId, attachment_role: 'cover' }],
  };
  await expectCode(
    await owner.put(`${base}/${officeId}`, { data: { ...data, office_name: '' } }),
    400,
    'OFFICE_NAME_REQUIRED',
  );
  await expectCode(
    await owner.put(`${base}/${officeId}`, { data: { ...data, lat: 95 } }),
    400,
    'OFFICE_LATITUDE_INVALID',
  );
  await expectCode(await owner.put(`${base}/not-a-hash`, { data }), 400, 'OFFICE_INVALID_ID');
  await expectCode(await owner.put(`${base}/${officeId}`, { data }), 200, 'OFFICE_UPDATED');

  const detail = await expectCode(await owner.get(`${base}/${officeId}`), 200);
  expect(detail.data).toMatchObject({
    office_name: 'Kantor Uji Kontrak Diubah',
    attendance_enabled: 0,
  });
  expect(detail.data.operating_hours).toHaveLength(1);
  expect(detail.data.attachments).toHaveLength(1);
});

test.fixme('update validates like create (audit BE-006)', async () => {
  const data = {
    ...newOffice(),
    attachments: [{ id_attachment: coverId, attachment_role: 'cover' }],
  };
  const update = (patch: Record<string, unknown>) =>
    owner.put(`${base}/${officeId}`, { data: { ...data, ...patch } });
  await expectCode(await update({ office_code: 'X'.repeat(51) }), 400, 'OFFICE_CODE_TOO_LONG');
  await expectCode(await update({ office_name: 'N'.repeat(256) }), 400, 'OFFICE_NAME_TOO_LONG');
  await expectCode(
    await update({ office_name: '!!!', public_slug: '' }),
    400,
    'OFFICE_PUBLIC_SLUG_REQUIRED',
  );

  // Another office of the company already uses this name.
  const list = await expectCode(await owner.get(base), 200);
  const other = list.data.find((office: any) => office.id_office !== officeId);
  expect(other).toBeTruthy();
  await expectCode(
    await update({ office_name: other.office_name.toUpperCase() }),
    409,
    'OFFICE_ALREADY_EXISTS',
  );
});

test('list paging and sorting', async () => {
  const first = await expectCode(
    await owner.get(base, { params: { ord: 'office_name', srt: 'true', limit: '1', page: '1' } }),
    200,
  );
  expect(first.data).toHaveLength(1);
  expect(first.pagination).toMatchObject({ page: 1, limit: 1, length: 1, has_more: true });
  const second = await expectCode(
    await owner.get(base, { params: { ord: 'office_name', srt: 'true', limit: '1', page: '2' } }),
    200,
  );
  expect(second.pagination).toMatchObject({ page: 2, limit: 1 });
  expect(second.data[0].office_name < first.data[0].office_name).toBe(true);
  await expectCode(await owner.get(base, { params: { ord: 'unknown', limit: '500' } }), 200).then(
    (body) => expect(body.pagination).toMatchObject({ limit: 100 }),
  );
});

test('office photos need attachment.view', async () => {
  const accessId = await createAccessProfile(owner, 'Kantor Tanpa Media', [
    'office.view',
    'office.create',
    'office.update',
  ]);
  const account = await createAdminAccount(
    owner,
    'KantorMedia',
    await adminReferences(owner, { id_access: accessId }),
  );
  const editor = await login(account.identity, account.password);
  try {
    const withoutMedia = {
      ...newOffice(),
      office_code: `${code}-M`,
      office_name: 'Kantor Uji Tanpa Media',
      is_public: 0,
      attachments: [],
    };
    await expectCode(
      await editor.post(base, {
        data: { ...withoutMedia, attachments: [{ id_attachment: galleryId }] },
      }),
      403,
      'OFFICE_ATTACHMENT_ACCESS_DENIED',
    );
    const created = await expectCode(
      await editor.post(base, { data: withoutMedia }),
      201,
      'OFFICE_CREATED',
    );
    const id = created.data.id_office;
    await expectCode(
      await editor.put(`${base}/${id}`, {
        data: { ...withoutMedia, attachments: [{ id_attachment: galleryId }] },
      }),
      403,
      'OFFICE_ATTACHMENT_ACCESS_DENIED',
    );
    await expectCode(
      await editor.put(`${base}/${id}`, { data: { ...withoutMedia, city: 'Cimahi' } }),
      200,
      'OFFICE_UPDATED',
    );
  } finally {
    await editor.dispose();
  }
});

test('an account without office permissions is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Kantor', []);
  const references = await adminReferences(owner, { id_access: noPermissions });
  const account = await createAdminAccount(owner, 'Kantor', references);
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.get(`${base}/${officeId}`), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.post(base, { data: newOffice() }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
    await expectCode(await limited.delete(`${base}/${officeId}`), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});

test('status changes and delete rules', async () => {
  await expectCode(
    await owner.patch(`${base}/${officeId}/status`, { data: { status: 3 } }),
    400,
    'OFFICE_INVALID_STATUS',
  );
  await expectCode(
    await owner.patch(`${base}/${officeId}/status`, { data: { status: 1 } }),
    200,
    'OFFICE_ALREADY_ACTIVE',
  );
  await expectCode(await owner.delete(`${base}/${officeId}`), 409, 'OFFICE_MUST_BE_INACTIVE');

  // An admin assigned to the office blocks its deletion.
  const references = await adminReferences(owner, { id_office: officeId });
  const member = await createAdminAccount(owner, 'Anggota', references);
  await expectCode(await owner.get(`${base}/${officeId}`), 200).then((detail) =>
    expect(detail.data.admin_count).toBe(1),
  );

  await expectCode(
    await owner.patch(`${base}/${officeId}/status`, { data: { status: 0 } }),
    200,
    'OFFICE_DEACTIVATED',
  );
  await expectCode(
    await owner.patch(`${base}/${officeId}/status`, { data: { status: 0 } }),
    200,
    'OFFICE_ALREADY_INACTIVE',
  );
  const blocked = await expectCode(
    await owner.delete(`${base}/${officeId}`),
    409,
    'OFFICE_HAS_ADMIN_REFERENCES',
  );
  expect(blocked.data).toEqual({ assigned_accounts: 1 });

  await expectCode(
    await owner.patch(`/api/v1/admin-acct/${member.id}/status`, { data: { admin_acct_status: 0 } }),
    200,
  );
  await expectCode(
    await owner.delete(`/api/v1/admin-acct/${member.id}`),
    200,
    'ADMIN_ACCOUNT_DELETED',
  );
  await expectCode(await owner.delete(`${base}/${officeId}`), 200);
  await expectCode(await owner.get(`${base}/${officeId}`), 404, 'OFFICE_NOT_FOUND');
  await expectCode(await owner.delete(`${base}/not-a-hash`), 400, 'OFFICE_INVALID_ID');
});
