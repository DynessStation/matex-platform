import { createHmac, timingSafeEqual } from "crypto";

//==================================================
//==== CANONICALIZE
//==================================================

const canonicalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;

    const result: Record<string, unknown> = {};

    const keys = Object.keys(source).sort();

    for (const key of keys) {
      result[key] = canonicalizeValue(source[key]);
    }

    return result;
  }

  return value;
};

//==================================================
//==== CANONICAL JSON
//==================================================

export const canonicalAuditJson = (value: unknown): string => {
  return JSON.stringify(canonicalizeValue(value));
};

//==================================================
//==== CREATE HASH
//==================================================

export const createAuditIntegrityHash = (payload: unknown): string | null => {
  const secret = process.env.AUDIT_INTEGRITY_SECRET;

  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(canonicalAuditJson(payload))
    .digest("hex");
};

//==================================================
//==== VERIFY HASH
//==================================================

export const verifyAuditIntegrityHash = (
  payload: unknown,
  expectedHash: string | null,
): boolean => {
  if (!expectedHash) {
    return false;
  }

  const currentHash = createAuditIntegrityHash(payload);

  if (!currentHash) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHash, "hex");

  const currentBuffer = Buffer.from(currentHash, "hex");

  if (expectedBuffer.length !== currentBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, currentBuffer);
};
