import fs from 'node:fs';

import { stack } from './stack.mjs';

// Remove the generated credentials and uploaded test files. The e2e database is
// kept so a failed run can be inspected; the next run recreates it anyway.
export default function globalTeardown(): void {
  // With MATEX_E2E_REUSE=1 the developer owns the running stack; keep its files.
  if (process.env.MATEX_E2E_REUSE === '1') return;
  fs.rmSync(stack.stateFile, { force: true });
  fs.rmSync(stack.storageRoot, { recursive: true, force: true });
}
