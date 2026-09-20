import { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";

import { sendError } from "../../helper/api-response.helper";

import { writeAuditLog } from "../../helper/audit-log.helper";

//==================================================
//==== AUTH USER
//==================================================

export interface AuthUser extends jwt.JwtPayload {
  id_admin_acct?: number;

  alias?: string;

  id_access?: number;

  issued_at?: number | null;

  expires_at?: number | null;
}

//==================================================
//==== AUTH REQUEST
//==================================================

export interface AuthRequest extends Request {
  user?: AuthUser;
}

//==================================================
//==== VERIFY TOKEN
//==================================================

export const verifyToken = async (
  req: AuthRequest,

  res: Response,

  next: NextFunction,
): Promise<void> => {
  const token = req.cookies?.access_token;

  //==================================================
  //==== TOKEN REQUIRED
  //==================================================

  if (!token) {
    sendError(
      res,
      401,
      "AUTH_TOKEN_REQUIRED",
      "Authentication token is required",
    );

    return;
  }

  //==================================================
  //==== SECRET
  //==================================================

  const secretKey = process.env.JWT_SECRET;

  if (!secretKey) {
    console.error("JWT_SECRET is not configured");

    sendError(res, 500, "INTERNAL_SERVER_ERROR", "Internal Server Error");

    return;
  }

  //==================================================
  //==== VERIFY
  //==================================================

  let decoded: AuthUser;

  try {
    decoded = jwt.verify(token, secretKey) as AuthUser;
  } catch {
    //==================================================
    //==== INVALID / EXPIRED TOKEN
    //==== NORMAL AUTH FAILURE - NO AUDIT
    //==================================================

    sendError(
      res,
      401,
      "AUTH_TOKEN_INVALID_OR_EXPIRED",
      "Invalid or expired token",
    );

    return;
  }

  //==================================================
  //==== IDENTITY
  //==================================================

  const idAdminAcct = Number(decoded.id_admin_acct);

  if (!Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
    //==================================================
    //==== AUDIT ABNORMAL SIGNED TOKEN
    //==================================================

    await writeAuditLog({
      req,

      writeMode: "best_effort",

      eventCode: "auth.session.invalid",

      category: "security",

      module: "auth",

      action: "session",

      actorType: "admin",

      actorId: null,

      actorLabel: decoded.alias ?? null,

      entityType: "admin_account",

      entityId: null,

      entityLabel: decoded.alias ?? null,

      outcome: "denied",

      metadata: {
        reason: "invalid_token_identity",
      },

      httpStatus: 401,
    });

    sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");

    return;
  }

  //==================================================
  //==== REQUEST USER
  //==================================================

  req.user = {
    ...decoded,

    id_admin_acct: idAdminAcct,

    issued_at: decoded.iat ? decoded.iat * 1000 : null,

    expires_at: decoded.exp ? decoded.exp * 1000 : null,
  };

  next();
};
