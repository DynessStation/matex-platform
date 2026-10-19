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
  saveRecording,
  uploadSample,
} from './api-contract';
import { stack } from './stack.mjs';

// API contract for attachments (backend/src/ctrl/admin/attachment.ts): upload rules per
// collection, list paging, sorting, and filters, and the delete and bulk delete rules
// (files still in use stay).
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/attachment';
const samplePng = fs.readFileSync(
  path.join(path.dirname(stack.stateFile), 'write', 'fixtures', 'sample.png'),
);

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let libraryIds: string[] = [];

const file = (name: string, mimeType: string, buffer: Buffer) => ({ name, mimeType, buffer });
const png = (name = 'sample.png') => file(name, 'image/png', samplePng);

// One multipart part per file, all under the field name "files".
const upload = (collection: string | undefined, files: ReturnType<typeof file>[]) => {
  const form = new FormData();
  if (collection !== undefined) form.append('collection', collection);
  for (const item of files) {
    form.append(
      'files',
      new Blob([new Uint8Array(item.buffer)], { type: item.mimeType }),
      item.name,
    );
  }
  return owner.post(base, { multipart: form });
};

// Rows uploaded by this spec carry runId in their names.
const ownRows = (params: Record<string, string> = {}) =>
  owner.get(base, { params: { search: `-${runId}`, ...params } });

let totalBefore = 0;

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('attachment-api', ['attachment', 'audit_log']);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('attachment endpoints require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.delete(`${base}/x`), 401, 'AUTH_TOKEN_REQUIRED');
});

test('upload validates collection, files, and types', async () => {
  owner = await login(admin.identity, admin.password);
  totalBefore = Number((await expectCode(await owner.get(base), 200)).pagination?.total);
  await expectCode(await upload('nope', [png()]), 400, 'ATTACHMENT_COLLECTION_INVALID');
  await expectCode(await upload(undefined, [png()]), 400, 'ATTACHMENT_COLLECTION_INVALID');
  await expectCode(await upload('media_library', []), 400, 'ATTACHMENT_FILE_REQUIRED');
  const tooMany = await expectCode(
    await upload('admin_profile', [png('a.png'), png('b.png')]),
    400,
    'ATTACHMENT_COLLECTION_FILE_LIMIT_EXCEEDED',
  );
  expect(tooMany.data).toEqual({ max_files: 1 });
  await expectCode(
    await upload(
      'product_media',
      Array.from({ length: 11 }, (_, i) => png(`${i}.png`)),
    ),
    400,
    'ATTACHMENT_UPLOAD_LIMIT_EXCEEDED',
  );
  // A type the collection does not accept is a client error, not a server error.
  await expectCode(
    await upload('media_library', [file('notes.txt', 'text/plain', Buffer.from('hello'))]),
    400,
    'ATTACHMENT_FILE_TYPE_NOT_ALLOWED',
  );
  await expectCode(
    await upload('media_library', [file('broken.png', 'image/png', Buffer.from('not an image'))]),
    400,
    'ATTACHMENT_IMAGE_PROCESS_FAILED',
  );
  await expectCode(
    await upload('admin_profile', [file('big.png', 'image/png', Buffer.alloc(9 * 1024 * 1024))]),
    400,
    'ATTACHMENT_FILE_TOO_LARGE',
  );
  await expectCode(
    await upload('product_media', [file('huge.mp4', 'video/mp4', Buffer.alloc(51 * 1024 * 1024))]),
    400,
    'ATTACHMENT_SERVER_FILE_SIZE_LIMIT',
  );
  // Nothing was stored by the refused uploads.
  const list = await expectCode(await owner.get(base), 200);
  expect(list.pagination).toMatchObject({ total: totalBefore });
});

test('upload stores images as webp', async () => {
  const single = await expectCode(
    await upload('media_library', [png(`satu-${runId}.png`)]),
    201,
    'ATTACHMENT_UPLOADED',
  );
  expect(single.data).toHaveLength(1);
  expect(single.data[0]).toMatchObject({
    collection_name: 'media_library',
    name: `satu-${runId}`,
    original_name: `satu-${runId}.png`,
    mime_type: 'image/webp',
    extension: 'webp',
    disk: 'local',
  });
  expect(single.data[0].asset_url).toContain(single.data[0].storage_path);

  const several = await expectCode(
    await upload('media_library', [png(`dua-${runId}.png`), png(`tiga-${runId}.png`)]),
    201,
    'ATTACHMENTS_UPLOADED',
  );
  expect(several.data).toHaveLength(2);
  libraryIds = [
    single.data[0].id_attachment,
    ...several.data.map((item: any) => item.id_attachment),
  ];
});

test('list, paging, sorting, and filters', async () => {
  const all = await expectCode(await owner.get(base), 200);
  expect(all.pagination).toMatchObject({ page: 1, limit: 20, total: totalBefore + 3 });
  // Newest first by default.
  expect(all.data.slice(0, 3).map((item: any) => item.id_attachment)).toEqual(
    [...libraryIds].reverse(),
  );
  const list = await expectCode(await ownRows(), 200);
  expect(list.pagination).toMatchObject({ total: 3, length: 3, has_more: false });
  expect(list.data[0]).toMatchObject({ file_size: expect.any(Number), width: expect.any(Number) });

  const oldest = await expectCode(await ownRows({ sort: 'OLDEST' }), 200);
  expect(oldest.data.map((item: any) => item.id_attachment)).toEqual(libraryIds);
  for (const sort of ['smallest', 'largest', 'newest', 'whatever']) {
    await expectCode(await owner.get(base, { params: { sort } }), 200);
  }
  const paged = await expectCode(await ownRows({ limit: '2', page: '2' }), 200);
  expect(paged.pagination).toMatchObject({ page: 2, limit: 2, length: 1, total_pages: 2 });
  const capped = await expectCode(await owner.get(base, { params: { limit: '500' } }), 200);
  expect(capped.pagination).toMatchObject({ limit: 50 });
  await expectCode(await owner.get(base, { params: { page: 'x', limit: '-1' } }), 200);

  const filtered = async (params: Record<string, string>) =>
    (await expectCode(await ownRows(params), 200)).pagination?.total;
  expect(await filtered({ search: `dua-${runId}` })).toBe(1);
  expect(await filtered({ search: 'no-such-file' })).toBe(0);
  expect(await filtered({ collection: 'media_library' })).toBe(3);
  expect(await filtered({ collection: 'office_media' })).toBe(0);
  expect(await filtered({ mime_type: 'image/' })).toBe(3);
  expect(await filtered({ mime_type: 'video/' })).toBe(0);
});

test('delete refuses files in use and removes the rest', async () => {
  await expectCode(await owner.delete(`${base}/not-a-hash`), 400, 'ATTACHMENT_INVALID_ID');

  // A profile photo in use.
  const photo = await uploadSample(owner, 'admin_profile');
  const references = await adminReferences(owner);
  await createAdminAccount(owner, 'Foto', {
    ...references,
    id_profile_photo: photo,
  } as typeof references);
  await expectCode(await owner.delete(`${base}/${photo}`), 409, 'ATTACHMENT_IN_USE');

  // A product category image in use.
  const categoryImage = await uploadSample(owner, 'media_library');
  await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `attachment-category-${runId}`,
        status: 'draft',
        image_id: categoryImage,
        translations: [
          {
            locale: 'id-ID',
            slug: `kategori-lampiran-${runId}`,
            name: `Kategori Lampiran ${runId}`,
          },
          {
            locale: 'en-US',
            slug: `attachment-category-${runId}`,
            name: `Attachment Category ${runId}`,
          },
        ],
      },
    }),
    201,
  );
  await expectCode(await owner.delete(`${base}/${categoryImage}`), 409, 'ATTACHMENT_IN_USE');

  await expectCode(await owner.delete(`${base}/${libraryIds[0]}`), 200, 'ATTACHMENT_DELETED');
  await expectCode(await owner.delete(`${base}/${libraryIds[0]}`), 404, 'ATTACHMENT_NOT_FOUND');

  // Bulk delete.
  const bulk = (ids: unknown) => owner.post(`${base}/bulk-delete`, { data: { ids } });
  await expectCode(await bulk([]), 400, 'ATTACHMENT_BULK_REQUIRED');
  await expectCode(await bulk('x'), 400, 'ATTACHMENT_BULK_REQUIRED');
  const overLimit = await expectCode(
    await bulk(Array(101).fill(libraryIds[1])),
    400,
    'ATTACHMENT_BULK_LIMIT_EXCEEDED',
  );
  expect(overLimit.data).toEqual({ max_items: 100 });
  await expectCode(await bulk([libraryIds[1], 'bad']), 400, 'ATTACHMENT_BULK_INVALID_ID');
  await expectCode(await bulk([libraryIds[1], libraryIds[0]]), 404, 'ATTACHMENT_BULK_NOT_FOUND');
  const blocked = await expectCode(
    await bulk([libraryIds[1], photo, categoryImage]),
    409,
    'ATTACHMENT_BULK_IN_USE',
  );
  expect(new Set(blocked.data.blocked_ids)).toEqual(new Set([photo, categoryImage]));
  const deleted = await expectCode(
    await bulk([libraryIds[1], libraryIds[2], libraryIds[1]]),
    200,
    'ATTACHMENTS_DELETED',
  );
  expect(deleted.data).toEqual({ deleted: 2 });

  const remaining = await expectCode(await owner.get(base, { params: { limit: '50' } }), 200);
  const remainingIds = remaining.data.map((item: any) => item.id_attachment);
  expect(remainingIds).toEqual(expect.arrayContaining([photo, categoryImage]));
  expect(remainingIds).not.toEqual(expect.arrayContaining([libraryIds[0]]));
  expect(remainingIds).not.toEqual(expect.arrayContaining([libraryIds[2]]));
  expect(remaining.pagination).toMatchObject({ total: totalBefore + 2 });
});

test('an account without attachment rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Lampiran', []);
  const account = await createAdminAccount(
    owner,
    'Lampiran',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.post(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.delete(`${base}/x`), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(
      await limited.post(`${base}/bulk-delete`, { data: { ids: ['x'] } }),
      403,
      'AUTH_PERMISSION_DENIED',
    );
  } finally {
    await limited.dispose();
  }
});
