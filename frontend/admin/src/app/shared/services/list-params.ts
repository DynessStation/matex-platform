import { HttpParams } from '@angular/common/http';

import { Params } from '../interface/core.interface';

/**
 * The API list query (A-2) from a table query: page, limit, search, sort (a column key), and
 * direction (asc|desc). The table keeps the page size as `paginate`, the column as `field`, and
 * the direction as `sort`; a `sort` that is not asc/desc is a named order (media) and stays the
 * sort key. Every other non-empty value (filters such as locale or category) is passed as is.
 */
export function listParams(payload?: Params | null): HttpParams {
  let params = new HttpParams();
  const query = { ...(payload ?? {}) };

  const direction = String(query['sort'] ?? '').toLowerCase();
  if (direction === 'asc' || direction === 'desc') {
    query['direction'] = direction;
    delete query['sort'];
  }
  if (query['field'] !== undefined) {
    query['sort'] = query['field'];
    delete query['field'];
  }
  if (query['paginate'] !== undefined) {
    query['limit'] ??= query['paginate'];
    delete query['paginate'];
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
