import assert from "node:assert/strict";
import { test } from "node:test";

import { getAttachmentReferences } from "../src/ctrl/admin/attachment";

test("website page media prevents a referenced attachment from being deleted", async () => {
  const queries: string[] = [];
  const executor = {
    query: async (sql: string) => {
      queries.push(sql);

      if (sql.includes("FROM website_page_media")) {
        return [[{ id_attachment: 17, total: 2 }], []];
      }

      return [[], []];
    },
  };

  const references = await getAttachmentReferences([17], executor);

  assert.ok(queries.some((sql) => sql.includes("FROM cms_page_attachment")));
  assert.ok(queries.some((sql) => sql.includes("FROM website_page_media")));
  assert.deepEqual(references, [
    {
      idAttachment: 17,
      source: "website_page.media",
      total: 2,
    },
  ]);
});
