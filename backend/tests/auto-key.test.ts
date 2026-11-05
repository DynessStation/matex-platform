import assert from 'node:assert/strict';
import test from 'node:test';

import { candidateKey } from '../src/helper/auto-key.helper';

test('the first candidate is the slug itself, cut to the key length', () => {
  assert.equal(candidateKey('kasur-latex', 1), 'kasur-latex');
  assert.equal(candidateKey('a'.repeat(200), 1).length, 120);
});

test('later candidates get a number and stay within the key length', () => {
  assert.equal(candidateKey('kasur-latex', 2), 'kasur-latex-2');
  const long = candidateKey(`${'a'.repeat(117)}-bcd`, 12);
  assert.equal(long.length, 120);
  assert.ok(long.endsWith('-12'));
  // A cut that lands on a hyphen does not leave two in a row.
  assert.equal(candidateKey(`${'a'.repeat(117)}-${'b'.repeat(9)}`, 2), `${'a'.repeat(117)}-2`);
});
