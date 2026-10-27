//==================================================
//==== API RESPONSE
//==================================================

export interface IApiResponse<T = unknown> {
  success: boolean;

  code: string;

  message: string;

  data?: T;

  meta?: unknown;
}

/** What an HTTP call rejects with: the API body sits under `error`. */
export interface IApiErrorResponse {
  status?: number;
  error?: {
    code?: string;
    message?: string;
    data?: Record<string, unknown> | null;
  } | null;
}
