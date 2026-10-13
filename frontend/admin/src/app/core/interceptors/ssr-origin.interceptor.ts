import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

import { environment } from '../../../environments/environment';

function safeOrigin(value: string | undefined, fallback: string): string {
  try {
    return new URL(value || fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

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
    const configuredApiOrigin =
      typeof process !== 'undefined'
        ? process.env['MATEX_API_INTERNAL_URL']
        : undefined;
    const internalApiOrigin = safeOrigin(
      configuredApiOrigin,
      'http://127.0.0.1:9200',
    );
    return next(
      request.clone({
        url: `${internalApiOrigin}${requestUrl.pathname}${requestUrl.search}`,
      }),
    );
  }

  if (!requestUrl.pathname.startsWith('/assets/')) return next(request);

  const configuredAdminOrigin =
    typeof process !== 'undefined'
      ? process.env['MATEX_ADMIN_INTERNAL_URL']
      : undefined;
  const defaultPort =
    typeof process !== 'undefined' ? process.env['PORT'] || '4200' : '4200';
  const internalAdminOrigin = safeOrigin(
    configuredAdminOrigin,
    `http://127.0.0.1:${defaultPort}`,
  );
  return next(
    request.clone({
      url: `${internalAdminOrigin}${requestUrl.pathname}${requestUrl.search}`,
    }),
  );
};
