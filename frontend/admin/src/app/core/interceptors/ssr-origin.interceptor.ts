import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

import { environment } from '../../../environments/environment';
import { resolveInternalOrigin } from '../utils/ssr-internal-origin';

export const ssrOriginInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) return next(request);

  let requestUrl: URL;
  const adminOrigin = new URL(environment.API_URL).origin;
  try {
    requestUrl = new URL(request.url, `${adminOrigin}/`);
  } catch {
    return next(request);
  }

  if (requestUrl.origin !== adminOrigin) return next(request);

  if (requestUrl.pathname.startsWith('/api/')) {
    const internalApiOrigin = resolveInternalOrigin(
      'MATEX_API_INTERNAL_URL',
      'http://127.0.0.1:9200',
      environment.API_URL,
    );
    return next(
      request.clone({
        url: `${internalApiOrigin}${requestUrl.pathname}${requestUrl.search}`,
      }),
    );
  }

  if (!requestUrl.pathname.startsWith('/assets/')) return next(request);

  const defaultPort =
    typeof process !== 'undefined' ? process.env['PORT'] || '4200' : '4200';
  const internalAdminOrigin = resolveInternalOrigin(
    'MATEX_ADMIN_INTERNAL_URL',
    `http://127.0.0.1:${defaultPort}`,
    environment.URL,
  );
  return next(
    request.clone({
      url: `${internalAdminOrigin}${requestUrl.pathname}${requestUrl.search}`,
    }),
  );
};
