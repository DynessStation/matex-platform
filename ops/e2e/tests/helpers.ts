export function normalizeOrigin(value: string | undefined, fallback: string): string {
  const parsed = new URL(value || fallback);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/') {
    throw new Error(`Invalid origin: ${value || fallback}`);
  }
  return parsed.origin;
}

export const publicOrigin = normalizeOrigin(
  process.env.MATEX_PUBLIC_ORIGIN,
  'http://127.0.0.1:9201',
);

export const adminOrigin = normalizeOrigin(process.env.MATEX_ADMIN_ORIGIN, 'http://127.0.0.1:9202');

export const expectedPublicOrigin = normalizeOrigin(
  process.env.MATEX_EXPECTED_PUBLIC_ORIGIN,
  'https://matexindo.com',
);

export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, `${origin}/`).href;
}

export async function expectNoLegacyBranding(bodyText: string): Promise<void> {
  const lowered = bodyText.toLowerCase();
  if (lowered.includes('kartify') || lowered.includes('pixelstrap')) {
    throw new Error('Page still exposes Kartify or Pixelstrap branding');
  }
}
