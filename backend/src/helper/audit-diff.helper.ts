//==================================================
//==== PLAIN OBJECT
//==================================================

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
};

//==================================================
//==== SAME VALUE
//==================================================

const isSameValue = (before: unknown, after: unknown): boolean => {
  return JSON.stringify(before) === JSON.stringify(after);
};

//==================================================
//==== CHANGED FIELDS
//==================================================

export const getChangedFields = (
  before: unknown,
  after: unknown,
  parentPath = "",
): string[] => {
  if (isSameValue(before, after)) {
    return [];
  }

  if (!isPlainObject(before) || !isPlainObject(after)) {
    return parentPath ? [parentPath] : [];
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  const changedFields: string[] = [];

  for (const key of keys) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    const beforeValue = before[key];

    const afterValue = after[key];

    if (isSameValue(beforeValue, afterValue)) {
      continue;
    }

    if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
      changedFields.push(...getChangedFields(beforeValue, afterValue, path));

      continue;
    }

    changedFields.push(path);
  }

  return changedFields;
};
