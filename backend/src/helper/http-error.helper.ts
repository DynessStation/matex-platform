// An expected request failure with an HTTP status and a response code, e.g.
// `throw new HttpError(404, 'OFFICE_NOT_FOUND', 'Office not found')`.
// The central error handler (middleware/error-handler.middleware.ts) answers it with sendError,
// and withTransaction() rolls back before it propagates. Express 5 forwards errors thrown in
// async handlers, so a handler can throw it at any depth.
export class HttpError<T = unknown> extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly data?: T,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;
