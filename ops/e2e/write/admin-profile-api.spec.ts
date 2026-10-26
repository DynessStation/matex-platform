import fs from 'node:fs';
import path from 'node:path';

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
  runNumber,
  saveRecording,
} from './api-contract';
import { stack } from './stack.mjs';

// API contract for "Profil saya" (backend/src/ctrl/admin/admin-account/profile.ts, U-16): the
// signed-in admin changes their own name, backup contacts, photo, and password with only a
// session; the login identities stay unchanged; a new password signs out other devices.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/admin-acct';
const sample = path.join(path.dirname(stack.stateFile), 'write', 'fixtures', 'sample.png');

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let device: APIRequestContext;
let otherDevice: APIRequestContext;
let account: { id: string; identity: string; password: string };
const newPassword = `Profil-${runId}-7`;

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  // An access profile without admin-account or media permissions.
  const idAccess = await createAccessProfile(owner, 'Profil saja', ['dashboard.view']);
  account = await createAdminAccount(
    owner,
    'Profil',
    await adminReferences(owner, { id_access: idAccess }),
  );
  device = await login(account.identity, account.password);
  otherDevice = await login(account.identity, account.password);
});

test.afterAll(async () => {
  await saveRecording('admin-profile-api', ['admin_acct', 'audit_log']);
  for (const context of [anonymous, owner, device, otherDevice]) await context?.dispose();
});

test('profile endpoints require a session', async () => {
  await expectCode(await anonymous.put(`${base}/me`, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(`${base}/me/photo`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.delete(`${base}/me/photo`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(
    await anonymous.put(`${base}/me/password`, { data: {} }),
    401,
    'AUTH_TOKEN_REQUIRED',
  );
});

test('name and backup contacts are validated', async () => {
  const valid = { name: 'Profil Saya' };
  const cases: Array<[Record<string, unknown>, number, string]> = [
    [{ name: '' }, 400, 'ADMIN_PROFILE_NAME_REQUIRED'],
    [{ name: 'Nama 123' }, 400, 'ADMIN_ACCOUNT_NAME_INVALID'],
    [{ ...valid, email_2: 'not-an-email' }, 400, 'ADMIN_ACCOUNT_EMAIL_INVALID'],
    [{ ...valid, phone_2: '08123' }, 400, 'ADMIN_ACCOUNT_PHONE_INVALID'],
    [{ ...valid, email_2: admin.identity }, 409, 'ADMIN_ACCOUNT_EMAIL_EXISTS'],
  ];
  for (const [data, status, code] of cases) {
    await expectCode(await device.put(`${base}/me`, { data }), status, code);
  }
});

test('name and backup contacts are saved; login identities and alias stay', async () => {
  const before = await expectCode(await device.get(`${base}/me`), 200);
  const email2 = `cadangan.${runId}@example.invalid`;
  const phone2 = `+6285${String(runNumber).padStart(7, '0')}1`;
  const body = await expectCode(
    await device.put(`${base}/me`, {
      data: {
        name: 'Profil Saya Baru',
        email_2: email2,
        phone_2: phone2,
        // Ignored: these change only through Akun Admin.
        email_1: `lain.${runId}@example.invalid`,
        alias: 'Lain',
        id_access: 'x',
      },
    }),
    200,
    'ADMIN_PROFILE_UPDATED',
  );
  expect(body.data).toMatchObject({
    name: 'Profil Saya Baru',
    email_1: account.identity,
    email_2: email2,
    phone_2: phone2,
    alias: before.data.alias,
  });
  const me = await expectCode(await device.get(`${base}/me`), 200);
  expect(me.data).toMatchObject({ name: 'Profil Saya Baru', email_2: email2, phone_2: phone2 });

  // Clearing a backup contact.
  const cleared = await expectCode(
    await device.put(`${base}/me`, { data: { name: 'Profil Saya Baru', email_2: '' } }),
    200,
    'ADMIN_PROFILE_UPDATED',
  );
  expect(cleared.data.email_2 ?? null).toBeNull();
});

test('the photo is uploaded and removed without media permissions', async () => {
  await expectCode(await device.post(`${base}/me/photo`), 400, 'ADMIN_PROFILE_PHOTO_REQUIRED');
  const text = await device.post(`${base}/me/photo`, {
    multipart: {
      file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
    },
  });
  expect(text.status()).toBe(400);

  const uploaded = await expectCode(
    await device.post(`${base}/me/photo`, {
      multipart: {
        file: { name: 'sample.png', mimeType: 'image/png', buffer: fs.readFileSync(sample) },
      },
    }),
    200,
    'ADMIN_PROFILE_PHOTO_UPDATED',
  );
  expect(uploaded.data.id_profile_photo).toBeTruthy();
  expect(uploaded.data.profile_photo.asset_url).toMatch(/admin-profile/);

  const removed = await expectCode(
    await device.delete(`${base}/me/photo`),
    200,
    'ADMIN_PROFILE_PHOTO_REMOVED',
  );
  expect(removed.data.id_profile_photo).toBeNull();
  // Removing again is harmless.
  await expectCode(await device.delete(`${base}/me/photo`), 200, 'ADMIN_PROFILE_PHOTO_REMOVED');
});

test('the password change is validated and checks the current password', async () => {
  const valid = {
    current_password: account.password,
    password: newPassword,
    password_confirmation: newPassword,
  };
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ ...valid, current_password: '' }, 'ADMIN_PASSWORD_FIELDS_REQUIRED'],
    [
      { ...valid, password: 'onlyletters', password_confirmation: 'onlyletters' },
      'ADMIN_ACCOUNT_PASSWORD_INVALID',
    ],
    [{ ...valid, password_confirmation: `${newPassword}x` }, 'ADMIN_PASSWORD_CONFIRMATION_MISMATCH'],
    [
      { ...valid, password: account.password, password_confirmation: account.password },
      'ADMIN_PASSWORD_UNCHANGED',
    ],
    [{ ...valid, current_password: `${account.password}x` }, 'ADMIN_PASSWORD_CURRENT_INVALID'],
  ];
  for (const [data, code] of cases) {
    await expectCode(await device.put(`${base}/me/password`, { data }), 400, code);
  }
  // Nothing changed: both devices are still signed in with the old password.
  await expectCode(await otherDevice.get(`${base}/me`), 200);
});

test('a new password keeps this session and signs out other devices', async () => {
  const before = await expectCode(await device.get(`${base}/me`), 200);
  await expectCode(
    await device.put(`${base}/me/password`, {
      data: {
        current_password: account.password,
        password: newPassword,
        password_confirmation: newPassword,
      },
    }),
    200,
    'ADMIN_PASSWORD_CHANGED',
  );

  // This device keeps its session and its end time.
  const after = await expectCode(await device.get(`${base}/me`), 200);
  expect(Math.abs(after.session.expires_at - before.session.expires_at)).toBeLessThanOrEqual(1000);

  // The other device is signed out.
  await expectCode(await otherDevice.get(`${base}/me`), 401, 'AUTH_TOKEN_INVALID_OR_EXPIRED');

  // The old password no longer works; the new one does.
  await expectCode(
    await anonymous.post(`${base}/login`, {
      data: { identity: account.identity, password: account.password },
    }),
    401,
    'AUTH_INVALID_CREDENTIALS',
  );
  const fresh = await login(account.identity, newPassword);
  await fresh.dispose();
});

test('profile changes are in the activity log', async () => {
  const body = await expectCode(
    await owner.get('/api/v1/audit-log', { params: { search: 'profile_updated', limit: 50 } }),
    200,
  );
  const codes = (body.data as Array<{ event_code: string }>).map((row) => row.event_code);
  expect(codes).toContain('admin_account.profile_updated');
  const password = await expectCode(
    await owner.get('/api/v1/audit-log', { params: { search: 'auth.password', limit: 50 } }),
    200,
  );
  const passwordCodes = (password.data as Array<{ event_code: string }>).map(
    (row) => row.event_code,
  );
  expect(passwordCodes).toEqual(
    expect.arrayContaining(['auth.password.changed', 'auth.password.change_failed']),
  );
});
