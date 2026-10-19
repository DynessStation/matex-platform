// Validates the profile photo chosen for an admin account (create and update).
import keyhsid from '../../../hsid';
import db = require('../../../db');

const { pool } = db;

// Admin profile photo validation

type ProfilePhotoValidationResult =
  | {
      success: true;
      idAttachment: number | null;
    }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

export const resolveAdminProfilePhoto = async (
  value: unknown,
  scope: {
    idMasterComp: number;
    idOffice: number;
    isAllAccess: number;
  },
): Promise<ProfilePhotoValidationResult> => {
  // Empty

  if (value === undefined || value === null || String(value).trim() === '') {
    return {
      success: true,
      idAttachment: null,
    };
  }

  // Decode

  const encodedAttachment = String(value).trim();

  const decodedAttachment = keyhsid.idAttachment.decode(encodedAttachment)[0];

  const idAttachment = Number(decodedAttachment);

  if (!decodedAttachment || !Number.isInteger(idAttachment) || idAttachment <= 0) {
    return {
      success: false,
      status: 400,
      code: 'ADMIN_ACCOUNT_PROFILE_PHOTO_INVALID_ID',
      message: 'Invalid profile photo identifier',
    };
  }

  // Get attachment

  const [attachmentRows] = await pool.query(
    `
        SELECT
          id_attachment,
          id_master_comp,
          id_office

        FROM attachment

        WHERE id_attachment = ?
          AND collection_name = 'admin_profile'
          AND attachment_status = 1
          AND deleted_at IS NULL

        LIMIT 1
      `,
    [idAttachment],
  );

  const attachments = attachmentRows as any[];

  if (!attachments.length) {
    return {
      success: false,
      status: 400,
      code: 'ADMIN_ACCOUNT_PROFILE_PHOTO_NOT_AVAILABLE',
      message: 'Profile photo is not available',
    };
  }

  const attachment = attachments[0];

  // Company scope

  if (Number(attachment.id_master_comp) !== scope.idMasterComp) {
    return {
      success: false,
      status: 403,
      code: 'ADMIN_ACCOUNT_PROFILE_PHOTO_COMPANY_SCOPE_FORBIDDEN',
      message: 'Profile photo is outside the company scope',
    };
  }

  // Office scope

  if (scope.isAllAccess !== 1 && Number(attachment.id_office) !== scope.idOffice) {
    return {
      success: false,
      status: 403,
      code: 'ADMIN_ACCOUNT_PROFILE_PHOTO_OFFICE_SCOPE_FORBIDDEN',
      message: 'Profile photo is outside the office scope',
    };
  }

  // Result

  return {
    success: true,
    idAttachment,
  };
};
