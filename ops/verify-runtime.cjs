const { setTimeout: wait } = require("node:timers/promises");

const checks = [
  {
    name: "API live",
    url: "http://127.0.0.1:9200/health/live",
    expectedService: "matex-api",
    expectedStatus: "ok",
  },
  {
    name: "API ready",
    url: "http://127.0.0.1:9200/health/ready",
    expectedService: "matex-api",
    expectedStatus: "ready",
  },
  {
    name: "Public SSR",
    url: "http://127.0.0.1:9201/health/ssr",
    expectedService: "matex-public-ssr",
    expectedStatus: "ok",
  },
  {
    name: "Admin SSR",
    url: "http://127.0.0.1:9202/health/ssr",
    expectedService: "matex-admin-ssr",
    expectedStatus: "ok",
  },
];

const attempts = 10;
const delayMs = 2000;

async function checkService(check) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(check.url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (
        body.service !== check.expectedService ||
        body.status !== check.expectedStatus
      ) {
        throw new Error(`unexpected payload ${JSON.stringify(body)}`);
      }
      process.stdout.write(`PASS ${check.name}: ${check.url}\n`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(delayMs);
    }
  }

  throw new Error(
    `${check.name} failed: ${lastError?.message || "unknown error"}`,
  );
}

async function main() {
  const results = await Promise.allSettled(checks.map(checkService));
  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) {
    process.stderr.write(`FAIL ${failure.reason.message}\n`);
  }
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Runtime verification failed: ${error.message}\n`);
  process.exitCode = 1;
});
