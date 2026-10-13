const apiOrigin = normalizeOrigin(
  process.env.MATEX_API_ORIGIN || "http://127.0.0.1:9200",
  "MATEX_API_ORIGIN",
);
const publicOrigin = normalizeOrigin(
  process.env.MATEX_PUBLIC_ORIGIN || "http://127.0.0.1:9201",
  "MATEX_PUBLIC_ORIGIN",
);
const adminOrigin = normalizeOrigin(
  process.env.MATEX_ADMIN_ORIGIN || "http://127.0.0.1:9202",
  "MATEX_ADMIN_ORIGIN",
);
const expectedPublicOrigin = normalizeOrigin(
  process.env.MATEX_EXPECTED_PUBLIC_ORIGIN || publicOrigin,
  "MATEX_EXPECTED_PUBLIC_ORIGIN",
);

const timeoutMs = positiveInteger(process.env.MATEX_SMOKE_TIMEOUT_MS, 15_000);
const failures = [];
const passes = [];

function normalizeOrigin(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }

  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/") {
    throw new Error(`${name} must contain only an HTTP(S) origin without a path`);
  }
  return url.origin;
}

function positiveInteger(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("MATEX_SMOKE_TIMEOUT_MS must be a positive integer");
  }
  return parsed;
}

async function request(path, origin, accept = "text/html") {
  const url = new URL(path, `${origin}/`);
  const response = await fetch(url, {
    headers: { accept },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  return { body, response, url };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectStatus(result, expected) {
  expect(
    result.response.status === expected,
    `${result.url} returned HTTP ${result.response.status}; expected ${expected}`,
  );
}

function expectHtml(result) {
  expect(
    result.response.headers.get("content-type")?.includes("text/html"),
    `${result.url} did not return HTML`,
  );
  expect(/<!doctype html>/i.test(result.body), `${result.url} returned incomplete HTML`);
}

function expectNoLegacyBranding(result) {
  expect(!/kartify/i.test(result.body), `${result.url} still exposes Kartify branding`);
}

function canonicalHref(html) {
  const match = html.match(
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i,
  );
  return match?.[1] || null;
}

function alternateHref(html, hreflang) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1];
    const language = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (rel?.toLowerCase() === "alternate" && language === hreflang) return href || null;
  }
  return null;
}

function publicUrl(path) {
  return new URL(path, `${expectedPublicOrigin}/`).href;
}

async function check(name, action) {
  try {
    await action();
    passes.push(name);
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failures.push({ name, message: error instanceof Error ? error.message : String(error) });
    process.stderr.write(`FAIL ${name}: ${failures.at(-1).message}\n`);
  }
}

async function checkJsonHealth(name, origin, path, service, status) {
  await check(name, async () => {
    const result = await request(path, origin, "application/json");
    expectStatus(result, 200);
    let payload;
    try {
      payload = JSON.parse(result.body);
    } catch {
      throw new Error(`${result.url} returned invalid JSON`);
    }
    expect(payload.service === service, `${result.url} reported service ${payload.service}`);
    expect(payload.status === status, `${result.url} reported status ${payload.status}`);
  });
}

async function checkFirstAsset(html) {
  const asset =
    html.match(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1] ||
    html.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i)?.[1];
  expect(asset, "public home did not expose a script or stylesheet asset");
  const assetUrl = new URL(asset, `${publicOrigin}/`);
  const response = await fetch(assetUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  expect(response.ok, `${assetUrl} returned HTTP ${response.status}`);
  expect(
    response.headers.get("cache-control")?.includes("max-age"),
    `${assetUrl} is missing a static cache policy`,
  );
}

async function checkPublicDocument(name, path, idPath, englishPath) {
  await check(name, async () => {
    const result = await request(path, publicOrigin);
    expectStatus(result, 200);
    expectHtml(result);
    expectNoLegacyBranding(result);
    expect(
      canonicalHref(result.body) === publicUrl(path),
      `${result.url} canonical was ${canonicalHref(result.body) || "missing"}`,
    );
    for (const [language, expectedPath] of [
      ["id-ID", idPath],
      ["en-US", englishPath],
      ["x-default", idPath],
    ]) {
      expect(
        alternateHref(result.body, language) === publicUrl(expectedPath),
        `${result.url} ${language} alternate was ${alternateHref(result.body, language) || "missing"}`,
      );
    }
  });
}

async function main() {
  process.stdout.write(
    `MATEX preflight\nAPI: ${apiOrigin}\nPublic: ${publicOrigin}\nAdmin: ${adminOrigin}\nCanonical: ${expectedPublicOrigin}\n\n`,
  );

  await checkJsonHealth("API live", apiOrigin, "/health/live", "matex-api", "ok");
  await checkJsonHealth("API ready", apiOrigin, "/health/ready", "matex-api", "ready");
  await checkJsonHealth(
    "Public SSR health",
    publicOrigin,
    "/health/ssr",
    "matex-public-ssr",
    "ok",
  );
  await checkJsonHealth(
    "Admin SSR health",
    adminOrigin,
    "/health/ssr",
    "matex-admin-ssr",
    "ok",
  );

  const pagePairs = [
    ["Home ID", "/", "/", "/en"],
    ["Home EN", "/en", "/", "/en"],
    ["Catalog ID", "/katalog", "/katalog", "/en/catalog"],
    ["Catalog EN", "/en/catalog", "/katalog", "/en/catalog"],
    ["Articles ID", "/artikel", "/artikel", "/en/articles"],
    ["Articles EN", "/en/articles", "/artikel", "/en/articles"],
    ["FAQ ID", "/faq", "/faq", "/en/faq"],
    ["FAQ EN", "/en/faq", "/faq", "/en/faq"],
    ["Contact ID", "/kontak", "/kontak", "/en/contact-us"],
    ["Contact EN", "/en/contact-us", "/kontak", "/en/contact-us"],
    ["About ID", "/tentang-matex", "/tentang-matex", "/en/about-matex"],
    ["About EN", "/en/about-matex", "/tentang-matex", "/en/about-matex"],
    [
      "Terms ID",
      "/syarat-ketentuan",
      "/syarat-ketentuan",
      "/en/terms-and-conditions",
    ],
    [
      "Terms EN",
      "/en/terms-and-conditions",
      "/syarat-ketentuan",
      "/en/terms-and-conditions",
    ],
  ];
  for (const [name, path, idPath, englishPath] of pagePairs) {
    await checkPublicDocument(`Public ${name}`, path, idPath, englishPath);
  }

  await check("Public static asset", async () => {
    const result = await request("/", publicOrigin);
    expectHtml(result);
    await checkFirstAsset(result.body);
  });

  await check("Public robots", async () => {
    const result = await request("/robots.txt", publicOrigin, "text/plain");
    expectStatus(result, 200);
    expect(/^user-agent:/im.test(result.body), `${result.url} has no User-agent directive`);
    expect(
      result.body.includes(`${expectedPublicOrigin}/sitemap.xml`),
      `${result.url} does not advertise the expected sitemap`,
    );
  });

  await check("Public sitemap", async () => {
    const result = await request("/sitemap.xml", publicOrigin, "application/xml");
    expectStatus(result, 200);
    expect(/<(urlset|sitemapindex)\b/i.test(result.body), `${result.url} is not a sitemap`);
  });

  await check("Public 404 SSR", async () => {
    const result = await request("/__matex_release_smoke_not_found__", publicOrigin);
    expectStatus(result, 404);
    expectHtml(result);
    expectNoLegacyBranding(result);
    expect(/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(result.body), `${result.url} is missing noindex`);
    expect(canonicalHref(result.body) === null, `${result.url} must not expose a canonical URL`);
  });

  await check("Admin login SSR", async () => {
    const result = await request("/auth/login", adminOrigin);
    expectStatus(result, 200);
    expectHtml(result);
    expectNoLegacyBranding(result);
  });

  process.stdout.write(`\n${passes.length} passed, ${failures.length} failed\n`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Preflight setup failed: ${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
