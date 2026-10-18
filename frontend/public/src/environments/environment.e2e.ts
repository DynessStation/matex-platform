// Isolated stack for the write-flow browser tests (ops/e2e/playwright.write.config.ts).
export const environment = {
  production: false,
  baseURL: 'http://localhost:4301',
  URL: 'http://localhost:4301/assets/data',
  publicApiURL: 'http://localhost:3100/api/public',
  publicSiteURL: 'http://localhost:4301',
};
