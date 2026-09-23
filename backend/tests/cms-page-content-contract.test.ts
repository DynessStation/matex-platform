import assert = require("node:assert/strict");
import test = require("node:test");

import { validateCmsGadgetHomeContent } from "../src/config/cms-page.config";

test("accepts Home section visibility with boolean statuses", () => {
  assert.equal(
    validateCmsGadgetHomeContent({
      sale_product: { status: false },
      newsletter: { status: true },
    }),
    null,
  );
});

test("preserves the template extension boundary by allowing unknown keys", () => {
  assert.equal(
    validateCmsGadgetHomeContent({ custom_section: { status: "draft" } }),
    null,
  );
});

test("rejects non-boolean status for a managed Home section", () => {
  const issue = validateCmsGadgetHomeContent({
    sale_product: { status: 1 },
  });

  assert.equal(issue?.code, "CMS_PAGE_HOME_SECTION_STATUS_INVALID");
  assert.deepEqual(issue?.data, { section: "sale_product" });
});

test("rejects a managed Home section that is not an object", () => {
  assert.equal(
    validateCmsGadgetHomeContent({ newsletter: false })?.code,
    "CMS_PAGE_HOME_SECTION_INVALID",
  );
});
