import { defineConfig } from "@playwright/test";

import { assertSafeStack } from "./write/stack.mjs";
import { apiServer } from "./write/servers";

// API contract specs (write/*-api.spec.ts) against the isolated e2e API only, without
// building the frontends. Start it with `npm run test:api`, which rebuilds the e2e database
// first. The same specs also run as part of `npm run test:write`.
assertSafeStack();

export default defineConfig({
  testDir: "./write",
  testMatch: "*-api.spec.ts",
  globalTeardown: "./write/teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  outputDir: "test-results-api",
  webServer: [apiServer],
});
