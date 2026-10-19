import { expect, test, type APIRequestContext } from "@playwright/test";

import { admin, apiContext, expectCode, login, runId, runNumber, saveRecording } from "./api-contract";

// API contract for the admin session and admin-account endpoints
// (backend/src/ctrl/admin/auth.ts and ctrl/admin/admin-account/). It pins status codes, response
// codes, and the key fields, so refactors can be checked against real MySQL behavior.
test.describe.configure({ mode: "serial" });

const base = "/api/v1/admin-acct";

let anonymous: APIRequestContext;
let owner: APIRequestContext;
let ownerId = "";
let reference: { id_master_comp: string; id_office: string; id_chair: string; id_access: string };
let createdId = "";

const newAccount = {
  name: "Akun Uji Kontrak",
  alias: `Kontrak${runId}`,
  email_1: `kontrak.${runId}@example.invalid`,
  phone_1: `+62810${String(runNumber).padStart(7, "0")}`,
  password: `Kontrak-${runId}-9`,
};

test.beforeAll(async () => {
  anonymous = await apiContext();
});

test.afterAll(async () => {
  await saveRecording("admin-account-api", ["admin_acct", "audit_log"]);
  await anonymous?.dispose();
  await owner?.dispose();
});

test("admin-account endpoints require a session", async () => {
  await expectCode(await anonymous.get(base), 401, "AUTH_TOKEN_REQUIRED");
  await expectCode(await anonymous.get(`${base}/me`), 401, "AUTH_TOKEN_REQUIRED");
  await expectCode(await anonymous.get(`${base}/select/company`), 401, "AUTH_TOKEN_REQUIRED");
  await expectCode(await anonymous.post(base, { data: {} }), 401, "AUTH_TOKEN_REQUIRED");
});

test("login rejects missing fields and wrong passwords", async () => {
  await expectCode(
    await anonymous.post(`${base}/login`, { data: { identity: admin.identity } }),
    400,
    "AUTH_LOGIN_FIELDS_REQUIRED",
  );
  await expectCode(
    await anonymous.post(`${base}/login`, {
      data: { identity: admin.identity, password: `${admin.password}x` },
    }),
    401,
    "AUTH_INVALID_CREDENTIALS",
  );
});

test("login opens a session that /me reports", async () => {
  owner = await login(admin.identity, admin.password);
  const me = await expectCode(await owner.get(`${base}/me`), 200, "AUTH_AUTHENTICATED");
  expect(me.data).toMatchObject({ alias: "E2EAdmin", email_1: admin.identity });
  ownerId = me.data.id_admin_acct;
});

test("select endpoints list the references a new account needs", async () => {
  const companies = await expectCode(await owner.get(`${base}/select/company`), 200);
  expect(companies.data[0]).toMatchObject({ label: "MATEX E2E", data: { alias: "E2E" } });
  const company = companies.data[0].value as string;

  for (const kind of ["office", "chair", "access"]) {
    await expectCode(
      await owner.get(`${base}/select/${kind}`),
      400,
      "ADMIN_ACCOUNT_COMPANY_REQUIRED",
    );
    await expectCode(
      await owner.get(`${base}/select/${kind}`, { params: { id_master_comp: "not-a-hash" } }),
      400,
      "ADMIN_ACCOUNT_COMPANY_INVALID_ID",
    );
  }

  const pick = async (kind: string) => {
    const body = await expectCode(
      await owner.get(`${base}/select/${kind}`, { params: { id_master_comp: company } }),
      200,
    );
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination).toMatchObject({ page: 1, has_more: false });
    return body.data[0].value as string;
  };
  reference = {
    id_master_comp: company,
    id_office: await pick("office"),
    id_chair: await pick("chair"),
    id_access: await pick("access"),
  };
});

test("create validates input", async () => {
  const valid = { ...newAccount, ...reference, is_all_access: 0 };
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ ...valid, phone_1: "" }, "ADMIN_ACCOUNT_REQUIRED_FIELDS_MISSING"],
    [{ ...valid, name: "Name 123" }, "ADMIN_ACCOUNT_NAME_INVALID"],
    [{ ...valid, alias: "with space" }, "ADMIN_ACCOUNT_ALIAS_INVALID"],
    [{ ...valid, email_1: "not-an-email" }, "ADMIN_ACCOUNT_EMAIL_INVALID"],
    [{ ...valid, phone_1: "08123" }, "ADMIN_ACCOUNT_PHONE_INVALID"],
    [{ ...valid, password: "onlyletters" }, "ADMIN_ACCOUNT_PASSWORD_INVALID"],
    [{ ...valid, id_office: "not-a-hash" }, "ADMIN_ACCOUNT_REFERENCE_INVALID"],
  ];
  for (const [data, code] of cases) {
    await expectCode(await owner.post(base, { data }), 400, code);
  }
});

test("create, then list and read the new account", async () => {
  const created = await expectCode(
    await owner.post(base, { data: { ...newAccount, ...reference, is_all_access: 0 } }),
    201,
    "ADMIN_ACCOUNT_CREATED",
  );
  createdId = created.data.id_admin_acct;
  expect(createdId).toBeTruthy();

  await expectCode(
    await owner.post(base, {
      data: { ...newAccount, ...reference, is_all_access: 0, email_1: `other.${newAccount.email_1}` },
    }),
    409,
    "ADMIN_ACCOUNT_ALIAS_EXISTS",
  );

  const list = await expectCode(await owner.get(base, { params: { search: newAccount.alias } }), 200);
  expect(list.pagination).toMatchObject({ total: 1, page: 1, length: 1 });
  expect(list.data[0]).toMatchObject({
    id_admin_acct: createdId,
    alias: newAccount.alias,
    status_label: "Active",
    admin_acct_status: 1,
  });
  expect(list.data[0]).not.toHaveProperty("password");

  const detail = await expectCode(await owner.get(`${base}/${createdId}`), 200);
  expect(detail.data).toMatchObject({
    id_admin_acct: createdId,
    name: newAccount.name,
    email_1: newAccount.email_1,
  });
  expect(JSON.stringify(detail.data)).not.toMatch(/"password"/);

  await expectCode(await owner.get(`${base}/not-a-hash`), 400, "ADMIN_ACCOUNT_INVALID_ID");
});

test("update changes the account", async () => {
  const data = {
    ...newAccount,
    ...reference,
    name: "Akun Uji Kontrak Diubah",
    is_all_access: 0,
  };
  await expectCode(
    await owner.put(`${base}/${createdId}`, { data: { ...data, email_1: "" } }),
    400,
    "ADMIN_ACCOUNT_REQUIRED_FIELDS_MISSING",
  );
  await expectCode(await owner.put(`${base}/${createdId}`, { data }), 200, "ADMIN_ACCOUNT_UPDATED");
  const detail = await expectCode(await owner.get(`${base}/${createdId}`), 200);
  expect(detail.data.name).toBe("Akun Uji Kontrak Diubah");
});

test("an account without admin-account permissions can use /me but not the account list", async () => {
  const limited = await login(newAccount.email_1, newAccount.password);
  try {
    // /me and /select/* are registered before /:id; if that order breaks, /me hits the
    // permission-guarded detail route instead.
    const me = await expectCode(await limited.get(`${base}/me`), 200, "AUTH_AUTHENTICATED");
    expect(me.data.id_admin_acct).toBe(createdId);
    await expectCode(await limited.get(`${base}/select/company`), 200);
    await expectCode(await limited.get(base), 403, "AUTH_PERMISSION_DENIED");
    await expectCode(await limited.get(`${base}/${createdId}`), 403, "AUTH_PERMISSION_DENIED");
    await expectCode(await limited.post(base, { data: {} }), 403, "AUTH_PERMISSION_DENIED");
  } finally {
    await limited.dispose();
  }
});

test("status and delete enforce their safety rules", async () => {
  await expectCode(
    await owner.patch(`${base}/${createdId}/status`, { data: { admin_acct_status: 2 } }),
    400,
    "ADMIN_ACCOUNT_INVALID_STATUS",
  );
  await expectCode(
    await owner.patch(`${base}/${ownerId}/status`, { data: { admin_acct_status: 0 } }),
    403,
    "ADMIN_ACCOUNT_SELF_DEACTIVATION_FORBIDDEN",
  );
  await expectCode(await owner.delete(`${base}/${ownerId}`), 403, "ADMIN_ACCOUNT_SELF_DELETE_FORBIDDEN");
  await expectCode(await owner.delete(`${base}/${createdId}`), 409, "ADMIN_ACCOUNT_MUST_BE_INACTIVE");

  const deactivated = await expectCode(
    await owner.patch(`${base}/${createdId}/status`, { data: { admin_acct_status: 0 } }),
    200,
    "ADMIN_ACCOUNT_DEACTIVATED",
  );
  expect(deactivated.data).toEqual({ id_admin_acct: createdId, admin_acct_status: 0 });

  await expectCode(
    await anonymous.post(`${base}/login`, {
      data: { identity: newAccount.email_1, password: newAccount.password },
    }),
    403,
    "AUTH_ACCOUNT_INACTIVE",
  );

  await expectCode(await owner.delete(`${base}/${createdId}`), 200, "ADMIN_ACCOUNT_DELETED");
  await expectCode(await owner.get(`${base}/${createdId}`), 404, "ADMIN_ACCOUNT_NOT_FOUND");
  const list = await expectCode(await owner.get(base, { params: { search: newAccount.alias } }), 200);
  expect(list.pagination).toMatchObject({ total: 0 });
});

test("logout ends the session", async () => {
  await expectCode(await owner.post(`${base}/logout`), 200, "AUTH_LOGOUT_SUCCESS");
  await expectCode(await owner.get(`${base}/me`), 401, "AUTH_TOKEN_REQUIRED");
});
