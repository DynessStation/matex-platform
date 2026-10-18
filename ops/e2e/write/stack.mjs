// Shared settings for the isolated write-flow test stack.
// Everything here is local-only: a dedicated database, temporary storage, and
// ports that do not collide with the normal dev servers (3000 / 4200 / 4201).
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const repoRoot = path.resolve(e2eRoot, "..", "..");
export const backendRoot = path.join(repoRoot, "backend");

export const stack = {
  databaseName: process.env.MATEX_E2E_DB_NAME || "matex_e2e",
  apiOrigin: "http://localhost:3100",
  adminOrigin: "http://localhost:4300",
  publicOrigin: "http://localhost:4301",
  storageRoot: path.join(os.tmpdir(), "matex-e2e-storage"),
  stateFile: path.join(e2eRoot, ".write-state.json"),
};

export function assertSafeStack() {
  if (!/^[a-z0-9_]+_e2e$/.test(stack.databaseName)) {
    throw new Error(`Refusing to run: database "${stack.databaseName}" must end with _e2e.`);
  }
  for (const origin of [stack.apiOrigin, stack.adminOrigin, stack.publicOrigin]) {
    const { hostname } = new URL(origin);
    if (!["localhost", "127.0.0.1"].includes(hostname)) {
      throw new Error(`Refusing to run: ${origin} is not a local address.`);
    }
  }
}
