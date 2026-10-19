import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';

import express from 'express';

import keyhsid from '../src/hsid';
import { HttpError } from '../src/helper/http-error.helper';
import { decodeId } from '../src/helper/id.helper';
import {
  contentSlug,
  isValidEmail,
  isValidHttpUrl,
  nullableString,
  parseFlag,
  slugFromText,
  toFlag,
  trimTo,
} from '../src/helper/input.helper';
import { parseJsonValue } from '../src/helper/json.helper';
import { parseListQuery, sortDirection } from '../src/helper/list-query.helper';
import { withTransaction } from '../src/helper/transaction.helper';
import { errorHandler } from '../src/middleware/error-handler.middleware';

test('input: strings', () => {
  assert.equal(nullableString('  a b  '), 'a b');
  assert.equal(nullableString('   '), null);
  assert.equal(nullableString(42), null);
  assert.equal(trimTo('  abcdef ', 3), 'abc');
  assert.equal(trimTo(null, 3), '');
  assert.equal(trimTo(12345, 3), '123');
});

test('input: flags', () => {
  for (const yes of [true, 1, '1', 'true']) assert.equal(parseFlag(yes), 1);
  for (const no of [false, 0, '0', 'false']) assert.equal(parseFlag(no), 0);
  for (const other of [undefined, null, '', 'yes', 2]) assert.equal(parseFlag(other), null);
  assert.equal(toFlag('yes'), 0);
  assert.equal(toFlag(undefined, 1), 1);
  assert.equal(toFlag('0', 1), 0);
});

test('input: slugs', () => {
  assert.equal(slugFromText('  Kantor Pusat Bandung (Éntri) '), 'kantor-pusat-bandung-entri');
  assert.equal(slugFromText('!!!'), '');
  assert.equal(contentSlug(' Tentang_MATEX / Baru '), 'tentang_matex-baru');
  assert.equal(contentSlug(42), '');
  assert.equal(contentSlug('a'.repeat(300)).length, 255);
});

test('input: email and URL', () => {
  assert.equal(isValidEmail('info@matexindo.com'), true);
  assert.equal(isValidEmail('info@matexindo'), false);
  assert.equal(isValidEmail('a b@c.d'), false);
  assert.equal(isValidHttpUrl('https://matexindo.com/kontak'), true);
  assert.equal(isValidHttpUrl('ftp://matexindo.com'), false);
  assert.equal(isValidHttpUrl('not a url'), false);
});

test('id: decodeId', () => {
  assert.equal(decodeId(keyhsid.idOffice.encode(7), keyhsid.idOffice), 7);
  assert.equal(decodeId('not-a-hash', keyhsid.idOffice), null);
  assert.equal(decodeId(undefined, keyhsid.idOffice), null);
  assert.equal(decodeId(keyhsid.idOffice.encode(0), keyhsid.idOffice), null);
});

test('list query: paging and search', () => {
  assert.deepEqual(parseListQuery({}), {
    page: 1,
    limit: 15,
    offset: 0,
    search: '',
    searchValue: '%%',
  });
  assert.deepEqual(parseListQuery({ page: '3', limit: '10', search: ' kantor ' }), {
    page: 3,
    limit: 10,
    offset: 20,
    search: 'kantor',
    searchValue: '%kantor%',
  });
  assert.equal(parseListQuery({ limit: '500' }).limit, 100);
  assert.equal(parseListQuery({ limit: '500' }, { maxLimit: 50 }).limit, 50);
  assert.equal(parseListQuery({ limit: 'x', page: '-2' }, { defaultLimit: 20 }).limit, 20);
  assert.equal(parseListQuery({ page: ['2', '3'] }).page, 1);
});

test('list query: sort direction', () => {
  assert.equal(sortDirection('desc', 'ASC'), 'DESC');
  assert.equal(sortDirection('true', 'ASC'), 'DESC');
  assert.equal(sortDirection('asc', 'DESC'), 'ASC');
  assert.equal(sortDirection('false', 'DESC'), 'ASC');
  assert.equal(sortDirection(undefined, 'DESC'), 'DESC');
  assert.equal(sortDirection('random', 'ASC'), 'ASC');
});

test('json: parseJsonValue', () => {
  assert.equal(parseJsonValue(null), null);
  assert.equal(parseJsonValue(undefined), null);
  assert.deepEqual(parseJsonValue('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonValue({ a: 1 }), { a: 1 });
  assert.equal(parseJsonValue('{broken'), null);
  assert.equal(parseJsonValue(''), null);
  assert.equal(parseJsonValue('{broken', { onInvalid: 'raw' }), '{broken');
  assert.equal(parseJsonValue('', { onInvalid: 'raw' }), '');
});

const fakePool = () => {
  const calls: string[] = [];
  const connection = {
    beginTransaction: async () => void calls.push('begin'),
    commit: async () => void calls.push('commit'),
    rollback: async () => void calls.push('rollback'),
    release: () => void calls.push('release'),
  };
  return { calls, pool: { getConnection: async () => connection } as any };
};

test('transaction: commits on success', async () => {
  const { calls, pool } = fakePool();
  const result = await withTransaction(pool, async () => 'done');
  assert.equal(result, 'done');
  assert.deepEqual(calls, ['begin', 'commit', 'release']);
});

test('transaction: rolls back and rethrows on error', async () => {
  const { calls, pool } = fakePool();
  await assert.rejects(
    withTransaction(pool, async () => {
      throw new HttpError(409, 'THING_EXISTS', 'Thing already exists');
    }),
    (error: unknown) => error instanceof HttpError && error.code === 'THING_EXISTS',
  );
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});

test('error handler: HttpError from a mounted router becomes its response; others become 500', async () => {
  const router = express.Router();
  router.get('/known', async () => {
    throw new HttpError(404, 'THING_NOT_FOUND', 'Thing not found', { id: 'x' });
  });
  router.get('/unknown', async () => {
    throw new Error('boom');
  });
  const sub = express();
  sub.use(router);
  const app = express();
  app.use(sub);
  app.use(errorHandler);

  const originalError = console.error;
  console.error = () => {};
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const known = await fetch(`${base}/known`);
    assert.equal(known.status, 404);
    assert.deepEqual(await known.json(), {
      success: false,
      code: 'THING_NOT_FOUND',
      message: 'Thing not found',
      data: { id: 'x' },
    });

    const unknown = await fetch(`${base}/unknown`);
    assert.equal(unknown.status, 500);
    assert.deepEqual(await unknown.json(), {
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
    });
  } finally {
    console.error = originalError;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
