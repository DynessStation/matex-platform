// Uniqueness of an office within its company: code or name (case-insensitive), and public slug.
import { PoolConnection } from 'mysql2/promise';

import { HttpError } from '../../../helper/http-error.helper';

import { OfficeInput } from './input';

/** Throws 409 when another active or inactive office uses the code, name, or public slug. */
export const assertOfficeUnique = async (
  connection: PoolConnection,
  idMasterComp: number,
  input: OfficeInput,
  excludeIdOffice?: number,
): Promise<void> => {
  const exclude = excludeIdOffice ? 'AND id_office != ?' : '';
  const excludeParams = excludeIdOffice ? [excludeIdOffice] : [];

  const [duplicates] = await connection.query(
    `SELECT id_office FROM office
     WHERE id_master_comp = ? ${exclude} AND status IN (0, 1)
       AND (UPPER(COALESCE(office_code, '')) = UPPER(?) OR LOWER(office_name) = LOWER(?))
     LIMIT 1`,
    [idMasterComp, ...excludeParams, input.code, input.name],
  );
  if ((duplicates as unknown[]).length) {
    throw new HttpError(
      409,
      'OFFICE_ALREADY_EXISTS',
      'Office code or office name is already in use',
    );
  }

  if (!input.publicSlug) return;
  const [slugs] = await connection.query(
    `SELECT id_office FROM office
     WHERE id_master_comp = ? ${exclude} AND public_slug = ? AND status IN (0, 1)
     LIMIT 1`,
    [idMasterComp, ...excludeParams, input.publicSlug],
  );
  if ((slugs as unknown[]).length) {
    throw new HttpError(409, 'OFFICE_PUBLIC_SLUG_EXISTS', 'Public office slug is already in use');
  }
};
