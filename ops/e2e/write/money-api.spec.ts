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

// API contract of Dasbor Uang (backend/src/ctrl/admin/money): a settled order is split by the
// revenue share rule into the books of the parties; posting is idempotent and corrects itself
// with new rows; payments between parties are recorded; a partner sees its own book only.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/money';
let anonymous: APIRequestContext;
let owner: APIRequestContext;
let platformId = '';
let partnerId = '';
let partnerStoreId = '';
let platformStoreId = '';
let productId = '';
const digits = (prefix: string, n: number) =>
  `${prefix}${runId.padStart(8, '0')}${n}`.replace(/\D/g, '');
const orderX = digits('58801', 1);
const orderY = digits('58801', 2);
const skuRef = digits('17380', 1);
const HPP = 20000;

const upload = (
  store: string,
  file: { name: string; mimeType: string; buffer: Buffer },
  apply = true,
) => owner.post('/api/v1/sales/imports', { multipart: { store, apply: apply ? '1' : '0', file } });

const csv = (order: string, qty: number, subtotal: number) => ({
  name: 'pesanan.csv',
  mimeType: 'text/csv',
  buffer: ordersCsv([
    {
      order,
      status: 'Selesai',
      sku: skuRef,
      sellerSku: 'topper',
      name: 'Topper Mitra',
      variation: '40x80',
      qty,
      price: subtotal / qty,
      platformDiscount: 0,
      sellerDiscount: 0,
      amount: subtotal,
      created: '05/11/2026 10:00:00',
      paid: '05/11/2026 10:01:00',
    },
  ]),
});

const income = async (order: string, amount: number, revenue: number, qty: number) => ({
  name: 'income.xlsx',
  mimeType: SPREADSHEET_MIME,
  buffer: await incomeXlsx([
    {
      ref: order,
      label: 'Pesanan',
      ordered: '2026/11/05',
      settled: '2026/11/11',
      amount,
      revenue,
      fees: amount - revenue,
      commission: amount - revenue,
      orderRef: order,
      sku: skuRef,
      qty,
    },
  ]),
});

const balance = (
  ledger: { meta: { balances: { entity_id: string; counter_id: string; balance: number }[] } },
  entity: string,
  counter: string,
) =>
  ledger.meta.balances.find((b) => b.entity_id === entity && b.counter_id === counter)?.balance ??
  0;

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  const entities = await expectCode(await owner.get('/api/v1/business/entities'), 200);
  platformId = entities.data.find((e: { kind: string }) => e.kind === 'platform').id;
  const partner = await expectCode(
    await owner.post('/api/v1/business/entities', {
      data: { name: `Koh Joni ${runId}`, kind: 'partner' },
    }),
    201,
  );
  partnerId = partner.data.id;
  const channels = await expectCode(await owner.get('/api/v1/business/channels'), 200);
  const tiktok =
    channels.data.find((c: { key: string }) => c.key === 'tiktok-shop') ?? channels.data[0];
  partnerStoreId = (
    await expectCode(
      await owner.post(`/api/v1/business/entities/${partnerId}/stores`, {
        data: { channel_id: tiktok.id, name: `Joni TikTok ${runId}` },
      }),
      201,
    )
  ).data.id;
  platformStoreId = (
    await expectCode(
      await owner.post(`/api/v1/business/entities/${platformId}/stores`, {
        data: { channel_id: tiktok.id, name: `MIA TikTok ${runId}` },
      }),
      201,
    )
  ).data.id;
  // The partner's goods are made by the platform: production fee at HPP + 10%, and 5% of the
  // payout on its own store; on the platform's store the platform also keeps 10% of the price.
  await expectCode(
    await owner.post(`/api/v1/business/entities/${partnerId}/rules`, {
      data: {
        name: 'Produksi MIA',
        from: '2026-01-01',
        components: [
          { kind: 'production_fee', label: 'Biaya produksi', type: 'cost_plus', value: 10 },
          { kind: 'platform_fee', label: 'Jasa panel', type: 'percent', value: 5, base: 'net' },
        ],
      },
    }),
    201,
  );
  await expectCode(
    await owner.post(`/api/v1/business/entities/${partnerId}/rules`, {
      data: {
        name: 'Numpang etalase MIA',
        from: '2026-01-01',
        store_id: platformStoreId,
        components: [
          {
            kind: 'platform_fee',
            label: 'Komisi etalase',
            type: 'percent',
            value: 10,
            base: 'gross',
          },
          { kind: 'production_fee', label: 'Biaya produksi', type: 'cost_plus', value: 10 },
        ],
      },
    }),
    201,
  );
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `money-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `money-${runId}-id`, name: `Kategori Uang ${runId}` },
          { locale: 'en-US', slug: `money-${runId}-en`, name: `Money Category ${runId}` },
        ],
      },
    }),
    201,
  );
  const sku = `MONEY-${runId}`.toUpperCase();
  productId = (
    await expectCode(
      await owner.post('/api/v1/products', {
        data: {
          key: `money-${runId}`,
          sku,
          status: 'draft',
          category_ids: [category.data.id],
          price_visibility: 'contact',
          prices: [],
          seller_entity_id: partnerId,
          producer_entity_id: platformId,
          translations: [
            { locale: 'id-ID', slug: `money-${runId}-id`, name: `Topper Joni ${runId}` },
            { locale: 'en-US', slug: `money-${runId}-en`, name: `Joni Topper ${runId}` },
          ],
        },
      }),
      201,
    )
  ).data.id;
  const item = await expectCode(
    await owner.post('/api/v1/costing/items', { data: { name: `HPP Joni ${runId}`, sku } }),
    201,
  );
  await expectCode(
    await owner.put(`/api/v1/costing/items/${item.data.id}/recipe`, {
      data: { lines: [{ label: 'Jasa', own_price: HPP, qty: 1 }] },
    }),
    200,
  );
});

test.afterAll(async () => {
  await saveRecording('money-api', ['ledger_entry']);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('everything needs a session and the permission', async () => {
  await expectCode(await anonymous.get(`${base}/summary`), 401, 'AUTH_TOKEN_REQUIRED');
  const viewer = await createAdminAccount(
    owner,
    'LihatUang',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Lihat Uang ${runId}`, ['money.view']),
    }),
  );
  const session = await login(viewer.identity, viewer.password);
  await expectCode(await session.get(`${base}/summary`), 200);
  await expectCode(await session.get(`${base}/ledger`), 200);
  await expectCode(
    await session.post(`${base}/payments`, { data: {} }),
    403,
    'AUTH_PERMISSION_DENIED',
  );
  await expectCode(
    await session.post(`${base}/rebuild`, { data: {} }),
    403,
    'AUTH_PERMISSION_DENIED',
  );
  await session.dispose();
  await expectCode(
    await owner.get(`${base}/summary`, { params: { from: 'x' } }),
    400,
    'SALES_DATE_INVALID',
  );
  await expectCode(
    await owner.get(`${base}/summary`, { params: { entity: 'nope' } }),
    400,
    'BUSINESS_ENTITY_INVALID_ID',
  );
});

test("a sale on the partner's own store puts the fees in both books", async () => {
  await expectCode(await upload(partnerStoreId, csv(orderX, 2, 100000)), 200);
  // The SKU must point at the product before the books can know the HPP and the seller.
  const map = await expectCode(
    await owner.get('/api/v1/sales/sku-map', { params: { store: partnerStoreId } }),
    200,
  );
  await expectCode(
    await owner.put(`/api/v1/sales/sku-map/${map.data[0].id}`, { data: { product_id: productId } }),
    200,
  );
  await expectCode(await upload(partnerStoreId, await income(orderX, 90000, 100000, 2)), 200);

  const ledger = await expectCode(
    await owner.get(`${base}/ledger`, { params: { entity: partnerId } }),
    200,
  );
  // Production: 2 x 20000 x 1.1 = 44000. Panel: 5% of 90000 = 4500.
  const kinds = Object.fromEntries(
    ledger.data.map((row: { kind: string; amount: number }) => [row.kind, row.amount]),
  );
  expect(kinds).toEqual({ production_fee: -44000, platform_fee: -4500 });
  expect(ledger.data[0]).toMatchObject({
    counter_id: platformId,
    date: '2026-11-11',
    store_name: `Joni TikTok ${runId}`,
  });
  expect(balance(ledger, partnerId, platformId)).toBe(-48500);
  const all = await expectCode(await owner.get(`${base}/ledger`), 200);
  expect(balance(all, platformId, partnerId)).toBe(48500);

  // Posting again adds nothing.
  const rebuilt = await expectCode(
    await owner.post(`${base}/rebuild`, { data: { store: partnerStoreId } }),
    200,
  );
  expect(rebuilt.data).toMatchObject({ settlements: 1, rows_added: 0 });
});

test("a partner's product sold through the platform's store is owed its share", async () => {
  await expectCode(await upload(platformStoreId, csv(orderY, 1, 50000)), 200);
  const map = await expectCode(
    await owner.get('/api/v1/sales/sku-map', { params: { store: platformStoreId } }),
    200,
  );
  await expectCode(
    await owner.put(`/api/v1/sales/sku-map/${map.data[0].id}`, { data: { product_id: productId } }),
    200,
  );
  await expectCode(await upload(platformStoreId, await income(orderY, 45000, 50000, 1)), 200);

  const ledger = await expectCode(
    await owner.get(`${base}/ledger`, {
      params: { entity: partnerId, from: '2026-11-11', to: '2026-11-11' },
    }),
    200,
  );
  const mine = ledger.data.filter(
    (row: { store_name: string }) => row.store_name === `MIA TikTok ${runId}`,
  );
  const kinds = Object.fromEntries(
    mine.map((row: { kind: string; amount: number }) => [row.kind, row.amount]),
  );
  // Share 45000, less 10% of 50000 and 1 x 20000 x 1.1: the partner is owed 18000.
  expect(kinds).toEqual({ share: 45000, platform_fee: -5000, production_fee: -22000 });
  expect(balance(ledger, partnerId, platformId)).toBe(-48500 + 18000);
});

test('a payment settles the balance, and a changed payout yields a correction row', async () => {
  for (const [body, code] of [
    [{}, 'MONEY_PAYMENT_PARTIES'],
    [
      { payer_entity_id: partnerId, payee_entity_id: partnerId, date: '2026-11-12', amount: 1 },
      'MONEY_PAYMENT_PARTIES',
    ],
    [
      { payer_entity_id: partnerId, payee_entity_id: platformId, date: '12/11/2026', amount: 1 },
      'MONEY_PAYMENT_DATE',
    ],
    [
      { payer_entity_id: partnerId, payee_entity_id: platformId, date: '2026-11-12', amount: 0 },
      'MONEY_PAYMENT_AMOUNT',
    ],
  ] as const) {
    await expectCode(await owner.post(`${base}/payments`, { data: body }), 400, code);
  }
  const paid = await expectCode(
    await owner.post(`${base}/payments`, {
      data: {
        payer_entity_id: partnerId,
        payee_entity_id: platformId,
        date: '2026-11-12',
        amount: 30500,
        note: 'Transfer BCA',
      },
    }),
    201,
    'MONEY_PAYMENT_RECORDED',
  );
  expect(paid.data.ids).toHaveLength(2);
  let ledger = await expectCode(await owner.get(`${base}/ledger`), 200);
  expect(balance(ledger, partnerId, platformId)).toBe(0);
  expect(balance(ledger, platformId, partnerId)).toBe(0);
  expect(ledger.data[0]).toMatchObject({
    kind: 'payment',
    label: 'Pembayaran',
    note: 'Transfer BCA',
  });

  // The channel corrects the payout of order X: the 5% fee follows, as a new row.
  await expectCode(await upload(partnerStoreId, await income(orderX, 80000, 100000, 2)), 200);
  ledger = await expectCode(
    await owner.get(`${base}/ledger`, { params: { entity: partnerId } }),
    200,
  );
  const correction = ledger.data.find((row: { label: string }) => row.label.startsWith('Koreksi'));
  expect(correction).toMatchObject({ kind: 'platform_fee', amount: 500 });
  expect(balance(ledger, partnerId, platformId)).toBe(500);
  expect(ledger.data.filter((row: { kind: string }) => row.kind === 'platform_fee')).toHaveLength(
    3,
  );
});

test('the dashboard sums the period by store, product, and party', async () => {
  const all = await expectCode(
    await owner.get(`${base}/summary`, { params: { from: '2026-11-01', to: '2026-11-30' } }),
    200,
  );
  expect(all.data).toMatchObject({
    orders: 2,
    revenue: 150000,
    amount: 125000,
    hpp: 60000,
    gross_profit: 65000,
    unmapped_qty: 0,
  });
  const partnerStore = all.data.stores.find((s: { key: string }) => s.key === partnerStoreId);
  expect(partnerStore).toMatchObject({
    orders: 1,
    qty: 2,
    revenue: 100000,
    amount: 80000,
    hpp: 40000,
  });
  const product = all.data.products.find((p: { key: string }) => p.key === productId);
  expect(product).toMatchObject({ qty: 3, amount: 125000, hpp: 60000, unmapped: false });
  const party = all.data.parties.find((p: { id: string }) => p.id === partnerId);
  expect(party).toMatchObject({
    share: 45000,
    fees: -44000 - 4000 - 5000 - 22000,
    total: 45000 - 75000,
  });

  const partnerOnly = await expectCode(
    await owner.get(`${base}/summary`, { params: { entity: partnerId } }),
    200,
  );
  expect(partnerOnly.data).toMatchObject({ orders: 1, amount: 80000 });
  expect(partnerOnly.data.stores).toHaveLength(1);
  const outside = await expectCode(
    await owner.get(`${base}/summary`, { params: { from: '2026-12-01' } }),
    200,
  );
  expect(outside.data).toMatchObject({ orders: 0, amount: 0, stores: [], products: [] });
});

test('a partner login reads its own book and cannot record payments', async () => {
  const account = await createAdminAccount(owner, 'MitraUang', {
    ...(await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Mitra Uang ${runId}`, [
        'money.view',
        'money.manage',
      ]),
    })),
    id_business_entity: partnerId,
  } as Awaited<ReturnType<typeof adminReferences>>);
  const session = await login(account.identity, account.password);
  const ledger = await expectCode(await session.get(`${base}/ledger`), 200);
  expect(ledger.data.every((row: { entity_id: string }) => row.entity_id === partnerId)).toBe(true);
  expect(ledger.meta.balances).toHaveLength(1);
  const summary = await expectCode(await session.get(`${base}/summary`), 200);
  expect(summary.data.stores.map((s: { key: string }) => s.key)).toEqual([partnerStoreId]);
  expect(summary.data.parties.map((p: { id: string }) => p.id)).toEqual([partnerId]);
  await expectCode(
    await session.post(`${base}/payments`, {
      data: {
        payer_entity_id: partnerId,
        payee_entity_id: platformId,
        date: '2026-11-12',
        amount: 1,
      },
    }),
    403,
    'BUSINESS_RESTRICTED',
  );
  await expectCode(await session.post(`${base}/rebuild`, { data: {} }), 403, 'BUSINESS_RESTRICTED');
  await expectCode(
    await session.get(`${base}/ledger`, { params: { entity: platformId } }),
    404,
    'BUSINESS_ENTITY_NOT_FOUND',
  );
  await session.dispose();
});
