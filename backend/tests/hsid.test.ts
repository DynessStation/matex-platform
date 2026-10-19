import assert from 'node:assert/strict';
import test from 'node:test';

import keyhsid from '../src/hsid';

test('hashids round-trips a valid id', () => {
  const encoded = keyhsid.idAdmin.encode(42);
  assert.deepEqual(keyhsid.idAdmin.decode(encoded), [42]);
});

test('hashids returns no id for malformed input instead of throwing (audit BE-004)', () => {
  for (const value of ['not-a-hash', 'abc def', '!!!', '']) {
    assert.deepEqual(keyhsid.idAdmin.decode(value), []);
  }
  assert.deepEqual(keyhsid.idMasterCompany.decode(42 as unknown as string), []);
});
