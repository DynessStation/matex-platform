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

// API contract for the contact settings (backend/src/ctrl/admin/public-contact.ts) and the public
// contact page and inquiry form (backend/src/ctrl/public/contact.ts): validation, saving channels
// and topics as a whole, what the public site shows, and the inquiry rules (honeypot, topic,
// rate limit). Recipient addresses are test addresses only.
test.describe.configure({ mode: 'serial' });

const base = '/api/v1/public-contact';
const recipient = 'kontak-uji@example.invalid';

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let original: any;

const texts = (label: string, status = 1) => [
  { locale: 'id-ID', label: `${label} ID`, description: 'Keterangan', status },
  { locale: 'en-US', label: `${label} EN`, description: null, status },
];

/** The save body (PUT) for the settings (GET); active topics get a test recipient. */
const payloadFrom = (settings: any) => ({
  channels: settings.channels.map((item: any) => ({ ...item })),
  topics: settings.topics.map((item: any) => ({
    ...item,
    recipient_email: item.recipient_email ?? (item.status === 1 ? recipient : null),
  })),
});

const publicContact = async (locale = 'id-ID') =>
  (await expectCode(await anonymous.get(`/api/public/contact/${locale}`), 200, 'CONTACT_FOUND'))
    .data;

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording('public-contact-api', [
    'public_contact_channel',
    'public_contact_channel_i18n',
    'contact_inquiry_topic',
    'contact_inquiry_topic_i18n',
    'contact_inquiry',
    'audit_log',
  ]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test('contact settings require a session', async () => {
  await expectCode(await anonymous.get(base), 401, 'AUTH_TOKEN_REQUIRED');
  await expectCode(await anonymous.put(base, { data: {} }), 401, 'AUTH_TOKEN_REQUIRED');
});

test('settings and the public contact page', async () => {
  owner = await login(admin.identity, admin.password);
  original = (await expectCode(await owner.get(base), 200, 'PUBLIC_CONTACT_FOUND')).data;
  expect(original.channels.length).toBeGreaterThan(0);
  expect(original.topics.length).toBeGreaterThan(0);
  expect(original.channels[0]).toMatchObject({
    key: expect.any(String),
    type: expect.any(String),
    translations: expect.any(Array),
  });

  const page = await publicContact();
  expect(page.locale).toBe('id-ID');
  expect(page.channels.length).toBeGreaterThan(0);
  expect(page.topics.length).toBeGreaterThan(0);
  // Offices carry no internal id.
  expect(page.offices.every((office: any) => office.id_office === undefined)).toBe(true);
  await expectCode(await anonymous.get('/api/public/contact/fr-FR'), 404, 'CONTACT_NOT_FOUND');
});

test('save validates channels and topics', async () => {
  // A seeded topic without an address does not stop the list being saved as it is.
  expect(original.topics.some((item: any) => !item.recipient_email)).toBe(true);
  await expectCode(await owner.put(base, { data: { topics: original.topics } }), 200);

  const valid = payloadFrom(original);
  const channel = (changes: Record<string, unknown>) => ({
    ...valid,
    channels: [
      { key: 'uji', type: 'website', value: 'x', url: null, translations: texts('Uji') },
    ].map((item) => ({ ...item, ...changes })),
  });
  const topic = (changes: Record<string, unknown>) => ({
    ...valid,
    topics: [{ key: 'uji', recipient_email: recipient, translations: texts('Topik') }].map(
      (item) => ({ ...item, ...changes }),
    ),
  });
  const invalid: unknown[] = [
    {},
    { ...valid, channels: 'x' },
    { ...valid, topics: 'x' },
    { ...valid, channels: Array(31).fill(valid.channels[0]) },
    { ...valid, channels: [valid.channels[0], valid.channels[0]] },
    channel({ key: 'k'.repeat(101) }),
    channel({ type: 'fax' }),
    channel({ value: ' ' }),
    channel({ value: 'v'.repeat(501) }),
    channel({ url: 'javascript:alert(1)' }),
    channel({ url: 'not a url' }),
    channel({ type: 'whatsapp', value: 'bukan nomor' }),
    channel({ translations: texts('Uji').slice(1) }),
    channel({ translations: [{ ...texts('Uji')[0], label: '' }, texts('Uji')[1]] }),
    topic({ recipient_email: null }),
    topic({ recipient_email: 'not-an-email' }),
    topic({ key: 'k'.repeat(101) }),
    { ...valid, topics: [valid.topics[0], valid.topics[0]] },
  ];
  for (const data of invalid) {
    await expectCode(await owner.put(base, { data }), 400, 'PUBLIC_CONTACT_PAYLOAD_INVALID');
  }
});

test('save replaces channels and topics', async () => {
  const valid = payloadFrom(original);
  const saved = await expectCode(
    await owner.put(base, {
      data: {
        channels: [
          ...valid.channels,
          {
            key: `WA Uji ${runId}`,
            type: 'whatsapp',
            value: '+6281200000000',
            url: 'https://ignored.example',
            is_primary: 0,
            sort_order: 90,
            translations: texts('WhatsApp Uji'),
          },
          {
            key: `instagram-${runId}`,
            type: 'social',
            value: '@matex',
            url: 'https://instagram.com/matex',
            sort_order: 91,
            translations: texts('Instagram', 0),
          },
          {
            key: `hidden-${runId}`,
            type: 'email',
            value: 'tersembunyi@example.invalid',
            is_public: 0,
            translations: texts('Tersembunyi'),
          },
        ],
        topics: [
          ...valid.topics,
          {
            key: `topik-${runId}`,
            recipient_email: recipient,
            sort_order: 50,
            translations: texts('Topik Uji'),
          },
        ],
      },
    }),
    200,
    'PUBLIC_CONTACT_UPDATED',
  );
  // The answer is the saved settings, the same as a fresh read.
  expect(saved.data).toEqual((await expectCode(await owner.get(base), 200)).data);
  expect(saved.data.channels.find((item: any) => item.key === `wa-uji-${runId}`)).toMatchObject({
    type: 'whatsapp',
    url: null,
    is_primary: 0,
    is_public: 1,
  });
  // Positions follow the list order (1..n); the sort_order sent is ignored.
  expect(saved.data.channels.map((item: any) => item.key)).toEqual([
    ...valid.channels.map((item: any) => item.key),
    `wa-uji-${runId}`,
    `instagram-${runId}`,
    `hidden-${runId}`,
  ]);
  expect(saved.data.channels.map((item: any) => item.sort_order)).toEqual(
    saved.data.channels.map((_: any, i: number) => i + 1),
  );
  expect(saved.data.topics.find((item: any) => item.key === `topik-${runId}`).sort_order).toBe(
    valid.topics.length + 1,
  );

  const page = await publicContact();
  const keys = page.channels.map((item: any) => item.key);
  expect(page.channels.find((item: any) => item.key === `wa-uji-${runId}`)).toMatchObject({
    url: 'https://wa.me/6281200000000',
    label: 'WhatsApp Uji ID',
  });
  // Hidden channels and switched-off translations stay off the public page.
  expect(keys).not.toContain(`hidden-${runId}`);
  expect(keys).not.toContain(`instagram-${runId}`);
  expect(page.topics.map((item: any) => item.key)).toContain(`topik-${runId}`);

  // Leaving entries out removes channels and topics.
  await expectCode(await owner.put(base, { data: valid }), 200, 'PUBLIC_CONTACT_UPDATED');
  const after = (await expectCode(await owner.get(base), 200)).data;
  expect(after.channels.map((item: any) => item.key)).toEqual(
    original.channels.map((item: any) => item.key),
  );
  expect(after.topics.find((item: any) => item.key === `topik-${runId}`)).toBeUndefined();
  expect((await publicContact()).topics.map((item: any) => item.key)).not.toContain(
    `topik-${runId}`,
  );
});

test('a list left out stays, keys are made, and WhatsApp numbers are tidied', async () => {
  const before = (await expectCode(await owner.get(base), 200)).data;
  const saved = await expectCode(
    await owner.put(base, {
      data: {
        channels: [
          ...before.channels,
          { type: 'whatsapp', value: '0812 3456-789', translations: texts('Nomor') },
          { type: 'whatsapp', value: '0812 3456-789', translations: texts('Nomor Dua') },
        ],
      },
    }),
    200,
  );
  const added = saved.data.channels.slice(before.channels.length);
  expect(added[0]).toMatchObject({ key: 'whatsapp-0812-3456-789', value: '+628123456789' });
  expect(added[1].key).toBe('whatsapp-0812-3456-789-2');
  expect(saved.data.topics).toEqual(before.topics);
  expect(saved.data.socials).toEqual(before.socials);

  await expectCode(await owner.put(base, { data: { channels: before.channels } }), 200);
});

test('social accounts: three per platform, inactive is hidden, only inactive can go', async () => {
  const account = (changes: Record<string, unknown>) => ({
    platform: 'tiktok',
    name: `@uji${runId}`,
    url: 'https://www.tiktok.com/@uji',
    ...changes,
  });
  const save = (socials: unknown[]) => owner.put(base, { data: { socials } });
  for (const invalid of [
    [account({ platform: 'myspace' })],
    [account({ name: ' ' })],
    [account({ url: 'javascript:alert(1)' })],
    [account({ url: 'mailto:a@b.c' })],
    [account({ followers: -1 })],
    [account({ content_count: 'banyak' })],
    [account({}), account({}), account({}), account({})],
  ]) {
    await expectCode(await save(invalid), 400, 'PUBLIC_CONTACT_PAYLOAD_INVALID');
  }

  const saved = await expectCode(
    await save([
      account({ followers: 450, content_count: 13 }),
      account({ name: 'Disimpan Saja', is_active: 0, is_public: 1 }),
    ]),
    200,
  );
  const [first, second] = saved.data.socials;
  expect(first).toMatchObject({ is_active: 1, is_public: 1, followers: 450, content_count: 13 });
  expect(first.stats_updated_at).toBeTruthy();
  // An inactive account is never shown, whatever was sent.
  expect(second).toMatchObject({ is_active: 0, is_public: 0, followers: null });

  const page = await publicContact();
  expect(page.socials.map((item: any) => item.key)).toEqual([first.key]);
  expect(page.socials[0]).toEqual({
    key: first.key,
    platform: 'tiktok',
    name: first.name,
    url: first.url,
  });

  await expectCode(await save([second]), 409, 'PUBLIC_SOCIAL_ACTIVE');
  await expectCode(await save([first]), 200);
  await expectCode(await save([{ ...first, is_active: 0 }]), 200);
  const empty = await expectCode(await save([]), 200);
  expect(empty.data.socials).toEqual([]);
  expect((await publicContact()).socials).toEqual([]);
});

test('the public inquiry form', async () => {
  const topicKey = original.topics.find((item: any) => item.status === 1).key;
  const inquiry = (changes: Record<string, unknown>) =>
    anonymous.post('/api/public/contact-inquiry', {
      data: {
        locale: 'id-ID',
        topic_key: topicKey,
        name: 'Pengunjung Uji',
        email: 'pengunjung@example.invalid',
        message: 'Halo, ini pesan uji.',
        consent: true,
        ...changes,
      },
    });
  // A filled honeypot field is accepted silently and not stored.
  const trapped = await expectCode(
    await inquiry({ website: 'spam' }),
    202,
    'CONTACT_INQUIRY_ACCEPTED',
  );
  expect(trapped.data).toBeNull();
  const invalid: Record<string, unknown>[] = [
    { locale: 'fr-FR' },
    { topic_key: '' },
    { name: ' ' },
    { email: null, phone: null },
    { email: 'not-an-email' },
    { phone: '1'.repeat(51), email: null },
    { message: '' },
    { message: 'm'.repeat(5001) },
    { consent: 'yes' },
  ];
  for (const changes of invalid) {
    await expectCode(await inquiry(changes), 400, 'CONTACT_INQUIRY_INVALID');
  }
  await expectCode(await inquiry({ topic_key: 'no-such-topic' }), 400, 'CONTACT_TOPIC_INVALID');

  const sent = await expectCode(
    await inquiry({ email: null, phone: '+62811' }),
    201,
    'CONTACT_INQUIRY_CREATED',
  );
  expect(sent.data.reference).toMatch(/^MSG-\d+$/);
  // Five accepted attempts per address in 15 minutes (the topic check above counted too).
  await expectCode(await inquiry({}), 201);
  await expectCode(await inquiry({}), 201);
  await expectCode(await inquiry({}), 201);
  await expectCode(await inquiry({}), 429, 'CONTACT_INQUIRY_RATE_LIMITED');
});

test('an account without contact rights is refused', async () => {
  const noPermissions = await createAccessProfile(owner, 'Tanpa Izin Kontak', []);
  const account = await createAdminAccount(
    owner,
    'Kontak',
    await adminReferences(owner, { id_access: noPermissions }),
  );
  const limited = await login(account.identity, account.password);
  try {
    await expectCode(await limited.get(base), 403, 'AUTH_PERMISSION_DENIED');
    await expectCode(await limited.put(base, { data: {} }), 403, 'AUTH_PERMISSION_DENIED');
  } finally {
    await limited.dispose();
  }
});
