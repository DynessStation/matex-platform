// Admin-account input rules (create and update), reference and uniqueness checks, and profile
// photo validation. Invalid input throws HttpError.
import { PoolConnection } from 'mysql2/promise';

import keyhsid from '../../../hsid';
import { HttpError } from '../../../helper/http-error.helper';
import { decodeId } from '../../../helper/id.helper';
import { isValidEmail } from '../../../helper/input.helper';

export interface AccountInput {
  name: string;
  alias: string;
  email1: string;
  email2: string | null;
  phone1: string;
  phone2: string | null;
  /** Only on create. */
  password: string | null;
  idMasterComp: number;
  idOffice: number;
  idChair: number;
  idAccess: number;
  isAllAccess: 0 | 1;
  /** Raw request value; undefined means "keep the current photo" on update. */
  profilePhoto: unknown;
}

const invalid = (code: string, message: string) => new HttpError(400, code, message);

const PHONE = /^\+[1-9]\d{6,14}$/;

/** Letters, spaces, and . , ' - only, at most 50 characters. */
export const isValidAccountName = (name: string): boolean =>
  name.length <= 50 && /^[\p{L}\s.,'-]+$/u.test(name);

/** International format: "+" and 7 to 15 digits. */
export const isValidAccountPhone = (phone: string): boolean => PHONE.test(phone);

/** 8 to 64 characters, no spaces, at least one character that is not a letter. */
export const isValidAccountPassword = (password: string): boolean =>
  password.length >= 8 &&
  password.length <= 64 &&
  !/\s/.test(password) &&
  /[^a-zA-Z]/.test(password);

/** Reads and validates the account fields; `withPassword` on create. */
export const readAccountInput = (
  body: any,
  { withPassword }: { withPassword: boolean },
): AccountInput => {
  const required = [
    body?.name,
    body?.alias,
    body?.email_1,
    body?.phone_1,
    body?.id_master_comp,
    body?.id_office,
    body?.id_chair,
    body?.id_access,
    ...(withPassword ? [body?.password] : []),
  ];
  if (required.some((value) => !value)) {
    throw invalid('ADMIN_ACCOUNT_REQUIRED_FIELDS_MISSING', 'Required fields are missing');
  }

  const name = String(body.name).trim();
  const alias = String(body.alias).trim();
  const email1 = String(body.email_1).trim().toLowerCase();
  const email2 = body.email_2 ? String(body.email_2).trim().toLowerCase() : null;
  const phone1 = String(body.phone_1).trim();
  const phone2 = body.phone_2 ? String(body.phone_2).trim() : null;

  if (!isValidAccountName(name)) {
    throw invalid('ADMIN_ACCOUNT_NAME_INVALID', 'Invalid name format');
  }
  if (alias.length > 15 || !/^[a-zA-Z0-9]+$/.test(alias)) {
    throw invalid('ADMIN_ACCOUNT_ALIAS_INVALID', 'Invalid alias format');
  }
  if (!isValidEmail(email1) || (email2 && !isValidEmail(email2))) {
    throw invalid('ADMIN_ACCOUNT_EMAIL_INVALID', 'Invalid email address');
  }
  if (!isValidAccountPhone(phone1) || (phone2 && !isValidAccountPhone(phone2))) {
    throw invalid('ADMIN_ACCOUNT_PHONE_INVALID', 'Invalid phone number');
  }

  const password = withPassword ? String(body.password) : null;
  if (password !== null && !isValidAccountPassword(password)) {
    throw invalid('ADMIN_ACCOUNT_PASSWORD_INVALID', 'Invalid password format');
  }

  const idMasterComp = decodeId(body.id_master_comp, keyhsid.idMasterCompany);
  const idOffice = decodeId(body.id_office, keyhsid.idOffice);
  const idChair = decodeId(body.id_chair, keyhsid.idChair);
  const idAccess = decodeId(body.id_access, keyhsid.idAdminAccess);
  if (!idMasterComp || !idOffice || !idChair || !idAccess) {
    throw invalid('ADMIN_ACCOUNT_REFERENCE_INVALID', 'Invalid reference identifier');
  }

  return {
    name,
    alias,
    email1,
    email2,
    phone1,
    phone2,
    password,
    idMasterComp,
    idOffice,
    idChair,
    idAccess,
    isAllAccess: body.is_all_access ? 1 : 0,
    profilePhoto: body.id_profile_photo,
  };
};

const exists = async (connection: PoolConnection, sql: string, params: unknown[]) => {
  const [rows] = await connection.query(sql, params);
  return (rows as unknown[]).length > 0;
};

/**
 * Checks that the company, office, chair, and access profile are active and belong together,
 * and validates the profile photo. Returns the photo id to store (null for none).
 */
export const assertAccountReferences = async (
  connection: PoolConnection,
  input: AccountInput,
  sessionAllAccess: number,
): Promise<number | null> => {
  if (
    !(await exists(
      connection,
      'SELECT id_master_comp FROM master_comp WHERE id_master_comp = ? AND comp_status = 1 LIMIT 1',
      [input.idMasterComp],
    ))
  ) {
    throw invalid('ADMIN_ACCOUNT_COMPANY_NOT_AVAILABLE', 'Company is not available');
  }
  if (
    !(await exists(
      connection,
      'SELECT id_office FROM office WHERE id_office = ? AND id_master_comp = ? AND status = 1 LIMIT 1',
      [input.idOffice, input.idMasterComp],
    ))
  ) {
    throw invalid(
      'ADMIN_ACCOUNT_OFFICE_COMPANY_MISMATCH',
      'Office does not belong to the selected company',
    );
  }

  const idProfilePhoto = await resolveProfilePhoto(connection, input.profilePhoto, {
    idMasterComp: input.idMasterComp,
    idOffice: input.idOffice,
    isAllAccess: sessionAllAccess,
  });

  if (
    !(await exists(
      connection,
      'SELECT id_chair FROM chair WHERE id_chair = ? AND id_master_comp = ? AND chair_status = 1 LIMIT 1',
      [input.idChair, input.idMasterComp],
    ))
  ) {
    throw invalid(
      'ADMIN_ACCOUNT_CHAIR_NOT_AVAILABLE',
      'Position is not available for the selected company',
    );
  }
  if (
    !(await exists(
      connection,
      `SELECT id_admin_access FROM admin_access
       WHERE id_admin_access = ? AND id_master_comp = ? AND admin_access_status = 1 LIMIT 1`,
      [input.idAccess, input.idMasterComp],
    ))
  ) {
    throw invalid(
      'ADMIN_ACCOUNT_ACCESS_NOT_AVAILABLE',
      'Access profile is not available for the selected company',
    );
  }

  return idProfilePhoto;
};

/**
 * Alias, emails, and phone numbers must be unique across all accounts, including deleted ones:
 * login looks accounts up by email or phone without a status filter.
 */
export const assertAccountUnique = async (
  connection: PoolConnection,
  input: Pick<AccountInput, 'alias' | 'email1' | 'email2' | 'phone1' | 'phone2'>,
  excludeIdAdminAcct?: number,
): Promise<void> => {
  const exclude = excludeIdAdminAcct ? 'id_admin_acct != ? AND' : '';
  const excludeParams = excludeIdAdminAcct ? [excludeIdAdminAcct] : [];

  if (
    await exists(
      connection,
      `SELECT id_admin_acct FROM admin_acct WHERE ${exclude} LOWER(alias) = LOWER(?) LIMIT 1`,
      [...excludeParams, input.alias],
    )
  ) {
    throw new HttpError(409, 'ADMIN_ACCOUNT_ALIAS_EXISTS', 'Alias is already in use');
  }

  const emails = [input.email1, input.email2].filter((value): value is string => Boolean(value));
  const emailList = emails.map(() => '?').join(', ');
  if (
    await exists(
      connection,
      `SELECT id_admin_acct FROM admin_acct
       WHERE ${exclude} (email_1 IN (${emailList}) OR email_2 IN (${emailList}))
       LIMIT 1`,
      [...excludeParams, ...emails, ...emails],
    )
  ) {
    throw new HttpError(409, 'ADMIN_ACCOUNT_EMAIL_EXISTS', 'Email address is already in use');
  }

  const phones = [input.phone1, input.phone2].filter((value): value is string => Boolean(value));
  const phoneList = phones.map(() => '?').join(', ');
  if (
    await exists(
      connection,
      `SELECT id_admin_acct FROM admin_acct
       WHERE ${exclude} (phone_1 IN (${phoneList}) OR phone_2 IN (${phoneList}))
       LIMIT 1`,
      [...excludeParams, ...phones, ...phones],
    )
  ) {
    throw new HttpError(409, 'ADMIN_ACCOUNT_PHONE_EXISTS', 'Phone number is already in use');
  }
};

/** An admin_profile file of the company (and of the office, for office-scoped admins). */
const resolveProfilePhoto = async (
  connection: PoolConnection,
  value: unknown,
  scope: { idMasterComp: number; idOffice: number; isAllAccess: number },
): Promise<number | null> => {
  if (value === undefined || value === null || String(value).trim() === '') return null;

  const idAttachment = decodeId(value, keyhsid.idAttachment);
  if (!idAttachment) {
    throw invalid('ADMIN_ACCOUNT_PROFILE_PHOTO_INVALID_ID', 'Invalid profile photo identifier');
  }

  const [rows] = await connection.query(
    `SELECT id_attachment, id_master_comp, id_office
     FROM attachment
     WHERE id_attachment = ? AND collection_name = 'admin_profile' AND attachment_status = 1
       AND deleted_at IS NULL
     LIMIT 1`,
    [idAttachment],
  );
  const attachment = (rows as any[])[0];
  if (!attachment) {
    throw invalid('ADMIN_ACCOUNT_PROFILE_PHOTO_NOT_AVAILABLE', 'Profile photo is not available');
  }
  if (Number(attachment.id_master_comp) !== scope.idMasterComp) {
    throw new HttpError(
      403,
      'ADMIN_ACCOUNT_PROFILE_PHOTO_COMPANY_SCOPE_FORBIDDEN',
      'Profile photo is outside the company scope',
    );
  }
  if (scope.isAllAccess !== 1 && Number(attachment.id_office) !== scope.idOffice) {
    throw new HttpError(
      403,
      'ADMIN_ACCOUNT_PROFILE_PHOTO_OFFICE_SCOPE_FORBIDDEN',
      'Profile photo is outside the office scope',
    );
  }
  return idAttachment;
};
