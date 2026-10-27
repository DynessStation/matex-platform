import { Response } from 'express';

import type { ListMeta } from './list-query.helper';

// API response

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  meta?: unknown;
}

// Success response

export const sendSuccess = <T = unknown>(
  res: Response,
  status: number,
  code: string,
  message: string,
  data?: T,
) => {
  const response: ApiResponse<T> = {
    success: true,
    code,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(status).json(response);
};

// List response (A-2): the items in `data`, the paging and counts in `meta` (see pageMeta()).

export const sendList = <T>(
  res: Response,
  code: string,
  message: string,
  data: T[],
  meta: ListMeta,
) => {
  const response: ApiResponse<T[]> = { success: true, code, message, data, meta };
  return res.status(200).json(response);
};

// Error response

export const sendError = <T = unknown>(
  res: Response,
  status: number,
  code: string,
  message: string,
  data?: T,
) => {
  const response: ApiResponse<T> = {
    success: false,
    code,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(status).json(response);
};
