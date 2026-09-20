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
