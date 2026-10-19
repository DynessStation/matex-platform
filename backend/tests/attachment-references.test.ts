import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getAttachmentReferences } from '../src/ctrl/admin/attachment';

test('website page media prevents a referenced attachment from being deleted', async () => {
  const queries: string[] = [];
  const executor = {
    query: async (sql: string) => {
      queries.push(sql);

      if (sql.includes('FROM website_page_media')) {
        return [[{ id_attachment: 17, total: 2 }], []];
      }

      return [[], []];
    },
  };

  const references = await getAttachmentReferences([17], executor);

  assert.ok(queries.some((sql) => sql.includes('FROM website_page_media')));
  assert.deepEqual(references, [
    {
      idAttachment: 17,
      source: 'website_page.media',
      total: 2,
    },
  ]);
});

test('product and product category media prevent deletion (BE-009)', async () => {
  const executor = {
    query: async (sql: string) => {
      if (sql.includes('FROM product_catalog_attachment'))
        return [[{ id_attachment: 5, total: 1 }], []];
      if (sql.includes('FROM product_category_attachment'))
        return [[{ id_attachment: 6, total: 3 }], []];
      return [[], []];
    },
  };

  assert.deepEqual(await getAttachmentReferences([5, 6], executor), [
    { idAttachment: 5, source: 'product.attachment', total: 1 },
    { idAttachment: 6, source: 'product_category.attachment', total: 3 },
  ]);
});
