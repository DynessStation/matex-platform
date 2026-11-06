import { createRequire } from 'node:module';
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
} from './api-contract';
import { stack } from './stack.mjs';

// API contract of HPP, prices, channels, and the workbook import
// (backend/src/ctrl/admin/costing). Costs stay internal: permissions are checked, and no public
// response may carry them.
test.describe.configure({ mode: 'serial' });

const requireBackend = createRequire(
  path.join(path.dirname(stack.stateFile), '..', '..', 'backend', 'package.json'),
);
const ExcelJS = requireBackend('exceljs');

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let viewer: APIRequestContext;
let categoryId = '';
let productId = '';
const sku = `HP-${runId}`.toUpperCase();
let itemId = '';
let latexId = '';

const near = (actual: number, expected: number, tolerance = 0.01) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

const itemOf = async (id = itemId) =>
  (await expectCode(await owner.get(`/api/v1/costing/items/${id}`), 200)).data;

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `hpp-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `hpp-${runId}-id`, name: `Kategori HPP ${runId}` },
          { locale: 'en-US', slug: `hpp-${runId}-en`, name: `Category HPP ${runId}` },
        ],
      },
    }),
    201,
  );
  categoryId = category.data.id;
  const product = await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        key: `hpp-${runId}`,
        sku,
        status: 'published',
        category_ids: [categoryId],
        price_visibility: 'displayed',
        prices: [
          { type: 'end_user', currency: 'IDR', amount: 100000, is_public: true },
          { type: 'end_user', currency: 'USD', amount: 7, is_public: true },
        ],
        translations: [
          { locale: 'id-ID', slug: `hpp-${runId}-id`, name: 'Produk HPP' },
          { locale: 'en-US', slug: `hpp-${runId}-en`, name: 'HPP Product' },
        ],
      },
    }),
    201,
  );
  productId = product.data.id;
});

test.afterAll(async () => {
  await saveRecording('costing-api', []);
  await anonymous?.dispose();
  await owner?.dispose();
  await viewer?.dispose();
});

test('everything needs a session and the right permission', async () => {
  await expectCode(await anonymous.get('/api/v1/costing/items'), 401);
  await expectCode(await anonymous.post('/api/v1/costing/calculate', { data: {} }), 401);

  const blocked = await createAdminAccount(
    owner,
    'TanpaHpp',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Tanpa HPP ${runId}`, ['product.view']),
    }),
  );
  const noRights = await login(blocked.identity, blocked.password);
  await expectCode(await noRights.get('/api/v1/costing/items'), 403);
  await expectCode(await noRights.get('/api/v1/costing/materials'), 403);
  await expectCode(await noRights.get(`/api/v1/costing/items/by-product/${productId}`), 403);
  await noRights.dispose();

  const account = await createAdminAccount(
    owner,
    'LihatHpp',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Lihat HPP ${runId}`, ['cost.view']),
    }),
  );
  viewer = await login(account.identity, account.password);
  await expectCode(await viewer.get('/api/v1/costing/items'), 200);
  await expectCode(
    await viewer.post('/api/v1/costing/materials', {
      data: { name: 'x', unit: 'kg', price: 1 },
    }),
    403,
  );
  await expectCode(
    await viewer.post('/api/v1/costing/apply-prices', { data: { item_ids: ['x'] } }),
    403,
  );
});

test('materials keep their dated prices', async () => {
  const name = `Latex ${runId}`;
  const created = await expectCode(
    await owner.post('/api/v1/costing/materials', {
      data: { name, kind: 'material', unit: 'kg', price: 10000 },
    }),
    201,
  );
  latexId = created.data.id;
  await expectCode(
    await owner.post('/api/v1/costing/materials', {
      data: { name, kind: 'material', unit: 'kg', price: 1 },
    }),
    409,
    'COSTING_MATERIAL_DUPLICATE',
  );
  for (const bad of [
    { name: '', unit: 'kg', price: 1 },
    { name: 'a', unit: '', price: 1 },
    { name: 'a', unit: 'kg', price: -1 },
    { name: 'a', unit: 'kg', price: 1, kind: 'x' },
  ]) {
    await expectCode(await owner.post('/api/v1/costing/materials', { data: bad }), 400);
  }
  // A price ahead of its date is kept but not in force yet.
  await expectCode(
    await owner.post(`/api/v1/costing/materials/${latexId}/prices`, {
      data: { amount: 99999, from: '2099-01-01' },
    }),
    200,
  );
  const list = await expectCode(await owner.get('/api/v1/costing/materials'), 200);
  const latex = list.data.find((item: any) => item.id === latexId);
  expect(latex.price).toBe(10000);
  const history = await expectCode(
    await owner.get(`/api/v1/costing/materials/${latexId}/prices`),
    200,
  );
  expect(history.data).toHaveLength(2);
});

test('a recipe gives the HPP and the ladder of the general rates', async () => {
  const created = await expectCode(
    await owner.post('/api/v1/costing/items', {
      data: { name: 'Produk HPP', sku, width: 90, length: 200, height: 5 },
    }),
    201,
  );
  itemId = created.data.id;
  await expectCode(
    await owner.post('/api/v1/costing/items', { data: { name: 'Lain', sku } }),
    409,
    'COSTING_ITEM_DUPLICATE',
  );
  await expectCode(
    await owner.post('/api/v1/costing/items', { data: { name: 'Lain', sku: 'TIDAK-ADA' } }),
    400,
    'COSTING_SKU_UNKNOWN',
  );
  await expectCode(
    await owner.post('/api/v1/costing/items', { data: { name: 'Lain', gpm: 2 } }),
    400,
    'COSTING_ITEM_INVALID',
  );

  for (const lines of [
    [{ label: '', material_id: latexId, qty: 1 }],
    [{ label: 'a', material_id: 'tidak-valid', qty: 1 }],
    [{ label: 'a', qty: 1 }],
    [{ label: 'a', material_id: latexId, qty: -1 }],
  ]) {
    await expectCode(
      await owner.put(`/api/v1/costing/items/${itemId}/recipe`, { data: { lines } }),
      400,
      'COSTING_RECIPE_INVALID',
    );
  }
  await expectCode(
    await owner.put(`/api/v1/costing/items/${itemId}/recipe`, {
      data: { lines: [{ label: 'a', material_id: latexId, formula: 'process.exit(1)' }] },
    }),
    400,
    'COSTING_FORMULA_INVALID',
  );

  const saved = await expectCode(
    await owner.put(`/api/v1/costing/items/${itemId}/recipe`, {
      data: {
        lines: [
          // 90 x 200 x 2 / 1000000 x 120 = 4.32 kg, from the size of the item.
          {
            label: 'Latex',
            material_id: latexId,
            qty: 1,
            formula: 'L * P * (T - 3) / 1000000 * 120',
          },
          { label: 'Jasa', own_price: 56800, qty: 1 },
        ],
      },
    }),
    200,
  );
  expect(saved.data.version).toBe(1);

  const item = await itemOf();
  near(item.hpp, 4.32 * 10000 + 56800); // 100000
  near(item.net, 125000);
  near(item.affiliate_price, 131578.95);
  expect(item.commerce).toBe(164474);
  expect(item.wholesale).toBe(156250);
  near(item.usd, 9.14);
  expect(item.live.idr).toBe(100000);
  expect(item.lines[0].qty).toBeCloseTo(4.32, 6);

  const byProduct = await expectCode(
    await viewer.get(`/api/v1/costing/items/by-product/${productId}`),
    200,
  );
  expect(byProduct.data.id).toBe(itemId);
});

test('a price change shows its effect first, then moves the HPP', async () => {
  const impact = await expectCode(
    await owner.get(`/api/v1/costing/materials/${latexId}/impact`, { params: { price: 20000 } }),
    200,
  );
  const row = impact.data.find((item: any) => item.id === itemId);
  near(row.change, 43200);
  expect((await itemOf()).hpp).toBeCloseTo(100000, 2);

  await expectCode(
    await owner.post(`/api/v1/costing/materials/${latexId}/prices`, { data: { amount: 20000 } }),
    200,
  );
  expect((await itemOf()).hpp).toBeCloseTo(143200, 2);
  await expectCode(
    await owner.delete(`/api/v1/costing/materials/${latexId}`),
    409,
    'COSTING_MATERIAL_IN_USE',
  );
  await expectCode(
    await owner.post(`/api/v1/costing/materials/${latexId}/prices`, { data: { amount: 10000 } }),
    200,
  );
});

test('rates: an item overrides the general ones', async () => {
  await expectCode(
    await owner.put('/api/v1/costing/setting', { data: { gpm: 2, usd_rate: 1, round_idr: 1 } }),
    400,
  );
  await expectCode(
    await owner.put(`/api/v1/costing/items/${itemId}`, {
      data: { name: 'Produk HPP', sku, width: 90, length: 200, height: 5, gpm: 0.5 },
    }),
    200,
  );
  const item = await itemOf();
  expect(item.rates.gpm).toBe(0.5);
  near(item.net, 200000);
  await expectCode(
    await owner.put(`/api/v1/costing/items/${itemId}`, {
      data: { name: 'Produk HPP', sku, width: 90, length: 200, height: 5, gpm: null },
    }),
    200,
  );
});

test('channels: dated charges and the calculator', async () => {
  const channels = await expectCode(await owner.get('/api/v1/costing/channels'), 200);
  const shopee = channels.data.find((item: any) => item.name === 'Shopee');
  expect(shopee.fees).toEqual([]);

  for (const bad of [
    { name: '', type: 'percent', value: 10, from: '2026-01-01' },
    { name: 'a', type: 'x', value: 10, from: '2026-01-01' },
    { name: 'a', type: 'percent', value: 100, from: '2026-01-01' },
    { name: 'a', type: 'percent', value: 10 },
    { name: 'a', type: 'percent', value: 10, from: '2026-02-01', to: '2026-01-01' },
  ]) {
    await expectCode(
      await owner.post(`/api/v1/costing/channels/${shopee.id}/fees`, { data: bad }),
      400,
    );
  }
  const fee = await expectCode(
    await owner.post(`/api/v1/costing/channels/${shopee.id}/fees`, {
      data: { name: 'Admin', type: 'percent', value: 10, per: 'item', from: '2026-01-01' },
    }),
    201,
  );
  await expectCode(
    await owner.post(`/api/v1/costing/channels/${shopee.id}/fees`, {
      data: { name: 'Proses', type: 'fixed', value: 1000, per: 'order', from: '2026-01-01' },
    }),
    201,
  );
  // Over, and in a category of another product: neither counts.
  await expectCode(
    await owner.post(`/api/v1/costing/channels/${shopee.id}/fees`, {
      data: { name: 'Lama', type: 'percent', value: 50, from: '2020-01-01', to: '2020-12-31' },
    }),
    201,
  );
  // This product's category replaces the general charge of the same name.
  const categoryFee = await expectCode(
    await owner.post(`/api/v1/costing/channels/${shopee.id}/fees`, {
      data: {
        name: 'Admin',
        type: 'percent',
        value: 5,
        from: '2026-01-01',
        category_id: categoryId,
      },
    }),
    201,
  );

  const calculate = (data: Record<string, unknown>) =>
    owner.post('/api/v1/costing/calculate', { data });
  await expectCode(await calculate({ hpp: -1 }), 400, 'COSTING_CALCULATE_INVALID');
  await expectCode(await calculate({ hpp: 1, target_margin: 1 }), 400, 'COSTING_CALCULATE_INVALID');
  await expectCode(await calculate({ item_id: 'bukan' }), 404);

  const manual = await expectCode(await calculate({ hpp: 100000, price: 200000 }), 200);
  const manualShopee = manual.data.channels.find((item: any) => item.name === 'Shopee');
  expect(manualShopee.received).toBe(200000 - 20000 - 1000);
  expect(manualShopee.profit).toBe(79000);
  const website = manual.data.channels.find((item: any) => item.name === 'Website');
  expect(website.has_rules).toBe(false);
  expect(website.received).toBe(200000);

  const byItem = await expectCode(
    await calculate({ item_id: itemId, price: 200000, target_margin: 0.3 }),
    200,
  );
  const itemShopee = byItem.data.channels.find((item: any) => item.name === 'Shopee');
  expect(itemShopee.fees.find((item: any) => item.name === 'Admin').amount).toBe(10000);
  expect(itemShopee.minimum_price).toBeGreaterThan(100000);

  await expectCode(await owner.delete(`/api/v1/costing/fees/${categoryFee.data.id}`), 200);
  await expectCode(await owner.delete(`/api/v1/costing/fees/${fee.data.id}`), 200);
  await expectCode(await owner.delete('/api/v1/costing/fees/tidak-ada'), 404);
});

test('applying prices copies them to the catalog, only when asked', async () => {
  const before = await expectCode(
    await anonymous.get(`/api/public/products/id-ID/hpp-${runId}-id`),
    200,
  );
  expect(before.data.sale_price).toBe(100000);

  await expectCode(
    await owner.post('/api/v1/costing/apply-prices', { data: { item_ids: [] } }),
    400,
    'COSTING_APPLY_INVALID',
  );
  const applied = await expectCode(
    await owner.post('/api/v1/costing/apply-prices', { data: { item_ids: [itemId] } }),
    200,
  );
  expect(applied.data.applied).toBe(1);

  const after = await expectCode(
    await anonymous.get(`/api/public/products/id-ID/hpp-${runId}-id`),
    200,
  );
  expect(after.data.sale_price).toBe(164474);
  // The wholesale price exists but stays off the website.
  expect(after.data.prices.map((price: any) => price.type)).not.toContain('wholesale');
  const item = await itemOf();
  expect(item.live.wholesale).toBe(156250);
});

test('no public response carries a cost', async () => {
  for (const url of [
    '/api/public/products/id-ID',
    `/api/public/products/id-ID/hpp-${runId}-id`,
    '/api/public/product-categories/id-ID',
  ]) {
    const text = await (await anonymous.get(url)).text();
    expect(text).not.toMatch(/"(hpp|gpm|net|cost|affiliate_price|recipe|material)[a-z_]*"/i);
  }
});

//==================================================
//==== WORKBOOK
//==================================================

const workbookBuffer = async () => {
  const workbook = new ExcelJS.Workbook();
  const prices = workbook.addWorksheet('KATEGORI DAN PRODUK');
  const costs = workbook.addWorksheet('DETAIL HITUNGAN');
  const parts = workbook.addWorksheet('MOCO');
  const products = workbook.addWorksheet('PRODUCT');
  const f = (formula: string, result: number) => ({ formula, result });

  prices.getCell('A3').value = 1;
  prices.getCell('B3').value = 'LATEX MATTRESS';
  const priceRow = (row: number, name: string, ref: string, hpp: number, size: number[]) => {
    prices.getCell(`B${row}`).value = row;
    prices.getCell(`C${row}`).value = name;
    ['E', 'F', 'G'].forEach(
      (col, index) => (prices.getCell(`${col}${row}`).value = size[index] ?? '??'),
    );
    prices.getCell(`I${row}`).value = f(ref, hpp);
    prices.getCell(`J${row}`).value = 0.2;
    prices.getCell(`M${row}`).value = 0.05;
    prices.getCell(`P${row}`).value = 0.2;
    const net = hpp / 0.8;
    const affiliate = net / 0.95;
    prices.getCell(`K${row}`).value = f(`I${row}/0.8`, net);
    prices.getCell(`N${row}`).value = f(`K${row}/0.95`, affiliate);
    prices.getCell(`Q${row}`).value = f(`N${row}/0.8`, affiliate / 0.8);
  };
  priceRow(6, 'TOPPER UJI', "'DETAIL HITUNGAN'!AP8", 880550, [90, 200, 5]);
  priceRow(7, 'BANTAL UJI', "'DETAIL HITUNGAN'!AP9", 84417.72, [38, 38, 6]);
  priceRow(8, 'PET UJI', 'MOCO!J8', 3000, []);
  prices.getCell('A5').value = 'x';

  costs.getCell('A5').value = 'NO';
  costs.getCell('X5').value = 'JENIS';
  const cost = (row: number, cells: Record<string, unknown>) => {
    for (const [col, value] of Object.entries(cells))
      costs.getCell(`${col}${row}`).value = value as never;
  };
  cost(8, {
    C: 90,
    D: 200,
    E: 5,
    J: 4.32,
    K: 35000,
    L: f('J8*K8', 151200),
    R: 0.054,
    S: 8000000,
    T: f('S8*R8', 432000),
    X: 'PE PUTIH',
    Y: 2.05,
    Z: 27000,
    AA: f('Z8*Y8', 55350),
    AB: 30000,
    AC: f('AB8+AA8', 85350),
    AE: 'FEMI',
    AF: 2.05,
    AG: 40000,
    AH: f('AG8*AF8', 82000),
    AI: 30000,
    AN: 100000,
    AP: f('AN8+AJ8+AC8+V8', 880550),
  });
  // Shows an inner cover that its total leaves out, as some rows of the real workbook do.
  cost(9, {
    C: 33,
    D: 38,
    E: 6,
    R: 0.8276,
    S: 73000,
    T: f('S9*R9', 60417.72),
    X: 'PE PUTIH',
    Y: 1,
    Z: 25000,
    AA: f('Z9*Y9', 25000),
    AB: 10000,
    AC: f('AB9+AA9', 35000),
    AE: 'FEMI',
    AF: 0.3,
    AG: 30000,
    AH: f('AG9*AF9', 9000),
    AI: 10000,
    AL: f('AJ9+V9', 79417.72),
    AN: 5000,
    AP: f('AN9+AL9', 84417.72),
  });

  parts.getCell('A3').value = 'PET UJI';
  parts.getCell('D3').value = 46;
  parts.getCell('E3').value = 60;
  parts.getCell('F3').value = 10;
  parts.getCell('A4').value = 'NO';
  [
    ['REBONDID LATEX', 1, 1000, 1000],
    ['KARDUS', 1, 1500, 2000],
  ].forEach(([part, qty, price, total], index) => {
    const row = 5 + index;
    parts.getCell(`A${row}`).value = index + 1;
    parts.getCell(`B${row}`).value = part;
    parts.getCell(`G${row}`).value = qty;
    parts.getCell(`H${row}`).value = price;
    parts.getCell(`I${row}`).value = total;
  });
  parts.getCell('J8').value = f('SUM(I5:I6)', 3000);

  products.getCell('V7').value = sku;
  products.getCell('AM7').value = f("'KATEGORI DAN PRODUK'!Q6", 0);
  products.getCell('AF7').value = 2000;
  products.getCell('AG7').value = 900;
  products.getCell('AH7').value = 50;
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const upload = async (buffer: Buffer, apply: boolean) =>
  owner.post('/api/v1/costing/import', {
    multipart: {
      ...(apply ? { apply: '1' } : {}),
      file: {
        name: 'uji.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      },
    },
  });

test('the workbook: a report first, saved on request, the same file twice adds nothing', async () => {
  await expectCode(
    await upload(Buffer.from('bukan excel'), false),
    400,
    'COSTING_IMPORT_UNREADABLE',
  );
  const buffer = await workbookBuffer();
  const countBefore = (await expectCode(await owner.get('/api/v1/costing/items'), 200)).data.length;

  const report = await expectCode(await upload(buffer, false), 200, 'COSTING_IMPORT_REPORT');
  expect(report.data.saved).toBe(false);
  expect(report.data.summary.items).toBe(3);
  expect(report.data.summary.with_product).toBe(1);
  expect(report.data.summary.without_product).toEqual(['BANTAL UJI', 'PET UJI']);
  const kinds = report.data.issues.map((issue: any) => issue.kind);
  expect(kinds).toContain('inner_left_out');
  expect(kinds).toContain('size_cost_sheet');
  expect(kinds).toContain('line_price');
  expect((await expectCode(await owner.get('/api/v1/costing/items'), 200)).data).toHaveLength(
    countBefore,
  );

  const saved = await expectCode(await upload(buffer, true), 200, 'COSTING_IMPORT_SAVED');
  expect(saved.data.saved).toBe(true);
  expect(saved.data.recipes).toBe(3);

  const items = (await expectCode(await owner.get('/api/v1/costing/items'), 200)).data;
  const topper = items.find((item: any) => item.sku === sku);
  const pillow = items.find((item: any) => item.name === 'BANTAL UJI');
  const pet = items.find((item: any) => item.name === 'PET UJI');
  near(topper.hpp, 880550, 1);
  near(topper.commerce, 1448273, 1);
  near(pillow.hpp, 84417.72, 1);
  near(pet.hpp, 3000, 1);
  expect(pet.width).toBe(46);
  expect(pillow.product_id).toBeNull();

  const again = await expectCode(await upload(buffer, true), 200, 'COSTING_IMPORT_SAVED');
  expect(again.data.recipes).toBe(0);
});
