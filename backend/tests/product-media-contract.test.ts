import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProductMediaSortOrder } from "../src/helper/product-media.helper";

test("product media keeps zero as the first gallery position", () => {
  assert.equal(normalizeProductMediaSortOrder(0, 2), 0);
  assert.equal(normalizeProductMediaSortOrder("0", 2), 0);
});

test("product media falls back to its payload index only when order is absent", () => {
  assert.equal(normalizeProductMediaSortOrder(undefined, 4), 4);
  assert.equal(normalizeProductMediaSortOrder("not-a-number", 5), 5);
});

test("product media does not accept a negative sort position", () => {
  assert.equal(normalizeProductMediaSortOrder(-3, 2), 0);
});
