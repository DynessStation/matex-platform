import { NextFunction, Request, Response } from 'express';

import { sendError } from '../helper/api-response.helper';
import { isHttpError } from '../helper/http-error.helper';

interface RouteFailure {
  code: string;
  message: string;
  /** Answer for MySQL duplicate-key errors (ER_DUP_ENTRY), as 409. */
  duplicate?: { code: string; message: string };
}

/**
 * Route-level failure response: unexpected errors after this middleware are answered with
 * this 500 code and message instead of INTERNAL_SERVER_ERROR (and duplicate-key errors with
 * the optional 409). Use it where a module's API defines its own failure codes.
 */
export const onFailure =
  (code: string, message: string, options: Pick<RouteFailure, 'duplicate'> = {}) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.locals.failure = { code, message, ...options } satisfies RouteFailure;
    next();
  };

// Last Express error handler: an HttpError becomes its own response; anything else is logged
// and answered with the route's failure code (see onFailure) or a generic 500.
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (isHttpError(error)) {
    if (!res.headersSent) sendError(res, error.status, error.code, error.message, error.data);
    return;
  }

  const failure = res.locals?.failure as RouteFailure | undefined;

  if (failure?.duplicate && (error as { code?: unknown })?.code === 'ER_DUP_ENTRY') {
    if (!res.headersSent) sendError(res, 409, failure.duplicate.code, failure.duplicate.message);
    return;
  }

  console.error(failure ? `[API] ${failure.code}` : '[API] Unhandled request error', error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    code: failure?.code ?? 'INTERNAL_SERVER_ERROR',
    message: failure?.message ?? 'Internal Server Error',
  });
};
