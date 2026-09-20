import { Response } from "express";

//==================================================
//==== API RESPONSE
//==================================================

export interface ApiResponse<T = unknown> {
  success: boolean;

  code: string;

  message: string;

  data?: T;

  meta?: unknown;
}

//==================================================
//==== SUCCESS RESPONSE
//==================================================

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

//==================================================
//==== ERROR RESPONSE
//==================================================

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
