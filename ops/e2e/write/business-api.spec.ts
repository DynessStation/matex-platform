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
  type AdminReferences,
} from './api-contract';

// API contract of Bisnis (backend/src/ctrl/admin/business): entities, stores, revenue share
// rules, the seller and producer of a product, and the account tied to one entity, which must
// never see another entity's rows.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/business';

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let partner: APIRequestContext;
let references: AdminReferences;
let platformId = '';
let atrijaId = '';
let setiaId = '';
let channelId = '';
let storeId = '';
let ruleId = '';
let categoryId = '';
let partnerProductId = '';
let ownProductId = '';
let partnerAccountId = '';

const product = (suffix: string, extra: Record<string, unknown> = {}) => ({
  key: `biz-${suffix}-${runId}`,
  sku: `BIZ-${suffix}-${runId}`.toUpperCase(),
  status: 'draft',
  category_ids: [categoryId],
  price_visibility: 'contact',
  prices: [],
  translations: [
    { locale: 'id-ID', slug: `biz-${suffix}-${runId}-id`, name: `Produk ${suffix}` },
    { locale: 'en-US', slug: `biz-${suffix}-${runId}-en`, name: `Product ${suffix}` },
  ],
  ...extra,
});

test.beforeAll(async () => {
  anonymous = await apiContext();
  owner = await login(admin.identity, admin.password);
  references = await adminReferences(owner);
  const category = await expectCode(
    await owner.post('/api/v1/product-categories', {
      data: {
        key: `biz-${runId}`,
        status: 'published',
        translations: [
          { locale: 'id-ID', slug: `biz-${runId}-id`, name: `Kategori Bisnis ${runId}` },
          { locale: 'en-US', slug: `biz-${runId}-en`, name: `Business Category ${runId}` },
        ],
      },
    }),
    201,
  );
  categoryId = category.data.id;
});

test.afterAll(async () => {
  await saveRecording('business-api', [
    'business_entity',
    'store',
    'revenue_share_rule',
    'revenue_share_component',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
  await partner?.dispose();
});

test('everything needs a session and the permission', async () => {
  await expectCode(await anonymous.get(`${base}/entities`), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.post(`${base}/entities`, { data: {} }), 401);

  const blocked = await createAdminAccount(
    owner,
    'TanpaBisnis',
    await adminReferences(owner, {
      id_access: await createAccessProfile(owner, `Tanpa Bisnis ${runId}`, ['product.view']),
    }),
  );
  const session = await login(blocked.identity, blocked.password);
  await expectCode(await session.get(`${base}/entities`), 403, 'AUTH_PERMISSION_DENIED');
  // Options are for selects in other forms: any signed-in account may read the names.
  const options = await expectCode(await session.get(`${base}/entities/options`), 200);
  expect(options.data.some((item: { kind: string }) => item.kind === 'platform')).toBe(true);
  await session.dispose();
});

test('the platform entity exists from the start', async () => {
  const list = await expectCode(await owner.get(`${base}/entities`), 200);
  const platform = list.data.find((item: { kind: string }) => item.kind === 'platform');
  expect(platform).toBeTruthy();
  expect(platform.status).toBe(true);
  expect(platform.product_count).toBeGreaterThanOrEqual(0);
  platformId = platform.id;

  await expectCode(
    await owner.get(`${base}/entities/not-a-hash`),
    400,
    'BUSINESS_ENTITY_INVALID_ID',
  );
  // The platform keeps its kind and stays active.
  await expectCode(
    await owner.put(`${base}/entities/${platformId}`, {
      data: { name: platform.name, kind: 'partner' },
    }),
    409,
    'BUSINESS_ENTITY_IS_PLATFORM',
  );
  await expectCode(
    await owner.patch(`${base}/entities/${platformId}/status`, { data: { status: false } }),
    409,
    'BUSINESS_ENTITY_IS_PLATFORM',
  );
  await expectCode(
    await owner.delete(`${base}/entities/${platformId}`),
    409,
    'BUSINESS_ENTITY_IS_PLATFORM',
  );
});

test('entities: validation, unique names and codes, create and update', async () => {
  await expectCode(
    await owner.post(`${base}/entities`, { data: { name: ' ' } }),
    400,
    'BUSINESS_ENTITY_NAME_REQUIRED',
  );
  await expectCode(
    await owner.post(`${base}/entities`, { data: { name: 'X', kind: 'platform' } }),
    400,
    'BUSINESS_ENTITY_KIND_INVALID',
  );
  await expectCode(
    await owner.post(`${base}/entities`, { data: { name: 'X', kind: 'other' } }),
    400,
    'BUSINESS_ENTITY_KIND_INVALID',
  );
  await expectCode(
    await owner.post(`${base}/entities`, {
      data: { name: 'X', kind: 'partner', contact_email: 'bukan-email' },
    }),
    400,
    'BUSINESS_ENTITY_EMAIL_INVALID',
  );
  await expectCode(
    await owner.post(`${base}/entities`, {
      data: { name: 'X', kind: 'partner', contact_phone: '08-12' },
    }),
    400,
    'BUSINESS_ENTITY_PHONE_INVALID',
  );

  const atrija = await expectCode(
    await owner.post(`${base}/entities`, {
      data: {
        name: `Atrija ${runId}`,
        kind: 'partner',
        code: `atr-${runId}`,
        contact_name: 'Pak Atrija',
        contact_phone: '+628120000001',
        contact_email: 'atrija@example.invalid',
        note: 'Mitra B2B',
      },
    }),
    201,
    'BUSINESS_ENTITY_CREATED',
  );
  atrijaId = atrija.data.id;

  await expectCode(
    await owner.post(`${base}/entities`, { data: { name: `ATRIJA ${runId}`, kind: 'partner' } }),
    409,
    'BUSINESS_ENTITY_EXISTS',
  );
  await expectCode(
    await owner.post(`${base}/entities`, {
      data: { name: `Lain ${runId}`, kind: 'partner', code: `ATR-${runId}` },
    }),
    409,
    'BUSINESS_ENTITY_CODE_TAKEN',
  );

  const setia = await expectCode(
    await owner.post(`${base}/entities`, {
      data: { name: `Setia Latex ${runId}`, kind: 'own_brand', show_on_website: true },
    }),
    201,
  );
  setiaId = setia.data.id;

  const detail = await expectCode(await owner.get(`${base}/entities/${atrijaId}`), 200);
  expect(detail.data).toMatchObject({
    name: `Atrija ${runId}`,
    kind: 'partner',
    code: `ATR-${runId}`.toUpperCase(),
    contact_phone: '+628120000001',
    show_on_website: false,
    status: true,
    store_count: 0,
    product_count: 0,
    account_count: 0,
  });

  await expectCode(
    await owner.put(`${base}/entities/${atrijaId}`, {
      data: { ...detail.data, contact_name: 'Bu Atrija', kind: 'partner' },
    }),
    200,
    'BUSINESS_ENTITY_UPDATED',
  );
  const updated = await expectCode(await owner.get(`${base}/entities/${atrijaId}`), 200);
  expect(updated.data.contact_name).toBe('Bu Atrija');
  expect(updated.data.code).toBe(`ATR-${runId}`.toUpperCase());
});

test('stores: one per entity, channel, and name', async () => {
  const channels = await expectCode(await owner.get(`${base}/channels`), 200);
  expect(channels.data.length).toBeGreaterThan(0);
  channelId = channels.data[0].id;

  await expectCode(
    await owner.post(`${base}/entities/${atrijaId}/stores`, { data: { name: 'Toko' } }),
    400,
    'STORE_CHANNEL_INVALID',
  );
  await expectCode(
    await owner.post(`${base}/entities/${atrijaId}/stores`, {
      data: { name: 'Toko', channel_id: channelId, url: 'bukan-tautan' },
    }),
    400,
    'STORE_URL_INVALID',
  );
  const store = await expectCode(
    await owner.post(`${base}/entities/${atrijaId}/stores`, {
      data: {
        name: `Atrija Official ${runId}`,
        channel_id: channelId,
        url: 'https://example.invalid/atrija',
        external_id: 'shop-123',
      },
    }),
    201,
    'STORE_CREATED',
  );
  storeId = store.data.id;
  await expectCode(
    await owner.post(`${base}/entities/${atrijaId}/stores`, {
      data: { name: `atrija official ${runId}`, channel_id: channelId },
    }),
    409,
    'STORE_EXISTS',
  );

  await expectCode(
    await owner.put(`${base}/stores/${storeId}`, {
      data: {
        name: `Atrija Official ${runId}`,
        channel_id: channelId,
        note: 'Toko utama',
        status: true,
      },
    }),
    200,
    'STORE_UPDATED',
  );
  const ofAtrija = await expectCode(
    await owner.get(`${base}/stores`, { params: { entity: atrijaId } }),
    200,
  );
  expect(ofAtrija.data).toHaveLength(1);
  expect(ofAtrija.data[0]).toMatchObject({
    id: storeId,
    entity_id: atrijaId,
    channel_id: channelId,
    note: 'Toko utama',
    status: true,
  });
  const all = await expectCode(await owner.get(`${base}/stores`), 200);
  expect(all.data.some((item: { id: string }) => item.id === storeId)).toBe(true);
  const entity = await expectCode(await owner.get(`${base}/entities/${atrijaId}`), 200);
  expect(entity.data.store_count).toBe(1);
});

test('revenue share rules: dated, checked, never overlapping', async () => {
  const rules = `${base}/entities/${atrijaId}/rules`;
  await expectCode(
    await owner.post(`${base}/entities/${platformId}/rules`, {
      data: { name: 'x', from: '2026-01-01', components: [] },
    }),
    409,
    'BUSINESS_ENTITY_IS_PLATFORM',
  );
  await expectCode(
    await owner.post(rules, { data: { name: 'x' } }),
    400,
    'REVENUE_SHARE_FROM_INVALID',
  );
  await expectCode(
    await owner.post(rules, { data: { name: 'x', from: '2026-02-01', to: '2026-01-01' } }),
    400,
    'REVENUE_SHARE_TO_INVALID',
  );
  await expectCode(
    await owner.post(rules, {
      data: {
        name: 'x',
        from: '2026-01-01',
        components: [{ kind: 'platform_fee', label: 'Komisi', type: 'percent', value: 100 }],
      },
    }),
    400,
    'REVENUE_SHARE_COMPONENT_VALUE_INVALID',
  );
  await expectCode(
    await owner.post(rules, {
      data: {
        name: 'x',
        from: '2026-01-01',
        components: [
          { kind: 'platform_fee', label: 'Komisi', type: 'percent', value: 60 },
          { kind: 'other_fee', label: 'Lain', type: 'percent', value: 40 },
        ],
      },
    }),
    400,
    'REVENUE_SHARE_PERCENT_TOO_HIGH',
  );
  await expectCode(
    await owner.post(rules, {
      data: { name: 'x', from: '2026-01-01', store_id: 'not-a-hash', components: [] },
    }),
    400,
    'REVENUE_SHARE_STORE_INVALID',
  );

  const rule = await expectCode(
    await owner.post(rules, {
      data: {
        name: `Skema C ${runId}`,
        from: '2026-01-01',
        note: 'Atrija menjual, MIA memproduksi',
        components: [
          {
            kind: 'platform_fee',
            label: 'Komisi platform',
            type: 'percent',
            value: 10,
            base: 'gross',
          },
          { kind: 'production_fee', label: 'Tagihan produksi', type: 'cost_plus', value: 15 },
          { kind: 'other_fee', label: 'Biaya pembayaran', type: 'fixed', value: 2500 },
        ],
      },
    }),
    201,
    'REVENUE_SHARE_RULE_CREATED',
  );
  ruleId = rule.data.id;

  // The whole entity is already covered from 2026-01-01 with no end.
  await expectCode(
    await owner.post(rules, { data: { name: 'Dobel', from: '2026-06-01', components: [] } }),
    409,
    'REVENUE_SHARE_RULE_OVERLAPS',
  );
  // A rule for one store is its own case.
  const forStore = await expectCode(
    await owner.post(rules, {
      data: {
        name: `Khusus toko ${runId}`,
        from: '2026-06-01',
        to: '2026-12-31',
        store_id: storeId,
        components: [{ kind: 'platform_fee', label: 'Komisi', type: 'percent', value: 8 }],
      },
    }),
    201,
  );

  await expectCode(
    await owner.put(`${base}/rules/${ruleId}`, {
      data: {
        name: `Skema C ${runId}`,
        from: '2026-01-01',
        to: '2026-05-31',
        note: 'Atrija menjual, MIA memproduksi',
        components: [
          { kind: 'platform_fee', label: 'Komisi platform', type: 'percent', value: 12 },
          { kind: 'production_fee', label: 'Tagihan produksi', type: 'cost_plus', value: 15 },
        ],
      },
    }),
    200,
    'REVENUE_SHARE_RULE_UPDATED',
  );

  const list = await expectCode(
    await owner.get(`${base}/rules`, { params: { entity: atrijaId } }),
    200,
  );
  expect(list.data).toHaveLength(2);
  const saved = list.data.find((item: { id: string }) => item.id === ruleId);
  expect(saved).toMatchObject({
    entity_id: atrijaId,
    store_id: null,
    from: '2026-01-01',
    to: '2026-05-31',
    note: 'Atrija menjual, MIA memproduksi',
  });
  expect(saved.components).toEqual([
    expect.objectContaining({ kind: 'platform_fee', type: 'percent', value: 12, base: 'gross' }),
    expect.objectContaining({ kind: 'production_fee', type: 'cost_plus', value: 15 }),
  ]);
  const storeRule = list.data.find((item: { id: string }) => item.id === forStore.data.id);
  expect(storeRule.store_id).toBe(storeId);

  // The store carries a rule, so it cannot go; the rule can.
  await expectCode(await owner.delete(`${base}/stores/${storeId}`), 409, 'STORE_HAS_RULES');
  await expectCode(
    await owner.delete(`${base}/rules/${forStore.data.id}`),
    200,
    'REVENUE_SHARE_RULE_DELETED',
  );
});

test('a product names its seller and producer', async () => {
  await expectCode(
    await owner.post('/api/v1/products', {
      data: product('bad', { seller_entity_id: 'not-a-hash' }),
    }),
    400,
    'BUSINESS_ENTITY_INVALID',
  );
  const own = await expectCode(await owner.post('/api/v1/products', { data: product('own') }), 201);
  ownProductId = own.data.id;
  const ownDetail = await expectCode(await owner.get(`/api/v1/products/${ownProductId}`), 200);
  expect(ownDetail.data.seller_entity_id).toBe(platformId);
  expect(ownDetail.data.producer_entity_id).toBe(platformId);

  const created = await expectCode(
    await owner.post('/api/v1/products', {
      data: product('mitra', { seller_entity_id: atrijaId, producer_entity_id: platformId }),
    }),
    201,
  );
  partnerProductId = created.data.id;
  const detail = await expectCode(await owner.get(`/api/v1/products/${partnerProductId}`), 200);
  expect(detail.data).toMatchObject({
    seller_entity_id: atrijaId,
    seller_entity_name: `Atrija ${runId}`,
    producer_entity_id: platformId,
  });
  // An update that leaves the entities out keeps them.
  await expectCode(
    await owner.put(`/api/v1/products/${partnerProductId}`, { data: product('mitra') }),
    200,
  );
  const kept = await expectCode(await owner.get(`/api/v1/products/${partnerProductId}`), 200);
  expect(kept.data.seller_entity_id).toBe(atrijaId);
  const entity = await expectCode(await owner.get(`${base}/entities/${atrijaId}`), 200);
  expect(entity.data.product_count).toBe(1);
});

test("a partner's login sees only its own entity, stores, rules, and products", async () => {
  const accessId = await createAccessProfile(owner, `Mitra ${runId}`, [
    'business.view',
    'business.manage',
    'product.view',
    'product.create',
    'product.update',
  ]);
  await expectCode(
    await owner.post('/api/v1/admin-acct', {
      data: {
        name: 'Akun Mitra',
        alias: `mx${runId}`.slice(0, 15),
        email_1: `mitra-x.${runId}@example.invalid`,
        phone_1: '+628129999001',
        password: `Uji-Mitra-${runId}-9`,
        ...references,
        id_access: accessId,
        id_business_entity: 'not-a-hash',
        is_all_access: 0,
      },
    }),
    400,
    'ADMIN_ACCOUNT_REFERENCE_INVALID',
  );
  const account = await createAdminAccount(owner, 'Mitra', {
    ...references,
    id_access: accessId,
    id_business_entity: atrijaId,
  } as AdminReferences);
  partnerAccountId = account.id;
  const stored = await expectCode(await owner.get(`/api/v1/admin-acct/${partnerAccountId}`), 200);
  expect(stored.data.business_entity).toEqual({ id: atrijaId, name: `Atrija ${runId}` });

  partner = await login(account.identity, account.password);
  const me = await expectCode(await partner.get('/api/v1/admin-acct/me'), 200);
  expect(me.data.business_entity).toEqual({ id: atrijaId, name: `Atrija ${runId}` });

  const entities = await expectCode(await partner.get(`${base}/entities`), 200);
  expect(entities.data.map((item: { id: string }) => item.id)).toEqual([atrijaId]);
  await expectCode(
    await partner.get(`${base}/entities/${setiaId}`),
    404,
    'BUSINESS_ENTITY_NOT_FOUND',
  );
  await expectCode(
    await partner.get(`${base}/entities/${platformId}`),
    404,
    'BUSINESS_ENTITY_NOT_FOUND',
  );
  const options = await expectCode(await partner.get(`${base}/entities/options`), 200);
  expect(options.data.map((item: { value: string }) => item.value)).toEqual([atrijaId]);

  // No new entities, no rule changes, no kind changes; its own contact details are fine.
  await expectCode(
    await partner.post(`${base}/entities`, { data: { name: 'Baru', kind: 'partner' } }),
    403,
    'BUSINESS_RESTRICTED',
  );
  await expectCode(
    await partner.put(`${base}/entities/${atrijaId}`, {
      data: { name: `Atrija ${runId}`, kind: 'own_brand' },
    }),
    403,
    'BUSINESS_RESTRICTED',
  );
  await expectCode(
    await partner.put(`${base}/entities/${atrijaId}`, {
      data: { name: `Atrija ${runId}`, kind: 'partner', contact_name: 'Kontak baru' },
    }),
    200,
  );
  await expectCode(
    await partner.patch(`${base}/entities/${atrijaId}/status`, { data: { status: false } }),
    403,
    'BUSINESS_RESTRICTED',
  );
  await expectCode(
    await partner.post(`${base}/entities/${atrijaId}/rules`, {
      data: { name: 'x', from: '2027-01-01', components: [] },
    }),
    403,
    'BUSINESS_RESTRICTED',
  );
  await expectCode(await partner.delete(`${base}/rules/${ruleId}`), 403, 'BUSINESS_RESTRICTED');
  const rules = await expectCode(await partner.get(`${base}/rules`), 200);
  expect(rules.data.map((item: { id: string }) => item.id)).toEqual([ruleId]);

  // Its own stores, yes; another entity's, no.
  const stores = await expectCode(await partner.get(`${base}/stores`), 200);
  expect(stores.data.map((item: { id: string }) => item.id)).toEqual([storeId]);
  await expectCode(
    await partner.post(`${base}/entities/${setiaId}/stores`, {
      data: { name: 'Nyelonong', channel_id: channelId },
    }),
    404,
    'BUSINESS_ENTITY_NOT_FOUND',
  );
  const ownStore = await expectCode(
    await partner.post(`${base}/entities/${atrijaId}/stores`, {
      data: { name: `Atrija Kedua ${runId}`, channel_id: channelId },
    }),
    201,
  );
  await expectCode(await partner.delete(`${base}/stores/${ownStore.data.id}`), 200);

  // Products: only those it sells or makes; new ones are its own.
  const products = await expectCode(
    await partner.get('/api/v1/products', { params: { limit: '100' } }),
    200,
  );
  expect(products.data.map((item: { id: string }) => item.id)).toEqual([partnerProductId]);
  expect(products.meta.total_all).toBe(1);
  await expectCode(await partner.get(`/api/v1/products/${ownProductId}`), 404, 'PRODUCT_NOT_FOUND');
  await expectCode(
    await partner.put(`/api/v1/products/${ownProductId}`, { data: product('own') }),
    404,
    'PRODUCT_NOT_FOUND',
  );
  await expectCode(
    await partner.post('/api/v1/products', {
      data: product('curang', { seller_entity_id: platformId }),
    }),
    400,
    'BUSINESS_ENTITY_INVALID',
  );
  const mine = await expectCode(
    await partner.post('/api/v1/products', {
      data: product('mitra2', { producer_entity_id: platformId }),
    }),
    201,
  );
  const mineDetail = await expectCode(await partner.get(`/api/v1/products/${mine.data.id}`), 200);
  // The producer is the platform staff's call, so the partner's own entity stands.
  expect(mineDetail.data).toMatchObject({
    seller_entity_id: atrijaId,
    producer_entity_id: atrijaId,
  });
  await expectCode(await owner.delete(`/api/v1/products/${mine.data.id}`), 200);
});

test('an entity goes only when inactive and unused', async () => {
  await expectCode(
    await owner.delete(`${base}/entities/${atrijaId}`),
    409,
    'BUSINESS_ENTITY_MUST_BE_INACTIVE',
  );
  await expectCode(
    await owner.patch(`${base}/entities/${atrijaId}/status`, { data: { status: false } }),
    200,
    'BUSINESS_ENTITY_STATUS_UPDATED',
  );
  const inUse = await expectCode(
    await owner.delete(`${base}/entities/${atrijaId}`),
    409,
    'BUSINESS_ENTITY_IN_USE',
  );
  expect(inUse.data).toMatchObject({ stores: 1, products: 1, accounts: 1 });

  await expectCode(await owner.delete(`${base}/rules/${ruleId}`), 200);
  await expectCode(await owner.delete(`${base}/stores/${storeId}`), 200, 'STORE_DELETED');
  await expectCode(await owner.delete(`/api/v1/products/${partnerProductId}`), 200);
  await expectCode(
    await owner.patch(`/api/v1/admin-acct/${partnerAccountId}/status`, {
      data: { admin_acct_status: 0 },
    }),
    200,
  );
  await expectCode(await owner.delete(`/api/v1/admin-acct/${partnerAccountId}`), 200);

  await expectCode(
    await owner.delete(`${base}/entities/${atrijaId}`),
    200,
    'BUSINESS_ENTITY_DELETED',
  );
  await expectCode(
    await owner.get(`${base}/entities/${atrijaId}`),
    404,
    'BUSINESS_ENTITY_NOT_FOUND',
  );
  const rules = await expectCode(
    await owner.get(`${base}/rules`, { params: { entity: atrijaId } }),
    200,
  );
  expect(rules.data).toHaveLength(0);

  await expectCode(
    await owner.patch(`${base}/entities/${setiaId}/status`, { data: { status: 0 } }),
    200,
  );
  await expectCode(await owner.delete(`${base}/entities/${setiaId}`), 200);
  await expectCode(await owner.delete(`/api/v1/products/${ownProductId}`), 200);
});
