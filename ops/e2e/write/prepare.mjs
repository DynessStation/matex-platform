// Rebuilds the throwaway e2e database and storage before the write-flow tests run.
//
//   1. Drop and recreate the e2e database (name must end with _e2e).
//   2. Apply every migration (backend/scripts/migrate.cjs).
//   3. Create the first admin (backend/scripts/create-first-admin.cjs) with a random password;
//      it also seeds the default website content (pages, images, navigation, FAQs).
//   4. Write the generated credentials to a git-ignored state file for the tests.
//
// Database host/port/user/password come from backend/.env; only the database name differs.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { assertSafeStack, backendRoot, stack } from './stack.mjs';

assertSafeStack();

const backendRequire = createRequire(path.join(backendRoot, 'package.json'));
const dotenv = backendRequire('dotenv');
const mysql = backendRequire('mysql2/promise');

const env = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env')));
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER,
  password: env.DB_PASS || '',
});
try {
  await connection.query(`DROP DATABASE IF EXISTS \`${stack.databaseName}\``);
  await connection.query(
    `CREATE DATABASE \`${stack.databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
} finally {
  await connection.end();
}

// Fresh storage first: creating the first admin also copies the default website images into it.
fs.rmSync(stack.storageRoot, { recursive: true, force: true });
fs.mkdirSync(stack.storageRoot, { recursive: true });

const childEnv = {
  ...process.env,
  DB_NAME: stack.databaseName,
  FILE_STORAGE_ROOT: stack.storageRoot,
};

// Call the backend scripts directly with Node (no shell), so arguments with spaces stay intact.
function run(script, args = [], input) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: backendRoot,
    env: childEnv,
    input,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

run('scripts/migrate.cjs');

const admin = {
  identity: 'e2e.admin@example.invalid',
  password: `E2e-${randomBytes(12).toString('base64url')}9`,
};
run(
  'scripts/create-first-admin.cjs',
  [
    '--name',
    'Penguji Otomatis',
    '--alias',
    'E2EAdmin',
    '--email',
    admin.identity,
    '--phone',
    '+628100000099',
    '--company-name',
    'MATEX E2E',
    '--company-alias',
    'E2E',
  ],
  `${admin.password}\n${admin.password}\n`,
);

fs.writeFileSync(stack.stateFile, JSON.stringify({ admin }, null, 2), { mode: 0o600 });
console.log(`Prepared ${stack.databaseName} and ${stack.storageRoot}.`);
