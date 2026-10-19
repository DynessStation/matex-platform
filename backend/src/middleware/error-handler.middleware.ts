import { NextFunction, Request, Response } from 'express';

import { sendError } from '../helper/api-response.helper';
import { isHttpError } from '../helper/http-error.helper';

// Last Express error handler: an HttpError becomes its own response; anything else is logged
// and answered with a generic 500.
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

  console.error('[API] Unhandled request error', error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error',
  });
};
