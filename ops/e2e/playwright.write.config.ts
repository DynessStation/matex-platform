import { defineConfig } from '@playwright/test';

import { assertSafeStack } from './write/stack.mjs';
import { adminServer, apiServer, publicServer } from './write/servers';

// Write-flow suite: runs against an isolated local stack only (see write/stack.mjs).
// Start it with `npm run test:write`, which rebuilds the e2e database first.
assertSafeStack();

const browserChannel = process.env.MATEX_E2E_BROWSER_CHANNEL || 'chrome';

export default defineConfig({
  testDir: './write',
  testMatch: '*.spec.ts',
  globalTeardown: './write/teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-write' }]],
  outputDir: 'test-results-write',
  use: {
    channel: browserChannel,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: [apiServer, adminServer, publicServer],
});
