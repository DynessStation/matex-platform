// Permissions of an access profile: validation with dependencies, storage, key lookups, and audit diffs.
import { Pool, PoolConnection } from 'mysql2/promise';

import keyhsid from '../../../hsid';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';

type Executor = Pick<Pool | PoolConnection, 'query'>;

/** Granting the key requires the listed keys too. */
const DEPENDENCIES: Record<string, string[]> = {
  'attachment.create': ['attachment.view'],
  'attachment.delete': ['attachment.view'],
};

const invalidId = () =>
  new HttpError(400, 'ADMIN_ACCESS_PERMISSION_ID_INVALID', 'Invalid permission identifier');

/** Decodes and checks the requested permission ids; returns them without duplicates. */
export const resolvePermissionIds = async (
  executor: Executor,
  value: unknown,
): Promise<number[]> => {
  if (!Array.isArray(value)) {
    throw new HttpError(
      400,
      'ADMIN_ACCESS_PERMISSIONS_ARRAY_INVALID',
      'Permissions must be an array',
    );
  }
  if (value.length === 0) return [];

  const encoded = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) throw invalidId();
    encoded.add(item.trim());
  }
  const ids = new Set<number>();
  for (const item of encoded) {
    const id = decodeId(item, keyhsid.idAdminPermission);
    if (!id) throw invalidId();
    ids.add(id);
  }

  const [rows] = await executor.query(
    `SELECT id_admin_permission, permission_key FROM admin_permission
     WHERE id_admin_permission IN (${[...ids].map(() => '?').join(', ')}) AND permission_status = 1`,
    [...ids],
  );
  const permissions = rows as any[];
  if (permissions.length !== ids.size) {
    throw new HttpError(
      400,
      'ADMIN_ACCESS_PERMISSION_NOT_AVAILABLE',
      'One or more permissions are not available',
    );
  }

  const keys = new Set(permissions.map((item) => String(item.permission_key)));
  for (const [key, required] of Object.entries(DEPENDENCIES)) {
    if (!keys.has(key)) continue;
    const missing = required.find((requiredKey) => !keys.has(requiredKey));
    if (missing) {
      throw new HttpError(
        400,
        'ADMIN_ACCESS_PERMISSION_DEPENDENCY_REQUIRED',
        `${missing} is required when assigning ${key}`,
      );
    }
  }

  return [...ids];
};

/** Replaces the permission mapping of a profile. */
export const replaceAccessPermissions = async (
  connection: Executor,
  idAccess: number,
  ids: number[],
): Promise<void> => {
  await connection.query('DELETE FROM admin_access_permission WHERE id_admin_access = ?', [
    idAccess,
  ]);
  if (!ids.length) return;
  await connection.query(
    `INSERT INTO admin_access_permission (id_admin_access, id_admin_permission)
     VALUES ${ids.map(() => '(?, ?)').join(', ')}`,
    ids.flatMap((id) => [idAccess, id]),
  );
};

export const getPermissionKeysByIds = async (
  executor: Executor,
  ids: number[],
): Promise<string[]> => {
  if (!ids.length) return [];
  const [rows] = await executor.query(
    `SELECT permission_key FROM admin_permission
     WHERE id_admin_permission IN (${ids.map(() => '?').join(', ')})
     ORDER BY permission_key ASC`,
    ids,
  );
  return (rows as any[]).map((item) => String(item.permission_key));
};

export const getAccessPermissionKeys = async (
  executor: Executor,
  idAccess: number,
): Promise<string[]> => {
  const [rows] = await executor.query(
    `SELECT ap.permission_key
     FROM admin_access_permission aap
     INNER JOIN admin_permission ap ON aap.id_admin_permission = ap.id_admin_permission
     WHERE aap.id_admin_access = ?
     ORDER BY ap.permission_key ASC`,
    [idAccess],
  );
  return (rows as any[]).map((item) => String(item.permission_key));
};

export const getPermissionDiff = (before: string[], after: string[]) => {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((permission) => !beforeSet.has(permission));
  const removed = before.filter((permission) => !afterSet.has(permission));
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
};
