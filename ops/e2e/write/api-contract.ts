import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { expect, request, type APIRequestContext, type APIResponse } from '@playwright/test';

import { backendRoot, stack } from './stack.mjs';

// Shared helpers for the API contract specs (write/*-api.spec.ts).
//
// Recording: with MATEX_E2E_RECORD=<folder>, every response checked through expectCode() and
// the rows of the tables a spec names are written to <folder>/<spec>.json, with values that
// change on every run (timestamps, uuids, tokens, hashes) masked. Record on a fresh database
// (`npm run test:api`) before and after a refactor and compare the two files: they must be
// identical. See docs/standar-kode.md.

export const { admin } = JSON.parse(fs.readFileSync(stack.stateFile, 'utf8')) as {
  admin: { identity: string; password: string };
};

const recordDir = process.env.MATEX_E2E_RECORD;

// Values that make each run's rows unique. Fixed while recording, so recordings compare.
export const runNumber = recordDir ? 1234567 : Date.now() % 10_000_000;
export const runId = runNumber.toString(36);

export type ApiBody = {
  success: boolean;
  code?: string;
  message?: string;
  data?: any;
  pagination?: Record<string, number | boolean>;
};

const volatileKey =
  /^(created|updated|uuid|issued_at|expires_at|correlation_id|duration_ms|request_id|ip_address|user_agent|occurred_at)$|_at$|hash|password|signature|token/i;

function mask(value: unknown, key = ''): unknown {
  if (value instanceof Date) return '<date>';
  if (Array.isArray(value)) return value.map((item) => mask(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mask(v, k)]));
  }
  if (volatileKey.test(key) && value !== null && value !== '') return '<masked>';
  // Uploaded files get random 32-hex names (also inside storage paths and URLs).
  return typeof value === 'string' ? value.replace(/[0-9a-f]{32}/g, '<random>') : value;
}

const recorded: unknown[] = [];

/** Asserts status and response code, records the response, and returns the parsed body. */
export async function expectCode(
  response: APIResponse,
  status: number,
  code?: string,
): Promise<ApiBody> {
  const body = (await response.json()) as ApiBody;
  if (recordDir) {
    const url = new URL(response.url());
    recorded.push({ path: url.pathname + url.search, status: response.status(), body: mask(body) });
  }
  expect({ status: response.status(), code: body.code }).toEqual({
    status,
    code: code ?? body.code,
  });
  // app.ts turns this header off; no route may bring it back (SEC-007).
  expect(response.headers()['x-powered-by']).toBeUndefined();
  return body;
}

export function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: stack.apiOrigin });
}

/** Logs in through the admin login endpoint and returns a context that carries the session cookie. */
export async function login(identity: string, password: string): Promise<APIRequestContext> {
  const context = await apiContext();
  const body = await expectCode(
    await context.post('/api/v1/admin-acct/login', { data: { identity, password } }),
    200,
    'AUTH_LOGIN_SUCCESS',
  );
  expect(body.data.id_admin_acct).toBeTruthy();
  return context;
}

export type AdminReferences = {
  id_master_comp: string;
  id_office: string;
  id_chair: string;
  id_access: string;
};

/**
 * The first company, office, chair, and access profile offered by the admin-account selects,
 * with any of them replaced by `overrides`.
 */
export async function adminReferences(
  context: APIRequestContext,
  overrides: Partial<AdminReferences> = {},
): Promise<AdminReferences> {
  const select = async (kind: string, params: Record<string, string> = {}) => {
    const body = await expectCode(
      await context.get(`/api/v1/admin-acct/select/${kind}`, { params }),
      200,
    );
    return body.data[0].value as string;
  };
  const company = overrides.id_master_comp ?? (await select('company'));
  return {
    id_master_comp: company,
    id_office: overrides.id_office ?? (await select('office', { id_master_comp: company })),
    id_chair: overrides.id_chair ?? (await select('chair', { id_master_comp: company })),
    id_access: overrides.id_access ?? (await select('access', { id_master_comp: company })),
  };
}

// Three digits derived from an account key.
const keyNumber = (key: string) =>
  String([...key].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1000, 7)).padStart(
    3,
    '0',
  );

/**
 * Creates an admin account without full access (so it holds no permissions) and returns its
 * id and credentials. `key` must be unique within the run (letters and digits only).
 */
export async function createAdminAccount(
  context: APIRequestContext,
  key: string,
  references: AdminReferences,
): Promise<{ id: string; identity: string; password: string }> {
  const account = {
    name: 'Akun Uji Kontrak',
    alias: `${key}${runId}`.slice(0, 15),
    email_1: `${key.toLowerCase()}.${runId}@example.invalid`,
    // Derived from the key: specs load this module separately, so a counter would repeat.
    phone_1: `+6281${String(runNumber).padStart(7, '0')}${keyNumber(key)}`,
    password: `Uji-${key}-${runId}-9`,
  };
  const body = await expectCode(
    await context.post('/api/v1/admin-acct', {
      data: { ...account, ...references, is_all_access: 0 },
    }),
    201,
    'ADMIN_ACCOUNT_CREATED',
  );
  return { id: body.data.id_admin_acct, identity: account.email_1, password: account.password };
}

/** Creates an access profile granting exactly `permissionKeys` and returns its id. */
export async function createAccessProfile(
  context: APIRequestContext,
  name: string,
  permissionKeys: string[],
): Promise<string> {
  const matrix = await expectCode(await context.get('/api/v1/admin-access/permission-matrix'), 200);
  const idByKey = new Map<string, string>();
  for (const group of matrix.data) {
    for (const permission of group.permissions) {
      idByKey.set(permission.permission_key, permission.id_admin_permission);
    }
  }
  const permissions = permissionKeys.map((key) => {
    const id = idByKey.get(key);
    if (!id) throw new Error(`Unknown permission ${key}`);
    return id;
  });
  const created = await expectCode(
    await context.post('/api/v1/admin-access', {
      data: { access_name: `${name} ${runId}`, permissions },
    }),
    201,
    'ADMIN_ACCESS_CREATED',
  );
  return created.data.id_admin_access as string;
}

/** Uploads write/fixtures/sample.png into an attachment collection and returns its id. */
export async function uploadSample(
  context: APIRequestContext,
  collection: string,
): Promise<string> {
  const file = path.join(path.dirname(stack.stateFile), 'write', 'fixtures', 'sample.png');
  const body = await expectCode(
    await context.post('/api/v1/attachment', {
      multipart: {
        collection,
        files: { name: 'sample.png', mimeType: 'image/png', buffer: fs.readFileSync(file) },
      },
    }),
    201,
    'ATTACHMENT_UPLOADED',
  );
  return body.data[0].id_attachment as string;
}

/** A connection to the e2e database (never the dev or production database). */
async function e2eDatabase() {
  const backendRequire = createRequire(path.join(backendRoot, 'package.json'));
  const env = backendRequire('dotenv').parse(fs.readFileSync(path.join(backendRoot, '.env')));
  return backendRequire('mysql2/promise').createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASS || '',
    database: stack.databaseName,
  });
}

/** The first row a read-only query answers on the e2e database, or undefined. */
export async function e2eRow(sql: string, params: unknown[]): Promise<Record<string, unknown>> {
  const connection = await e2eDatabase();
  try {
    const [rows] = await connection.query(sql, params);
    return rows[0];
  } finally {
    await connection.end();
  }
}

/** Writes the recording for this spec, including the current rows of `tables`. No-op unless recording. */
export async function saveRecording(spec: string, tables: string[]): Promise<void> {
  if (!recordDir) return;
  const connection = await e2eDatabase();
  const rows: Record<string, unknown> = {};
  try {
    for (const table of tables) {
      const [result] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY 1`);
      rows[table] = mask(result);
    }
  } finally {
    await connection.end();
  }
  fs.mkdirSync(recordDir, { recursive: true });
  fs.writeFileSync(
    path.join(recordDir, `${spec}.json`),
    `${JSON.stringify({ responses: recorded.splice(0), rows }, null, 1)}\n`,
  );
}
