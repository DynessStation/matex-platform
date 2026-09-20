//==================================================
//==== LIMITS
//==================================================

const MAX_DEPTH = 8;

const MAX_ARRAY_ITEMS = 100;

const MAX_OBJECT_KEYS = 200;

const MAX_STRING_LENGTH = 4000;

//==================================================
//==== REDACTED VALUE
//==================================================

const REDACTED = "[REDACTED]";

const TRUNCATED = "[TRUNCATED]";

//==================================================
//==== SENSITIVE KEYS
//==================================================

const sensitiveKeys = new Set([
  "password",
  "password_hash",
  "passwordhash",
  "confirm_password",
  "password_confirmation",

  "token",
  "access_token",
  "refresh_token",
  "reset_token",
  "verification_token",
  "bearer_token",

  "otp",
  "otp_code",

  "authorization",
  "cookie",
  "set_cookie",
  "set-cookie",

  "secret",
  "client_secret",

  "api_key",
  "apikey",
  "api_secret",

  "private_key",

  "card_number",
  "cardnumber",
  "cvv",
  "cvc",
  "pin",
]);

//==================================================
//==== NORMALIZE KEY
//==================================================

const normalizeKey = (key: string): string => {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
};

//==================================================
//==== SENSITIVE KEY
//==================================================

const isSensitiveKey = (key: string): boolean => {
  const normalized = normalizeKey(key);

  if (sensitiveKeys.has(normalized)) {
    return true;
  }

  /**
   * Defense-in-depth untuk variasi key
   * seperti stripe_secret_key,
   * customer_password_hash, dll.
   */
  return (
    normalized.includes("password") ||
    normalized.includes("access_token") ||
    normalized.includes("refresh_token") ||
    normalized.includes("client_secret") ||
    normalized.includes("api_secret") ||
    normalized.includes("private_key")
  );
};

//==================================================
//==== SANITIZE STRING
//==================================================

const sanitizeString = (value: string): string => {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return value.slice(0, MAX_STRING_LENGTH) + TRUNCATED;
};

//==================================================
//==== SANITIZE VALUE
//==================================================

const sanitizeValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_DEPTH) {
    return TRUNCATED;
  }

  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return "[BINARY]";
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS);

    const sanitized = items.map((item) => sanitizeValue(item, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      sanitized.push(TRUNCATED);
    }

    return sanitized;
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;

    const entries = Object.entries(source);

    const result: Record<string, unknown> = {};

    for (const [key, childValue] of entries.slice(0, MAX_OBJECT_KEYS)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;

        continue;
      }

      result[key] = sanitizeValue(childValue, depth + 1);
    }

    if (entries.length > MAX_OBJECT_KEYS) {
      result.__truncated = true;
    }

    return result;
  }

  return String(value);
};

//==================================================
//==== SANITIZE AUDIT DATA
//==================================================

export const sanitizeAuditData = (value: unknown): unknown => {
  return sanitizeValue(value, 0);
};
