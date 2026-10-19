import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { expect, request, type APIRequestContext, type APIResponse } from "@playwright/test";

import { backendRoot, stack } from "./stack.mjs";

// Shared helpers for the API contract specs (write/*-api.spec.ts).
//
// Recording: with MATEX_E2E_RECORD=<folder>, every response checked through expectCode() and
// the rows of the tables a spec names are written to <folder>/<spec>.json, with values that
// change on every run (timestamps, uuids, tokens, hashes) masked. Record on a fresh database
// (`npm run test:api`) before and after a refactor and compare the two files: they must be
// identical. See docs/konsep-kerapian-kode.md.

export const { admin } = JSON.parse(fs.readFileSync(stack.stateFile, "utf8")) as {
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

function mask(value: unknown, key = ""): unknown {
  if (value instanceof Date) return "<date>";
  if (Array.isArray(value)) return value.map((item) => mask(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mask(v, k)]));
  }
  return volatileKey.test(key) && value !== null && value !== "" ? "<masked>" : value;
}

const recorded: unknown[] = [];

/** Asserts status and response code, records the response, and returns the parsed body. */
export async function expectCode(response: APIResponse, status: number, code?: string): Promise<ApiBody> {
  const body = (await response.json()) as ApiBody;
  if (recordDir) {
    const url = new URL(response.url());
    recorded.push({ path: url.pathname + url.search, status: response.status(), body: mask(body) });
  }
  expect({ status: response.status(), code: body.code }).toEqual({ status, code: code ?? body.code });
  return body;
}

export function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: stack.apiOrigin });
}

/** Logs in through the admin login endpoint and returns a context that carries the session cookie. */
export async function login(identity: string, password: string): Promise<APIRequestContext> {
  const context = await apiContext();
  const body = await expectCode(
    await context.post("/api/v1/admin-acct/login", { data: { identity, password } }),
    200,
    "AUTH_LOGIN_SUCCESS",
  );
  expect(body.data.id_admin_acct).toBeTruthy();
  return context;
}

/** Writes the recording for this spec, including the current rows of `tables`. No-op unless recording. */
export async function saveRecording(spec: string, tables: string[]): Promise<void> {
  if (!recordDir) return;
  const backendRequire = createRequire(path.join(backendRoot, "package.json"));
  const env = backendRequire("dotenv").parse(fs.readFileSync(path.join(backendRoot, ".env")));
  const connection = await backendRequire("mysql2/promise").createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASS || "",
    database: stack.databaseName,
  });
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
  fs.writeFileSync(path.join(recordDir, `${spec}.json`), `${JSON.stringify({ responses: recorded, rows }, null, 1)}\n`);
}
