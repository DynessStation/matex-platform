import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SSR_REQUEST } from '../tokens/ssr-request.token';

export const serverAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const serverRequest = inject(
    SSR_REQUEST,
    {
      optional: true,
    },
  );

  const cookie = serverRequest?.headers?.cookie;

  if (!cookie) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Cookie: cookie,
      },
    }),
  );
};