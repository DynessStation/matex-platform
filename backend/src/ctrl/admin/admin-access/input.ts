// Access-profile input rules (create and update) and name uniqueness. Invalid input throws HttpError.
import { PoolConnection } from 'mysql2/promise';

import { HttpError } from '../../../helper/http-error.helper';
import type { RequestBody } from '../../../helper/input.helper';

export interface AccessInput {
  name: string;
  description: string | null;
  /** Raw permission ids; resolved by resolvePermissionIds(). */
  permissions: unknown;
}

export const readAccessInput = (body: RequestBody): AccessInput => {
  const name = typeof body?.access_name === 'string' ? body.access_name.trim() : '';
  const description =
    typeof body?.access_description === 'string' && body.access_description.trim()
      ? body.access_description.trim()
      : null;

  if (!name) throw new HttpError(400, 'ADMIN_ACCESS_NAME_REQUIRED', 'Access name is required');
  if (name.length > 255) {
    throw new HttpError(400, 'ADMIN_ACCESS_NAME_TOO_LONG', 'Access name is too long');
  }
  if (description && description.length > 500) {
    throw new HttpError(400, 'ADMIN_ACCESS_DESCRIPTION_TOO_LONG', 'Access description is too long');
  }

  return { name, description, permissions: body?.permissions };
};

/** Throws 409 when another active or inactive profile of the company has the name (case-insensitive). */
export const assertAccessNameUnique = async (
  connection: PoolConnection,
  idMasterComp: number,
  name: string,
  excludeIdAccess?: number,
): Promise<void> => {
  const [rows] = await connection.query(
    `SELECT id_admin_access FROM admin_access
     WHERE id_master_comp = ? AND LOWER(access_name) = LOWER(?)
       ${excludeIdAccess ? 'AND id_admin_access != ?' : ''}
       AND admin_access_status IN (0, 1)
     LIMIT 1`,
    excludeIdAccess ? [idMasterComp, name, excludeIdAccess] : [idMasterComp, name],
  );
  if ((rows as unknown[]).length) {
    throw new HttpError(409, 'ADMIN_ACCESS_NAME_EXISTS', 'Access name is already in use');
  }
};
