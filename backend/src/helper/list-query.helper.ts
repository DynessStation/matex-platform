import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

// One list query for every list endpoint (A-2):
//   ?page=&limit=&search=&sort=<key>&direction=asc|desc
// Older names are still read for one release, so an admin page loaded before a deploy keeps
// working: `paginate` for limit; `ord`/`srt` and `field`/`sort=asc|desc` for sort and direction.

export interface ListQuery {
  page: number;
  limit: number;
  offset: number;
  search: string;
  /** `search` wrapped for SQL LIKE: %search% */
  searchValue: string;
  /** The requested sort key ('' when none); map it with sortColumn(). */
  sort: string;
  /** The requested direction, or null to use the list's own default. */
  direction: 'ASC' | 'DESC' | null;
}

const positive = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' && value !== '' ? Number(value) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** 'desc' or 'true' -> DESC, 'asc' or 'false' -> ASC, anything else -> null. */
const directionOf = (value: unknown): 'ASC' | 'DESC' | null => {
  const normalized = text(value).toLowerCase();
  if (normalized === 'desc' || normalized === 'true') return 'DESC';
  if (normalized === 'asc' || normalized === 'false') return 'ASC';
  return null;
};

export const parseListQuery = (
  query: Record<string, unknown>,
  { defaultLimit = 15, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {},
): ListQuery => {
  const page = positive(query.page, 1);
  const limit = Math.min(positive(query.limit ?? query.paginate, defaultLimit), maxLimit);
  const search = text(query.search);

  // `sort` holds a key, except in the older field/sort pair where it held the direction.
  const sortText = text(query.sort);
  const legacyDirection = directionOf(sortText) ? sortText : '';
  const sort = (legacyDirection ? '' : sortText) || text(query.field) || text(query.ord);
  const direction =
    directionOf(query.direction) ?? directionOf(legacyDirection) ?? directionOf(query.srt);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search,
    searchValue: `%${search}%`,
    sort,
    direction,
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

/** The `total` column of a COUNT query. */
export const countOf = async (
  executor: Pool | PoolConnection,
  sql: string,
  params: unknown[],
): Promise<number> => {
  const [rows] = await executor.query<RowDataPacket[]>(sql, params);
  return Number(rows[0]?.total ?? 0);
};

/** The `meta` of a paged list: the page asked for, its size, and the counts. */
export interface ListMeta {
  page?: number;
  limit?: number;
  /** Rows matching the search and filters. */
  total: number;
  /** Rows before search and filters. */
  total_all?: number;
  total_pages?: number;
}

export const pageMeta = (
  { page, limit }: { page: number; limit: number },
  total: number,
  totalAll?: number,
): ListMeta => ({
  page,
  limit,
  total,
  ...(totalAll === undefined ? {} : { total_all: totalAll }),
  total_pages: Math.ceil(total / limit),
});
