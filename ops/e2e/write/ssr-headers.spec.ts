import { expect, test } from '@playwright/test';

import { stack } from './stack.mjs';

// The admin and public SSR servers (frontend/*/server.ts) do not announce Express (SEC-007).
test('the SSR servers do not announce Express', async ({ request }) => {
  for (const url of [
    `${stack.publicOrigin}/`,
    `${stack.publicOrigin}/produk/tidak-ada-sec-007`,
    `${stack.adminOrigin}/auth/login`,
  ]) {
    const response = await request.get(url);
    expect(response.status(), url).toBeLessThan(500);
    expect(response.headers()['x-powered-by'], url).toBeUndefined();
  }
});
