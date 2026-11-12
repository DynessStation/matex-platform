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
import { incomeXlsx, ordersCsv, SPREADSHEET_MIME } from './sales-fixtures';

// API contract of Penjualan (backend/src/ctrl/admin/sales): a store's Seller Center files are
// read and reported first, saved on request, never duplicated; the SKU map joins channel SKUs
// to products; a partner's login sees only its own stores.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/sales';
let anonymous: APIRequestContext;
let owner: APIRequestContext;
let storeId = '';
let otherStoreId = '';
let productId = '';
let skuMapId = '';
const orderA = `58700${runId.padStart(8, '0')}1`.replace(/\D/g, '').slice(0, 18);
const orderB = `58700${runId.padStart(8, '0')}2`.replace(/\D/g, '').slice(0, 18);
const orderC = `58700${runId.padStart(8, '0')}3`.replace(/\D/g, '').slice(0, 18);
const skuBesar = `17376908${runId.padStart(8, '0')}1`.replace(/\D/g, '');
const skuKecil = `17376908${runId.padStart(8, '0')}2`.replace(/\D/g, '');

const lines = () => [
  {
    order: orderA,
    status: 'Selesai',
    sku: skuBesar,
    sellerSku: 'latex ekonomis (Besar)',
    name: 'Latex Lembaran Ekonomis',
    variation: 'Vario LED old',
    qty: 1,
    price: 100500,
    platformDiscount: 5548,
    sellerDiscount: 31150,
    amount: 65854,
    created: '03/11/2026 09:12:00',
    paid: '03/11/2026 09:13:10',
  },
  {
    order: orderB,
    status: 'Dikirim',
    sku: skuBesar,
    sellerSku: 'latex ekonomis (Besar)',
    name: 'Latex Lembaran Ekonomis',
    variation: 'Vario LED old',
    qty: 2,
    price: 100500,
    platformDiscount: 0,
    sellerDiscount: 0,
    amount: 201000,
    created: '10/11/2026 14:00:36',
  },
  {
    order: orderB,
    status: 'Dikirim',
    sku: skuKecil,
    sellerSku: 'latex ekonomis (Kecil)',
    name: 'Latex Lembaran Ekonomis',
    variation: 'Beat',
    qty: 1,
    price: 72000,
    platformDiscount: 0,
    sellerDiscount: 2000,
    amount: 201000,
    created: '10/11/2026 14:00:36',
  },
  {
    order: orderC,
    status: 'Dibatalkan',
    sku: skuKecil,
    sellerSku: 'latex ekonomis (Kecil)',
    name: 'Latex Lembaran Ekonomis',
    variation: 'Beat',
    qty: 1,
    price: 72000,
    platformDiscount: 0,
    sellerDiscount: 0,
    amount: 0,
    created: '11/11/2026 08:00:00',
    province: 'Sumatera Selatan',
    city: 'Muara Enim',
  },
];

const upload = (
  context: APIRequestContext,
  file: { name: string; mimeType: string; buffer: Buffer } | null,
  fields: Record<string, string>,
) => context.post(`${base}/imports`, { multipart: { ...fields, ...(file ? { file } : {}) } });

const csvFile = (buffer: Buffer) => ({ name: 'Semua pesanan.csv', mimeType: 'text/csv', buffer });

async function makeStore(name: string): Promise<string> {
  const entity = await expectCode(
    await owner.post('/api/v1/business/entities', { data: { name, kind: 'own_brand' } }),
    201,
  );
  const channels = await expectCode(await owner.get('/api/v1/business/channels'), 200);
  const tiktok =
    channels.data.find((c: { key: string }) => c.key === 'tiktok-shop') ?? channels.data[0];
  const store = await expectCode(
    await owner.post(`/api/v1/business/entities/${entity.data.id}/stores`, {
      data: { channel_id: tiktok.id, name: `${name} di TikTok` },
    }),
    201,
  );
  return store.data.id;
}

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  storeId = await makeStore(`Setia Uji ${runId}`);
  otherStoreId = await makeStore(`Mitra Lain ${runId}`);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `sales-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `sales-${runId}-id`, name: `Kategori Penjualan ${runId}` },
          { locale: 'en-US', slug: `sales-${runId}-en`, name: `Sales Category ${runId}` },
        ],
      },
    }),
    201,
  );
  const product = await expectCode(
    await owner.post('/api/v1/products', {
      data: {
        key: `sales-besar-${runId}`,
        sku: `SALES-BESAR-${runId}`.toUpperCase(),
        status: 'draft',
        category_ids: [category.data.id],
        price_visibility: 'contact',
        prices: [],
        translations: [
          {
            locale: 'id-ID',
            slug: `sales-besar-${runId}-id`,
            name: `Latex Ekonomis Besar ${runId}`,
          },
          {
            locale: 'en-US',
            slug: `sales-besar-${runId}-en`,
            name: `Economy Latex Large ${runId}`,
          },
        ],
      },
    }),
    201,
  );
  productId = product.data.id;
});

test.afterAll(async () => {
  await saveRecording('sales-api', [
    'sales_import',
    'sales_order',
    'sales_order_line',
    'sales_settlement',
    'store_sku_map',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('everything needs a session and the permission', async () => {
  await expectCode(await anonymous.get(`${base}/orders`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await upload(anonymous, null, {}), 401);
  const viewer = await createAdminAccount(
    owner,
    'LihatJual',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Lihat Jual ${runId}`, ['sales.view']),
    }),
  );
  const session = await login(viewer.identity, viewer.password);
  await expectCode(await session.get(`${base}/orders`), 200);
  await expectCode(await session.get(`${base}/stores`), 200);
  await expectCode(await upload(session, null, { store: storeId }), 403, 'AUTH_PERMISSION_DENIED');
  await expectCode(
    await session.put(`${base}/sku-map/x`, { data: { product_id: null } }),
    403,
    'AUTH_PERMISSION_DENIED',
  );
  await session.dispose();
});

test('the order export is reported first, then saved, and never duplicated', async () => {
  const csv = ordersCsv(lines());
  await expectCode(await upload(owner, csvFile(csv), {}), 400, 'SALES_STORE_REQUIRED');
  await expectCode(await upload(owner, csvFile(csv), { store: 'nope' }), 400, 'STORE_INVALID_ID');
  await expectCode(await upload(owner, null, { store: storeId }), 400, 'SALES_IMPORT_FILE');
  await expectCode(
    await upload(
      owner,
      { name: 'x.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') },
      {
        store: storeId,
      },
    ),
    400,
    'SALES_IMPORT_UNREADABLE',
  );

  const report = await expectCode(
    await upload(owner, csvFile(csv), { store: storeId }),
    200,
    'SALES_IMPORT_REPORT',
  );
  expect(report.data.saved).toBe(false);
  expect(report.data.summary).toMatchObject({
    kind: 'orders',
    rows: 4,
    records: 3,
    new_records: 3,
    updated_records: 0,
    period: { from: '2026-11-03', to: '2026-11-11' },
    amount: 65854 + 201000,
  });
  expect(report.data.summary.unknown_skus.map((s: { ref: string }) => s.ref).sort()).toEqual(
    [skuBesar, skuKecil].sort(),
  );
  // Nothing saved yet.
  const empty = await expectCode(
    await owner.get(`${base}/orders`, { params: { store: storeId } }),
    200,
  );
  expect(empty.data).toHaveLength(0);

  const saved = await expectCode(
    await upload(owner, csvFile(csv), { store: storeId, apply: '1' }),
    200,
    'SALES_IMPORT_SAVED',
  );
  expect(saved.data.saved).toBe(true);
  expect(saved.data.import_id).toBeTruthy();

  const list = await expectCode(
    await owner.get(`${base}/orders`, { params: { store: storeId } }),
    200,
  );
  expect(list.data).toHaveLength(3);
  expect(list.meta).toMatchObject({ total: 3, amount: 65854 + 201000 });
  const b = list.data.find((o: { ref: string }) => o.ref === orderB);
  expect(b).toMatchObject({
    status: 'Dikirim',
    ordered_at: expect.stringContaining('2026-11-10'),
    paid_at: null,
    payment_method: 'Bayar di tempat',
    province: 'Jawa Barat',
    source: 'Aplikasi TikTok',
    amount: 201000,
    settled_amount: null,
  });
  expect(b.lines).toHaveLength(2);
  expect(b.lines[1]).toMatchObject({
    sku_ref: skuKecil,
    seller_sku: 'latex ekonomis (Kecil)',
    variation: 'Beat',
    qty: 1,
    unit_price: 72000,
    discount_seller: 2000,
    subtotal: 70000,
    product_id: null,
  });
  // No buyer identity anywhere in the answer.
  expect(JSON.stringify(list)).not.toContain('Pembeli Uji');
  expect(JSON.stringify(list)).not.toContain('8123456789');

  // A newer export of the same orders: the status moves on, nothing doubles.
  const newer = lines().map((line) =>
    line.order === orderB ? { ...line, status: 'Selesai', paid: '12/11/2026 10:00:00' } : line,
  );
  const again = await expectCode(
    await upload(owner, csvFile(ordersCsv(newer)), { store: storeId, apply: '1' }),
    200,
  );
  expect(again.data.summary).toMatchObject({ new_records: 0, updated_records: 3 });
  const after = await expectCode(
    await owner.get(`${base}/orders`, { params: { store: storeId, search: orderB } }),
    200,
  );
  expect(after.data).toHaveLength(1);
  expect(after.data[0]).toMatchObject({
    status: 'Selesai',
    paid_at: expect.stringContaining('2026-11-12'),
  });
  expect(after.data[0].lines).toHaveLength(2);

  const history = await expectCode(
    await owner.get(`${base}/imports`, { params: { store: storeId } }),
    200,
  );
  expect(history.data).toHaveLength(2);
  expect(history.data[0]).toMatchObject({
    kind: 'orders',
    rows: 4,
    new_records: 0,
    updated_records: 3,
  });

  // Filters: a date range and a bad date.
  const ranged = await expectCode(
    await owner.get(`${base}/orders`, {
      params: { store: storeId, from: '2026-11-10', to: '2026-11-10' },
    }),
    200,
  );
  expect(ranged.data.map((o: { ref: string }) => o.ref)).toEqual([orderB]);
  await expectCode(
    await owner.get(`${base}/orders`, { params: { from: '10/11/2026' } }),
    400,
    'SALES_DATE_INVALID',
  );
});

test('the income statement gives the money that really arrived', async () => {
  const xlsx = await incomeXlsx([
    {
      ref: orderA,
      label: 'Pesanan',
      ordered: '2026/11/03',
      settled: '2026/11/11',
      amount: 46175,
      revenue: 58145,
      fees: -11970,
      commission: -5378,
      shipping: -690,
      orderRef: orderA,
      sku: skuBesar,
    },
    {
      ref: `3782${runId.padStart(12, '0')}`.replace(/\D/g, ''),
      label: 'Pembayaran GMV untuk Iklan TikTok',
      ordered: '2026/11/10',
      settled: '2026/11/10',
      amount: -111000,
      revenue: 0,
      fees: 0,
      adjustment: -111000,
    },
  ]);
  const file = { name: 'income_2026(UTC+7).xlsx', mimeType: SPREADSHEET_MIME, buffer: xlsx };
  const report = await expectCode(
    await upload(owner, file, { store: storeId }),
    200,
    'SALES_IMPORT_REPORT',
  );
  expect(report.data.summary).toMatchObject({
    kind: 'settlement',
    records: 2,
    new_records: 2,
    adjustments: 1,
    amount: 46175 - 111000,
    period: { from: '2026-11-10', to: '2026-11-11' },
  });
  await expectCode(
    await upload(owner, file, { store: storeId, apply: '1' }),
    200,
    'SALES_IMPORT_SAVED',
  );

  const list = await expectCode(
    await owner.get(`${base}/settlements`, { params: { store: storeId } }),
    200,
  );
  expect(list.data).toHaveLength(2);
  expect(list.meta).toMatchObject({
    total: 2,
    amount: 46175 - 111000,
    revenue: 58145,
    fees: -11970,
    adjustments: -111000,
  });
  const paid = list.data.find((s: { ref: string }) => s.ref === orderA);
  expect(paid).toMatchObject({
    kind: 'order',
    label: 'Pesanan',
    order_ref: orderA,
    settled_at: expect.stringContaining('2026-11-11'),
    amount: 46175,
    source: 'TikTok Shop',
  });
  expect(paid.detail).toMatchObject({ 'Biaya komisi platform': -5378, Ongkir: -690 });
  const ads = list.data.find((s: { kind: string }) => s.kind === 'adjustment');
  expect(ads).toMatchObject({
    label: 'Pembayaran GMV untuk Iklan TikTok',
    order_ref: null,
    amount: -111000,
  });

  // The order now shows what it paid out.
  const orders = await expectCode(
    await owner.get(`${base}/orders`, { params: { store: storeId, search: orderA } }),
    200,
  );
  expect(orders.data[0].settled_amount).toBe(46175);
  // Only adjustments, when asked.
  const adjustments = await expectCode(
    await owner.get(`${base}/settlements`, { params: { store: storeId, kind: 'adjustment' } }),
    200,
  );
  expect(adjustments.data).toHaveLength(1);
});

test('a channel SKU is mapped once and every order follows', async () => {
  const unmapped = await expectCode(
    await owner.get(`${base}/sku-map`, { params: { store: storeId, unmapped: '1' } }),
    200,
  );
  expect(unmapped.data).toHaveLength(2);
  const besar = unmapped.data.find((m: { ref: string }) => m.ref === skuBesar);
  expect(besar).toMatchObject({
    seller_sku: 'latex ekonomis (Besar)',
    variation: 'Vario LED old',
    product_id: null,
    sold_qty: 3,
  });
  skuMapId = besar.id;

  const products = await expectCode(await owner.get(`${base}/products`), 200);
  expect(products.data.some((p: { id: string }) => p.id === productId)).toBe(true);

  await expectCode(
    await owner.put(`${base}/sku-map/${skuMapId}`, { data: { product_id: 'not-a-hash' } }),
    400,
    'SALES_PRODUCT_INVALID',
  );
  await expectCode(
    await owner.put(`${base}/sku-map/${skuMapId}`, { data: { product_id: productId } }),
    200,
    'SALES_SKU_MAPPED',
  );

  const mapped = await expectCode(
    await owner.get(`${base}/sku-map`, { params: { store: storeId } }),
    200,
  );
  expect(mapped.data.find((m: { id: string }) => m.id === skuMapId)).toMatchObject({
    product_id: productId,
    product_name: `Latex Ekonomis Besar ${runId}`,
  });
  const orders = await expectCode(
    await owner.get(`${base}/orders`, { params: { store: storeId, search: orderB } }),
    200,
  );
  expect(orders.data[0].lines[0]).toMatchObject({ sku_ref: skuBesar, product_id: productId });
  expect(orders.data[0].lines[1]).toMatchObject({ sku_ref: skuKecil, product_id: null });

  // The next report of the same file only lists the SKU still without a product.
  const report = await expectCode(
    await upload(owner, csvFile(ordersCsv(lines())), { store: storeId }),
    200,
  );
  expect(report.data.summary.unknown_skus.map((s: { ref: string }) => s.ref)).toEqual([skuKecil]);

  const stores = await expectCode(await owner.get(`${base}/stores`), 200);
  expect(stores.data.find((s: { id: string }) => s.id === storeId)).toMatchObject({
    orders: 3,
    settlements: 2,
    unmapped: 1,
  });

  // Clearing the map works too.
  await expectCode(
    await owner.put(`${base}/sku-map/${skuMapId}`, { data: { product_id: null } }),
    200,
  );
  await expectCode(
    await owner.put(`${base}/sku-map/${skuMapId}`, { data: { product_id: productId } }),
    200,
  );
});

test('a partner login sees the sales of its own stores only', async () => {
  const entities = await expectCode(await owner.get('/api/v1/business/entities'), 200);
  const other = entities.data.find((e: { name: string }) => e.name === `Mitra Lain ${runId}`);
  const partner = await createAdminAccount(owner, 'MitraJual', {
    ...(await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Mitra Jual ${runId}`, [
        'sales.view',
        'sales.import',
      ]),
    })),
    id_business_entity: other.id,
  } as Awaited<ReturnType<typeof adminReferences>>);
  const session = await login(partner.identity, partner.password);
  const stores = await expectCode(await session.get(`${base}/stores`), 200);
  expect(stores.data.map((s: { id: string }) => s.id)).toEqual([otherStoreId]);
  const orders = await expectCode(await session.get(`${base}/orders`), 200);
  expect(orders.data).toHaveLength(0);
  await expectCode(
    await session.get(`${base}/orders`, { params: { store: storeId } }),
    404,
    'STORE_NOT_FOUND',
  );
  await expectCode(
    await upload(session, csvFile(ordersCsv(lines())), { store: storeId }),
    404,
    'STORE_NOT_FOUND',
  );
  await expectCode(
    await session.put(`${base}/sku-map/${skuMapId}`, { data: { product_id: null } }),
    404,
    'SALES_SKU_MAP_NOT_FOUND',
  );
  const map = await expectCode(await session.get(`${base}/sku-map`), 200);
  expect(map.data).toHaveLength(0);
  await session.dispose();
});
