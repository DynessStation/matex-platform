import assert from "node:assert/strict";
import test from "node:test";

import {
  CMS_GADGET_HOME_ATTACHMENT_ROLES,
  CMS_GADGET_HOME_MEDIA_RULES,
  validateCmsGadgetHomeMedia,
} from "../src/config/cms-page.config";

test("every gadget Home role accepts its original template canvas", () => {
  assert.equal(CMS_GADGET_HOME_ATTACHMENT_ROLES.length, 7);

  for (const role of CMS_GADGET_HOME_ATTACHMENT_ROLES) {
    const rule = CMS_GADGET_HOME_MEDIA_RULES[role];

    assert.equal(
      validateCmsGadgetHomeMedia(role, {
        mimeType: "image/webp",
        width: rule.recommendedWidth,
        height: rule.recommendedHeight,
      }),
      null,
      role,
    );
  }
});

test("gadget Home media rejects an undersized image", () => {
  assert.equal(
    validateCmsGadgetHomeMedia("home_main", {
      mimeType: "image/jpeg",
      width: 1200,
      height: 800,
    })?.code,
    "CMS_PAGE_HOME_MEDIA_TOO_SMALL",
  );
});

test("gadget Home media rejects a materially different aspect ratio", () => {
  assert.equal(
    validateCmsGadgetHomeMedia("home_side_1", {
      mimeType: "image/png",
      width: 1254,
      height: 1254,
    })?.code,
    "CMS_PAGE_HOME_MEDIA_RATIO_INVALID",
  );
});

test("gadget Home media only accepts browser-safe configured formats", () => {
  assert.equal(
    validateCmsGadgetHomeMedia("home_tile_1", {
      mimeType: "image/gif",
      width: 1172,
      height: 984,
    })?.code,
    "CMS_PAGE_HOME_MEDIA_TYPE_INVALID",
  );
});

test("non-gadget roles are outside the gadget Home media contract", () => {
  assert.equal(
    validateCmsGadgetHomeMedia("og", {
      mimeType: "image/jpeg",
      width: 1200,
      height: 630,
    }),
    null,
  );
});
