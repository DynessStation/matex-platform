import { join } from 'node:path';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

import express from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const internalApiOrigin = (() => {
  try {
    return new URL(process.env['MATEX_API_INTERNAL_URL'] || 'http://127.0.0.1:9200').origin;
  } catch {
    return 'http://127.0.0.1:9200';
  }
})();

const internalPublicOrigin = (() => {
  try {
    return new URL(
      process.env['MATEX_PUBLIC_INTERNAL_URL'] ||
        `http://127.0.0.1:${Number(process.env['PORT']) || 4201}`,
    ).origin;
  } catch {
    return `http://127.0.0.1:${Number(process.env['PORT']) || 4201}`;
  }
})();

app.get('/health/ssr', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'matex-public-ssr',
    uptime_seconds: Math.floor(process.uptime()),
  });
});

app.get(['/robots.txt', '/sitemap.xml'], async (req, res) => {
  try {
    const upstream = await fetch(`${internalApiOrigin}${req.path}`, {
      signal: AbortSignal.timeout(5_000),
    });
    res.status(upstream.status);
    for (const header of ['cache-control', 'content-type'] as const) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    res.send(await upstream.text());
  } catch (error) {
    console.error(`SEO endpoint proxy failed for ${req.path}`, error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).type('text/plain').send('SEO endpoint is temporarily unavailable');
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) return next();

      const redirectLocation = response.headers.get('location');
      if (response.status === 404 && redirectLocation === '/404' && req.path !== '/404') {
        const notFoundPage = await fetch(`${internalPublicOrigin}/404`, {
          headers: req.headers.host ? { host: req.headers.host } : undefined,
          signal: AbortSignal.timeout(10_000),
        });
        const headers = new Headers(notFoundPage.headers);
        headers.delete('location');
        headers.set('Cache-Control', 'no-store');
        response = new Response(await notFoundPage.text(), {
          status: 404,
          statusText: 'Not Found',
          headers,
        });
      }

      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 4201;
  app.listen(port, '127.0.0.1', (error) => {
    if (error) {
      throw error;
    }

    process.stdout.write(`Node Express server listening on http://localhost:${port}\n`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
