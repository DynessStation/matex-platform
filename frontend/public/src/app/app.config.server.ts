import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { resolveInternalOrigin } from './core/utils/ssr-internal-origin';
import { environment } from '../environments/environment';

// The server reaches the API and its own assets over loopback (ssr-api-origin.interceptor.ts),
// the browser over the public address. Data sent along with a page is stored under the address
// the browser will ask for; without this map the browser never finds it and fetches it again.
const transferCacheOrigins = (): Record<string, string> => {
  const publicApi = new URL(environment.publicApiURL).origin;
  const publicSite = new URL(environment.publicSiteURL).origin;
  const port = process.env['PORT'] || '4201';
  return {
    [resolveInternalOrigin('MATEX_API_INTERNAL_URL', 'http://127.0.0.1:9200', publicApi)]:
      publicApi,
    [resolveInternalOrigin('MATEX_PUBLIC_INTERNAL_URL', `http://127.0.0.1:${port}`, publicSite)]:
      publicSite,
  };
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP, useFactory: transferCacheOrigins },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
