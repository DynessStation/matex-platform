import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

import { environment } from '../../../environments/environment';
import { resolveInternalOrigin } from '../utils/ssr-internal-origin';

export const ssrApiOriginInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) return next(request);

  let requestUrl: URL;
  let publicApi: URL;
  try {
    requestUrl = new URL(request.url, environment.publicSiteURL);
    publicApi = new URL(environment.publicApiURL);
  } catch {
    return next(request);
  }

  const internalApiOrigin = resolveInternalOrigin(
    'MATEX_API_INTERNAL_URL',
    'http://127.0.0.1:9200',
    environment.publicApiURL,
  );

  if (request.url.startsWith(publicApi.href)) {
    const internalUrl = `${internalApiOrigin}${requestUrl.pathname}${requestUrl.search}`;
    return next(request.clone({ url: internalUrl }));
  }

  const publicSiteHost = new URL(environment.publicSiteURL).host;
  if (requestUrl.host !== publicSiteHost || !requestUrl.pathname.startsWith('/assets/')) {
    return next(request);
  }

  const defaultPort = typeof process !== 'undefined' ? process.env['PORT'] || '4201' : '4201';
  const internalPublicOrigin = resolveInternalOrigin(
    'MATEX_PUBLIC_INTERNAL_URL',
    `http://127.0.0.1:${defaultPort}`,
    environment.publicSiteURL,
  );

  const internalUrl = `${internalPublicOrigin}${requestUrl.pathname}${requestUrl.search}`;
  return next(request.clone({ url: internalUrl }));
};
