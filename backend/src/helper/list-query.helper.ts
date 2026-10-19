// Paging, search, and sort direction from list query strings (?page=&limit=&search=).

export interface ListQuery {
  page: number;
  limit: number;
  offset: number;
  search: string;
  /** `search` wrapped for SQL LIKE: %search% */
  searchValue: string;
}

const positive = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' && value !== '' ? Number(value) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseListQuery = (
  query: Record<string, unknown>,
  { defaultLimit = 15, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {},
): ListQuery => {
  const page = positive(query.page, 1);
  const limit = Math.min(positive(query.limit, defaultLimit), maxLimit);
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search,
    searchValue: `%${search}%`,
  };
};

/**
 * The SQL expression for a requested sort key, or `fallback` for unknown keys. Only own keys of
 * `columns` count, so built-in object keys such as `toString` never reach the SQL.
 */
export const sortColumn = (
  columns: Record<string, string>,
  key: unknown,
  fallback: string,
): string => (typeof key === 'string' && Object.hasOwn(columns, key) ? columns[key] : fallback);

/** 'desc' or 'true' -> DESC, 'asc' or 'false' -> ASC, anything else -> `fallback`. */
export const sortDirection = (value: unknown, fallback: 'ASC' | 'DESC'): 'ASC' | 'DESC' => {
  if (value === 'desc' || value === 'true') return 'DESC';
  if (value === 'asc' || value === 'false') return 'ASC';
  return fallback;
};
