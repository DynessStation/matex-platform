export const normalizeProductMediaSortOrder = (
  value: unknown,
  fallbackIndex: number,
) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.max(0, numericValue)
    : Math.max(0, fallbackIndex);
};
