// Positions ("Urutan") kept by the server: a group of rows (live FAQ, public offices, products
// at the front of the catalog, sibling categories) is always numbered 1..n without gaps or
// ties. Admins never type a number; they drag a list and the server writes the positions.
import { RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

import { HttpError } from './http-error.helper';
import { decodeId } from './id.helper';

/** One numbered group: `where` (with `params`) selects its rows in `table`. */
export interface SortGroup {
  table: string;
  id: string;
  column: string;
  where: string;
  params: unknown[];
}

/** The rows of the group in their current order (position, then id), locked. */
export const lockGroup = async (connection: PoolConnection, group: SortGroup) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT ${group.id} AS id, ${group.column} AS position FROM ${group.table}
     WHERE ${group.where}
     ORDER BY ${group.column}, ${group.id}
     FOR UPDATE`,
    group.params,
  );
  return rows.map((row) => ({ id: Number(row.id), position: Number(row.position) }));
};

/** Writes positions 1..n in the order of `ids` (rows already at their position are skipped). */
export const writeOrder = async (
  connection: PoolConnection,
  group: Pick<SortGroup, 'table' | 'id' | 'column'>,
  ids: number[],
) => {
  for (const [index, id] of ids.entries()) {
    await connection.query(
      `UPDATE ${group.table} SET ${group.column} = ? WHERE ${group.id} = ? AND ${group.column} <> ?`,
      [index + 1, id, index + 1],
    );
  }
};

/** Renumbers the group 1..n in its current order. */
export const renumber = async (connection: PoolConnection, group: SortGroup) =>
  writeOrder(
    connection,
    group,
    (await lockGroup(connection, group)).map((row) => row.id),
  );

/**
 * The position after the last row of the group (1 for an empty group). The group is renumbered
 * first, so older data with gaps or ties cannot put the new row in the middle.
 */
export const nextPosition = async (connection: PoolConnection, group: SortGroup) => {
  const ids = (await lockGroup(connection, group)).map((row) => row.id);
  await writeOrder(connection, group, ids);
  return ids.length + 1;
};

/**
 * The ids of an order payload (`ids`: encoded ids, first = position 1), or an HttpError with
 * `<prefix>_INVALID` (not a list, bad id, more than `max`) or `<prefix>_DUPLICATE`.
 */
export const readOrderIds = (
  value: unknown,
  codec: Parameters<typeof decodeId>[1],
  prefix: string,
  max = 500,
) => {
  if (!Array.isArray(value) || value.length > max) {
    throw new HttpError(400, `${prefix}_INVALID`, 'Order must be a list of items');
  }
  const ids = value.map((item) => decodeId(item, codec));
  if (ids.some((id) => !id)) {
    throw new HttpError(400, `${prefix}_INVALID`, 'Order contains an invalid item');
  }
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(400, `${prefix}_DUPLICATE`, 'Order contains the same item twice');
  }
  return ids as number[];
};

/** The payload must list every row of the group exactly once (409 `<prefix>_INCOMPLETE`). */
export const assertSameItems = (current: { id: number }[], ids: number[], prefix: string) => {
  const known = new Set(current.map((row) => row.id));
  if (ids.length !== current.length || ids.some((id) => !known.has(id))) {
    throw new HttpError(
      409,
      `${prefix}_INCOMPLETE`,
      'The list changed meanwhile; reload it and try again',
    );
  }
};
