// Admin-account records: shared database steps, scope checks, and response/audit views.
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

import db = require('../../../db');
import keyhsid from '../../../hsid';
import { AdminScope } from '../../../helper/admin-scope.helper';
import { buildAttachmentUrl } from '../../../helper/attachment.helper';
import { HttpError } from '../../../helper/http-error.helper';

const { pool } = db;

const ACCOUNT_COLUMNS = `id_admin_acct, id_master_comp, id_office, name, alias, email_1, email_2,
  phone_1, phone_2, id_profile_photo, id_chair, id_access, is_all_access, admin_acct_status`;

/** An admin_acct row (ACCOUNT_COLUMNS and the session columns). */
export interface AccountRow extends RowDataPacket {
  id_admin_acct: number;
  id_master_comp: number;
  id_office: number;
  alias: string;
  id_access: number;
  token_version?: number;
}

/** Locks an active or inactive account (not deleted), or throws 404. */
export const lockAccount = async (
  connection: PoolConnection,
  idAdminAcct: number,
): Promise<AccountRow> => {
  const [rows] = await connection.query(
    `SELECT ${ACCOUNT_COLUMNS} FROM admin_acct
     WHERE id_admin_acct = ? AND admin_acct_status IN (0, 1)
     LIMIT 1
     FOR UPDATE`,
    [idAdminAcct],
  );
  const account = (rows as AccountRow[])[0];
  if (!account) throw new HttpError(404, 'ADMIN_ACCOUNT_NOT_FOUND', 'Admin account not found');
  return account;
};

/** The account must be in the admin's company, and in the admin's office unless full access. */
export const assertAccountInScope = (
  account: { id_master_comp: unknown; id_office: unknown },
  scope: AdminScope,
): void => {
  if (Number(account.id_master_comp) !== scope.idMasterComp) {
    throw new HttpError(
      403,
      'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
      'You do not have access to this company account',
    );
  }
  if (scope.isAllAccess !== 1 && Number(account.id_office) !== scope.idOffice) {
    throw new HttpError(
      403,
      'ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN',
      'You do not have access to this office account',
    );
  }
};

/** A company must keep at least one active full-access account besides `idAdminAcct`. */
export const assertAnotherFullAccess = async (
  connection: PoolConnection,
  idMasterComp: number,
  idAdminAcct: number,
): Promise<void> => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM admin_acct
     WHERE id_master_comp = ? AND is_all_access = 1 AND admin_acct_status = 1
       AND id_admin_acct != ?`,
    [idMasterComp, idAdminAcct],
  );
  if (Number((rows as RowDataPacket[])[0]?.total ?? 0) === 0) {
    throw new HttpError(
      409,
      'ADMIN_ACCOUNT_LAST_FULL_ACCESS_REQUIRED',
      'At least one active full-access account must remain in the company',
    );
  }
};

/** Audit view of an account row. */
export const accountAudit = (account: AccountRow) => ({
  id_master_comp: Number(account.id_master_comp),
  id_office: Number(account.id_office),
  name: account.name,
  alias: account.alias,
  email_1: account.email_1,
  email_2: account.email_2,
  phone_1: account.phone_1,
  phone_2: account.phone_2,
  id_profile_photo: account.id_profile_photo ? Number(account.id_profile_photo) : null,
  id_chair: Number(account.id_chair),
  id_access: Number(account.id_access),
  is_all_access: Number(account.is_all_access),
  admin_acct_status: Number(account.admin_acct_status),
});

/** SELECT columns for the profile photo joined as `pa`, read back by profilePhotoDto(). */
export const PROFILE_PHOTO_COLUMNS = `pa.id_attachment AS profile_attachment_id,
  pa.collection_name AS profile_collection_name, pa.name AS profile_name,
  pa.original_name AS profile_original_name, pa.file_name AS profile_file_name,
  pa.mime_type AS profile_mime_type, pa.extension AS profile_extension, pa.disk AS profile_disk,
  pa.storage_path AS profile_storage_path, pa.file_size AS profile_file_size,
  pa.width AS profile_width, pa.height AS profile_height`;

export const PROFILE_PHOTO_JOIN = `LEFT JOIN attachment pa ON aa.id_profile_photo = pa.id_attachment
  AND pa.collection_name = 'admin_profile' AND pa.attachment_status = 1 AND pa.deleted_at IS NULL`;

export const profilePhotoDto = (row: RowDataPacket) =>
  row.profile_attachment_id
    ? {
        id_attachment: keyhsid.idAttachment.encode(row.profile_attachment_id),
        collection_name: row.profile_collection_name,
        name: row.profile_name,
        original_name: row.profile_original_name,
        file_name: row.profile_file_name,
        mime_type: row.profile_mime_type,
        extension: row.profile_extension,
        disk: row.profile_disk,
        storage_path: row.profile_storage_path,
        file_size: Number(row.profile_file_size),
        width: row.profile_width,
        height: row.profile_height,
        asset_url: buildAttachmentUrl(row.profile_storage_path),
      }
    : null;

/** The signed-in account with company, office, chair, access profile, and photo; for login and /me. */
export const SESSION_ACCOUNT_SELECT = `SELECT aa.id_admin_acct, aa.id_master_comp, aa.id_office,
    aa.password, aa.name, aa.alias, aa.email_1, aa.email_2, aa.phone_1, aa.phone_2,
    aa.id_profile_photo, ${PROFILE_PHOTO_COLUMNS}, aa.id_chair, aa.id_access, aa.is_all_access,
    aa.admin_acct_status, aa.token_version, mc.comp_name, mc.comp_alias, o.office_name, o.address, ch.chair_name,
    ch.chair_description, ac.access_name, ac.id_master_comp AS access_master_comp,
    ac.admin_access_status
  FROM admin_acct aa
  INNER JOIN master_comp mc ON aa.id_master_comp = mc.id_master_comp
  INNER JOIN office o ON aa.id_office = o.id_office
  INNER JOIN chair ch ON aa.id_chair = ch.id_chair
  INNER JOIN admin_access ac ON aa.id_access = ac.id_admin_access
  ${PROFILE_PHOTO_JOIN}`;

/** Active permission keys of an access profile, in catalog order. */
export const readPermissionKeys = async (idAccess: number): Promise<string[]> => {
  const [rows] = await pool.query(
    `SELECT ap.permission_key
     FROM admin_access_permission aap
     INNER JOIN admin_permission ap ON aap.id_admin_permission = ap.id_admin_permission
     WHERE aap.id_admin_access = ? AND ap.permission_status = 1
     ORDER BY ap.id_admin_permission ASC`,
    [idAccess],
  );
  return (rows as RowDataPacket[]).map((item) => item.permission_key);
};

/** The session payload returned by login and /me. */
export const sessionAccountDto = (user: AccountRow, permissions: string[]) => {
  const profilePhoto = profilePhotoDto(user);
  return {
    id_admin_acct: keyhsid.idAdmin.encode(user.id_admin_acct),
    name: user.name,
    alias: user.alias,
    email_1: user.email_1,
    email_2: user.email_2,
    phone_1: user.phone_1,
    phone_2: user.phone_2,
    id_profile_photo: profilePhoto?.id_attachment ?? null,
    profile_photo: profilePhoto,
    master_comp: {
      id_master_comp: keyhsid.idMasterCompany.encode(user.id_master_comp),
      comp_name: user.comp_name,
      comp_alias: user.comp_alias,
    },
    office: {
      id_office: keyhsid.idOffice.encode(user.id_office),
      office_name: user.office_name,
      address: user.address,
    },
    chair: {
      id_chair: keyhsid.idChair.encode(user.id_chair),
      chair_name: user.chair_name,
      chair_description: user.chair_description,
    },
    access: {
      id_access: keyhsid.idAdminAccess.encode(user.id_access),
      access_name: user.access_name,
      permissions,
    },
    is_all_access: user.is_all_access,
  };
};
