import { HttpErrorResponse } from '@angular/common/http';

//==================================================
//==== RESOLVE DETAIL ERROR STATUS
//==================================================

export function resolveDetailErrorStatus(
  error: unknown,

  invalidIdCodes: readonly string[] = [],
): number {
  if (!(error instanceof HttpErrorResponse)) {
    return 0;
  }

  const code =
    typeof error.error?.code === 'string' ? error.error.code.trim() : '';

  //==================================================
  //==== NOT FOUND / INVALID ROUTE ID
  //==================================================

  if (error.status === 404 || invalidIdCodes.includes(code)) {
    return 404;
  }

  //==================================================
  //==== FORBIDDEN
  //==================================================

  if (error.status === 403) {
    return 403;
  }

  //==================================================
  //==== GENERIC / NETWORK / SERVER
  //==================================================

  return error.status || 0;
}
