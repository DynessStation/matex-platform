import { environment } from '../../../environments/environment';

/**
 * Resolves the loopback origin that server-side rendering uses to reach a MATEX service.
 *
 * A runtime value (set by PM2 in production) always wins. Without one, production builds keep
 * their production loopback default, while development builds reuse the origin from the
 * development environment so `npm start` works without extra variables.
 */
export function resolveInternalOrigin(
  envName: string,
  productionFallback: string,
  developmentFallback: string,
): string {
  const configured = typeof process !== 'undefined' ? process.env[envName] : undefined;
  const fallback = environment.production ? productionFallback : developmentFallback;

  for (const candidate of [configured, fallback]) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      // Ignore an invalid value and try the next candidate.
    }
  }

  return new URL(productionFallback).origin;
}
