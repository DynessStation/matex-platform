import { NextFunction, Response } from "express";

import { randomUUID } from "crypto";

import { AuthRequest } from "./authJwt";

//==================================================
//==== REQUEST CONTEXT
//==================================================

export interface RequestAuditContext {
  requestId: string;

  correlationId: string;

  startedAt: number;

  source: string;
}

//==================================================
//==== REQUEST
//==================================================

export interface AuditRequest extends AuthRequest {
  auditContext?: RequestAuditContext;
}

//==================================================
//==== VALID CORRELATION ID
//==================================================

const getCorrelationId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  if (!cleanValue || cleanValue.length > 64) {
    return null;
  }

  /**
   * Current accepted format:
   * UUID.
   *
   * Kalau nanti microservice/integration butuh
   * format correlation lain, baru kita perluas.
   */
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(cleanValue) ? cleanValue : null;
};

//==================================================
//==== MIDDLEWARE
//==================================================

export const requestContextMiddleware = (
  req: AuditRequest,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = randomUUID();

  const incomingCorrelationId = getCorrelationId(
    req.header("x-correlation-id"),
  );

  const correlationId = incomingCorrelationId ?? requestId;

  req.auditContext = {
    requestId,

    correlationId,

    startedAt: Date.now(),

    source: "admin_web",
  };

  res.setHeader("X-Request-ID", requestId);

  res.setHeader("X-Correlation-ID", correlationId);

  next();
};
