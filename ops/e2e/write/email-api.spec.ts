import { expect, request, test, type APIRequestContext } from '@playwright/test';

import {
  admin,
  adminReferences,
  apiContext,
  createAccessProfile,
  createAdminAccount,
  expectCode,
  login,
} from './api-contract';

// API contract for the Email menu (backend/src/ctrl/admin/email.ts) against a stand-in of the mail
// provider (fake-mail-server.mjs): reading, the read mark, trash, sending, and the rights.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/email';
const box = 'AC-E2E-1';
const mail = 'http://127.0.0.1:3199';

let owner: APIRequestContext;
let anonymous: APIRequestContext;

const provider = async () => request.newContext({ baseURL: mail });

test.beforeAll(async () => {
  owner = await login(admin.identity, admin.password);
  anonymous = await apiContext();
  await (await provider()).post('/__reset');
});

test.afterAll(async () => {
  await (await provider()).post('/__reset');
  await owner?.dispose();
  await anonymous?.dispose();
});

test('email needs a session, and an account without the rights is refused', async () => {
  await expectCode(await anonymous.get(`${base}/mailboxes`), 401, 'AUTH_TOKEN_REQUIRED');
  const profile = await createAccessProfile(owner, 'Tanpa Izin Email', []);
  const account = await createAdminAccount(
    owner,
    'Surel',
    await adminReferences(owner, { id_access: profile }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(`${base}/mailboxes`), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.post(`${base}/${box}/send`, { data: {} }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
    await expectCode(
      await limited.post(`${base}/${box}/messages/1/trash`, { data: {} }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
  } finally {
    await limited.dispose();
  }
});

test('mailboxes, folders, and messages with search', async () => {
  const mailboxes = (await expectCode(await owner.get(`${base}/mailboxes`), 200)).data;
  expect(mailboxes).toEqual({
    configured: true,
    mailboxes: [{ id: box, address: 'info@example.invalid' }],
  });

  const folders = (await expectCode(await owner.get(`${base}/${box}/folders`), 200)).data;
  expect(folders[0]).toEqual({
    path: 'INBOX',
    name: 'Inbox',
    special_use: '\\Inbox',
    total: 3,
    unread: 1,
  });

  const list = await expectCode(await owner.get(`${base}/${box}/messages`), 200);
  expect(list.data.map((item: { uid: number }) => item.uid)).toEqual([3, 2, 1]);
  expect(list.meta).toMatchObject({ page: 1, total: 3 });
  expect(list.data[0]).toMatchObject({ unseen: true, subject: 'Tanya harga kasur' });
  expect(list.data[0].text).toBeUndefined();
  expect(list.data[1].answered).toBe(true);

  const found = await expectCode(
    await owner.get(`${base}/${box}/messages`, { params: { search: 'distributor' } }),
    200,
  );
  expect(found.data.map((item: { uid: number }) => item.uid)).toEqual([2]);
});

test('opening a message does not mark it; the mark is asked for', async () => {
  const message = (await expectCode(await owner.get(`${base}/${box}/messages/3`), 200)).data;
  expect(message).toMatchObject({ uid: 3, unseen: true, text: 'Halo, berapa harga kasur?' });
  expect(message.html).toContain('berapa');
  expect(message.attachments[0]).toMatchObject({ id: 'att-1', filename: 'surat penawaran.html' });

  await expectCode(
    await owner.patch(`${base}/${box}/messages/3/seen`, { data: { seen: true, folder: 'INBOX' } }),
    200,
  );
  const folders = (await expectCode(await owner.get(`${base}/${box}/folders`), 200)).data;
  expect(folders[0].unread).toBe(0);
  await expectCode(
    await owner.patch(`${base}/${box}/messages/3/seen`, { data: { seen: false } }),
    200,
  );

  await expectCode(await owner.get(`${base}/${box}/messages/abc`), 400, 'MAIL_MESSAGE_INVALID');
  await expectCode(await owner.get(`${base}/${box}/messages/99`), 404, 'MAIL_NOT_FOUND');
});

test('an attachment always comes as a download, with a safe name', async () => {
  const file = await owner.get(`${base}/${box}/messages/3/attachments/att-1`, {
    params: { name: '../surat "x".html' },
  });
  expect(file.status()).toBe(200);
  const headers = file.headers();
  expect(headers['content-type']).toBe('application/octet-stream');
  expect(headers['content-disposition']).toBe('attachment; filename=".._surat _x_.html"');
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('sending checks its fields, leaves an audit entry, and replies point at the message', async () => {
  const send = (data: Record<string, unknown>) => owner.post(`${base}/${box}/send`, { data });
  const valid = { to: 'budi@example.invalid', subject: 'Jawaban', text: 'Isi pesan rahasia' };
  await expectCode(await send({ ...valid, to: '' }), 400, 'MAIL_SEND_INVALID');
  await expectCode(await send({ ...valid, to: 'bukan alamat' }), 400, 'MAIL_ADDRESS_INVALID');
  await expectCode(await send({ ...valid, subject: ' ' }), 400, 'MAIL_SEND_INVALID');
  await expectCode(await send({ ...valid, text: ' ' }), 400, 'MAIL_SEND_INVALID');
  await expectCode(
    await send({
      ...valid,
      in_reply_to: { uid: 3, folder: 'INBOX' },
      forward_of: { uid: 3, folder: 'INBOX' },
    }),
    400,
    'MAIL_SEND_INVALID',
  );

  await expectCode(
    await send({
      ...valid,
      to: 'budi@example.invalid, dua@example.invalid',
      cc: 'tiga@example.invalid',
      in_reply_to: { uid: 3, folder: 'INBOX' },
    }),
    200,
    'MAIL_SENT',
  );
  const sent = await (await (await provider()).get('/__sent')).json();
  expect(sent[0]).toEqual({
    to: ['budi@example.invalid', 'dua@example.invalid'],
    cc: ['tiga@example.invalid'],
    subject: 'Jawaban',
    text: 'Isi pesan rahasia',
    inReplyTo: { uid: 3, folder: 'INBOX' },
  });

  const logs = await expectCode(
    await owner.get('/api/v1/audit-log', { params: { event_code: 'email.sent' } }),
    200,
  );
  expect(logs.data.length).toBeGreaterThan(0);
  expect(JSON.stringify(logs.data)).not.toContain('Isi pesan rahasia');
});

test('a message goes to the trash, and not twice', async () => {
  const moved = await expectCode(
    await owner.post(`${base}/${box}/messages/1/trash`, { data: { folder: 'INBOX' } }),
    200,
  );
  expect(moved.data.folder).toBe('INBOX.Trash');
  await expectCode(
    await owner.post(`${base}/${box}/messages/1/trash`, { data: { folder: 'INBOX.Trash' } }),
    409,
    'MAIL_ALREADY_TRASH',
  );
});

test('the contact insight counts the mailbox', async () => {
  await (await provider()).post('/__reset');
  const counts = (await expectCode(await owner.get('/api/v1/public-contact/insight/mail'), 200))
    .data;
  expect(counts).toEqual({
    configured: true,
    address: 'info@example.invalid',
    total: 3,
    unread: 1,
    answered: 1,
    read: 1,
  });
});
