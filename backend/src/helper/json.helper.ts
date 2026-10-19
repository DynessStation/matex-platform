// Reading JSON columns that may come back from MySQL as text or as parsed values.

/**
 * null/undefined -> null; non-strings are returned as they are; strings are parsed as JSON.
 * Invalid JSON gives null, or the original string with `onInvalid: 'raw'`.
 */
export const parseJsonValue = (
  value: unknown,
  { onInvalid = 'null' }: { onInvalid?: 'null' | 'raw' } = {},
): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return onInvalid === 'raw' ? value : null;
  }
};
