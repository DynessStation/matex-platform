import assert from "node:assert/strict";
import test from "node:test";

import {
  WEBSITE_HOME_MEDIA_RULES,
  WEBSITE_HOME_MEDIA_SLOTS,
  validateWebsiteHomeMedia,
} from "../src/config/website-home.config";

test("every Home media slot accepts its original template canvas", () => {
  assert.equal(WEBSITE_HOME_MEDIA_SLOTS.length, 7);

  for (const slot of WEBSITE_HOME_MEDIA_SLOTS) {
    const rule = WEBSITE_HOME_MEDIA_RULES[slot];
    assert.equal(
      validateWebsiteHomeMedia(slot, {
        mimeType: "image/webp",
        width: rule.recommendedWidth,
        height: rule.recommendedHeight,
      }),
      null,
      slot,
    );
  }
});

test("Home media rejects an undersized image", () => {
  assert.equal(
    validateWebsiteHomeMedia("home_main", {
      mimeType: "image/jpeg",
      width: 1200,
      height: 800,
    })?.code,
    "WEBSITE_HOME_MEDIA_TOO_SMALL",
  );
});

test("Home media rejects a materially different aspect ratio", () => {
  assert.equal(
    validateWebsiteHomeMedia("home_side_1", {
      mimeType: "image/png",
      width: 1254,
      height: 1254,
    })?.code,
    "WEBSITE_HOME_MEDIA_RATIO_INVALID",
  );
});

test("Home media only accepts configured browser-safe formats", () => {
  assert.equal(
    validateWebsiteHomeMedia("home_tile_1", {
      mimeType: "image/gif",
      width: 1172,
      height: 984,
    })?.code,
    "WEBSITE_HOME_MEDIA_TYPE_INVALID",
  );
});

test("other website media slots are outside the Home banner contract", () => {
  assert.equal(
    validateWebsiteHomeMedia("og", {
      mimeType: "image/jpeg",
      width: 1200,
      height: 630,
    }),
    null,
  );
});
