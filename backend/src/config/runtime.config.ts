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

  if (
    process.env.PUBLIC_ANALYTICS_ENABLED === "true" &&
    (process.env.ANALYTICS_HASH_SECRET?.length ?? 0) < 32
  ) {
    throw new Error(
      "ANALYTICS_HASH_SECRET must contain at least 32 characters when public analytics is enabled",
    );
  }

  const searchConsoleVariables = [
    "GOOGLE_SEARCH_CONSOLE_SITE_URL",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ] as const;
  const configuredSearchConsoleVariables = searchConsoleVariables.filter(
    (name) => process.env[name]?.trim(),
  );
  if (
    configuredSearchConsoleVariables.length > 0 &&
    configuredSearchConsoleVariables.length < searchConsoleVariables.length
  ) {
    const missingSearchConsoleVariables = searchConsoleVariables.filter(
      (name) => !process.env[name]?.trim(),
    );
    throw new Error(
      `Incomplete Search Console configuration: ${missingSearchConsoleVariables.join(", ")}`,
    );
  }

  if (
    process.env.GOOGLE_PAGESPEED_API_KEY?.trim() &&
    !process.env.PUBLIC_SITE_URL?.trim()
  ) {
    throw new Error(
      "PUBLIC_SITE_URL is required when GOOGLE_PAGESPEED_API_KEY is configured",
    );
  }
};
