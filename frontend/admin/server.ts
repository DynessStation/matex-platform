import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_BASE_HREF } from '@angular/common';
import { SSR_REQUEST } from './src/app/core/tokens/ssr-request.token';
import { CommonEngine } from '@angular/ssr/node';


import express from 'express';

import bootstrap from './src/main.server';
import 'dotenv/config';

const dbConfig = {
  host: process.env['DB_HOST'],
  user: process.env['DB_USER'],
  password: process.env['DB_PASS'],
  database: process.env['DB_NAME'],
  port: Number(process.env['DB_PORT'])
};

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine({
    allowedHosts: ['localhost', '127.0.0.1'],
  });

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get(
    '*.*',
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: 'index.html',
    }),
  );

  // All regular routes use the Angular engine
  server.get('*', (req, res, _next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
       providers: [
          {
            provide: APP_BASE_HREF,
            useValue: baseUrl,
          },
          {
            provide: SSR_REQUEST,
            useValue: {
              headers: {
                cookie: req.headers.cookie,
              },
            },
          },
        ],
      })
      .then(html => {
        res.send(html);
      })
      .catch(err => {
        console.error('SSR Render Error:', err);
        res.status(500).send('Internal Server Error');
      });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4200;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
