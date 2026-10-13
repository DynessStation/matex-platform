import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

import { environment } from '../../../environments/environment';

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

  const configuredOrigin =
    typeof process !== 'undefined' ? process.env['MATEX_API_INTERNAL_URL'] : undefined;
  let internalApiOrigin = 'http://127.0.0.1:9200';
  try {
    internalApiOrigin = new URL(configuredOrigin || internalApiOrigin).origin;
  } catch {
    // Keep the loopback-only production default when the runtime value is invalid.
  }

  if (request.url.startsWith(publicApi.href)) {
    const internalUrl = `${internalApiOrigin}${requestUrl.pathname}${requestUrl.search}`;
    return next(request.clone({ url: internalUrl }));
  }

  const publicSiteHost = new URL(environment.publicSiteURL).host;
  if (requestUrl.host !== publicSiteHost || !requestUrl.pathname.startsWith('/assets/')) {
    return next(request);
  }

  const configuredPublicOrigin =
    typeof process !== 'undefined' ? process.env['MATEX_PUBLIC_INTERNAL_URL'] : undefined;
  const defaultPort = typeof process !== 'undefined' ? process.env['PORT'] || '4201' : '4201';
  let internalPublicOrigin = `http://127.0.0.1:${defaultPort}`;
  try {
    internalPublicOrigin = new URL(configuredPublicOrigin || internalPublicOrigin).origin;
  } catch {
    // Keep the loopback-only production default when the runtime value is invalid.
  }

  const internalUrl = `${internalPublicOrigin}${requestUrl.pathname}${requestUrl.search}`;
  return next(request.clone({ url: internalUrl }));
};
