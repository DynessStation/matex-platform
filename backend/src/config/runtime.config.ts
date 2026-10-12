const requiredProductionVariables = [
  "DB_HOST",
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "JWT_SECRET",
  "AUDIT_INTEGRITY_SECRET",
  "PUBLIC_COMPANY_ID",
  "CORS_ORIGINS",
] as const;

const localOriginPattern = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;

export const validateRuntimeConfig = (): void => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = requiredProductionVariables.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }

  const corsOrigins = process.env.CORS_ORIGINS ?? "";

  if (localOriginPattern.test(corsOrigins)) {
    throw new Error("CORS_ORIGINS must not contain localhost in production");
  }

  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  if (process.env.AUDIT_INTEGRITY_SECRET!.length < 32) {
    throw new Error(
      "AUDIT_INTEGRITY_SECRET must contain at least 32 characters in production",
    );
  }
};
