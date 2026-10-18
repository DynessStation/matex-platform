import { defineConfig } from "@playwright/test";

import { assertSafeStack, repoRoot, stack } from "./write/stack.mjs";

// Write-flow suite: runs against an isolated local stack only (see write/stack.mjs).
// Start it with `npm run test:write`, which rebuilds the e2e database first.
assertSafeStack();

const browserChannel = process.env.MATEX_E2E_BROWSER_CHANNEL || "chrome";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
// Set MATEX_E2E_REUSE=1 to run against a stack you already started (faster while writing tests).
const reuseExistingServer = process.env.MATEX_E2E_REUSE === "1";

const apiEnvironment: Record<string, string> = {
  ...(process.env as Record<string, string>),
  NODE_ENV: "development",
  PORT: "3100",
  DB_NAME: stack.databaseName,
  STORAGE_DISK: "local",
  FILE_STORAGE_ROOT: stack.storageRoot,
  FILE_BASE_URL: `${stack.apiOrigin}/files`,
  FILE_SERVE_LOCAL: "true",
  CORS_ORIGINS: `${stack.adminOrigin},${stack.publicOrigin}`,
  PUBLIC_COMPANY_ID: "1",
  PUBLIC_SITE_URL: stack.publicOrigin,
  PUBLIC_ANALYTICS_ENABLED: "false",
  LOGIN_RATE_LIMIT_MAX: "1000",
  // Empty values stop dotenv from loading real third-party keys from backend/.env.
  OPENAI_API_KEY: "",
  SMTP_HOST: "",
  SMTP_USER: "",
  SMTP_PASS: "",
  GOOGLE_SEARCH_CONSOLE_SITE_URL: "",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "",
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "",
  GOOGLE_PAGESPEED_API_KEY: "",
};

export default defineConfig({
  testDir: "./write",
  testMatch: "*.spec.ts",
  globalTeardown: "./write/teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-write" }]],
  outputDir: "test-results-write",
  use: {
    channel: browserChannel,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  // The frontends run as production-style SSR builds (ng build + server.mjs), not `ng serve`,
  // so the tests exercise the same server code that runs in production.
  webServer: [
    {
      command: `${npm} start`,
      cwd: `${repoRoot}/backend`,
      url: "http://127.0.0.1:3100/health/ready",
      env: apiEnvironment,
      reuseExistingServer,
      timeout: 60_000,
    },
    {
      command: `${npx} ng build --configuration e2e && node dist/matex-admin-e2e/server/server.mjs`,
      cwd: `${repoRoot}/frontend/admin`,
      url: `${stack.adminOrigin}/auth/login`,
      env: { ...(process.env as Record<string, string>), PORT: "4300" },
      reuseExistingServer,
      timeout: 300_000,
    },
    {
      command: `${npx} ng build --configuration e2e && node dist/matex-public-e2e/server/server.mjs`,
      cwd: `${repoRoot}/frontend/public`,
      url: `${stack.publicOrigin}/`,
      env: { ...(process.env as Record<string, string>), PORT: "4301" },
      reuseExistingServer,
      timeout: 300_000,
    },
  ],
});
