// Update an admin account and change its status.
import express = require('express');
import keyhsid from '../../../hsid';
import db = require('../../../db');

import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { sendError, sendSuccess } from '../../../helper/api-response.helper';
import { writeAuditLog } from '../../../helper/audit-log.helper';
import { resolveAdminProfilePhoto } from './profile-photo';

const { pool } = db;

const router = express.Router();

// Admin account - update

router.put(
  '/api/v1/admin-acct/:id',
  verifyToken,
  requirePermission('admin_account.update'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        alias,
        email_1,
        email_2,
        phone_1,
        phone_2,
        id_profile_photo,
        id_master_comp,
        id_office,
        id_chair,
        id_access,
        is_all_access,
      } = req.body;

      // Session

      const sessionAdminId = req.user?.id_admin_acct;

      if (!sessionAdminId) {
        return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
      }

      // Target ID

      const decodedAdminAcct = keyhsid.idAdmin.decode(String(id))[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (!decodedAdminAcct || !Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_ID', 'Invalid admin account identifier');
      }

      // Required

      if (
        !name ||
        !alias ||
        !email_1 ||
        !phone_1 ||
        !id_master_comp ||
        !id_office ||
        !id_chair ||
        !id_access
      ) {
        return sendError(
          res,
          400,
          'ADMIN_ACCOUNT_REQUIRED_FIELDS_MISSING',
          'Required fields are missing',
        );
      }

      // Normalize

      const cleanName = String(name).trim();

      const cleanAlias = String(alias).trim();

      const cleanEmail1 = String(email_1).trim().toLowerCase();

      const cleanEmail2 = email_2 ? String(email_2).trim().toLowerCase() : null;

      const cleanPhone1 = String(phone_1).trim();

      const cleanPhone2 = phone_2 ? String(phone_2).trim() : null;

      // Validation

      if (cleanName.length > 50 || !/^[\p{L}\s.,'-]+$/u.test(cleanName)) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_NAME_INVALID', 'Invalid name format');
      }

      if (cleanAlias.length > 15 || !/^[a-zA-Z0-9]+$/.test(cleanAlias)) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_ALIAS_INVALID', 'Invalid alias format');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail1) || (cleanEmail2 && !emailRegex.test(cleanEmail2))) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_EMAIL_INVALID', 'Invalid email address');
      }

      const phoneRegex = /^\+[1-9]\d{6,14}$/;

      if (!phoneRegex.test(cleanPhone1) || (cleanPhone2 && !phoneRegex.test(cleanPhone2))) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_PHONE_INVALID', 'Invalid phone number');
      }

      // Decode references

      const decodedMasterComp = keyhsid.idMasterCompany.decode(id_master_comp)[0];

      const decodedOffice = keyhsid.idOffice.decode(id_office)[0];

      const decodedChair = keyhsid.idChair.decode(id_chair)[0];

      const decodedAccess = keyhsid.idAdminAccess.decode(id_access)[0];

      const idMasterComp = Number(decodedMasterComp);

      const idOffice = Number(decodedOffice);

      const idChair = Number(decodedChair);

      const idAccess = Number(decodedAccess);

      if (
        !decodedMasterComp ||
        !decodedOffice ||
        !decodedChair ||
        !decodedAccess ||
        !Number.isInteger(idMasterComp) ||
        !Number.isInteger(idOffice) ||
        !Number.isInteger(idChair) ||
        !Number.isInteger(idAccess) ||
        idMasterComp <= 0 ||
        idOffice <= 0 ||
        idChair <= 0 ||
        idAccess <= 0
      ) {
        return sendError(
          res,
          400,
          'ADMIN_ACCOUNT_REFERENCE_INVALID',
          'Invalid reference identifier',
        );
      }

      // Get session account

      const [sessionRows] = await pool.query(
        `
            SELECT
              id_master_comp,
              id_office,
              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [sessionAdminId],
      );

      const sessionUsers = sessionRows as any[];

      if (!sessionUsers.length) {
        return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
      }

      const sessionUser = sessionUsers[0];

      if (Number(sessionUser.admin_acct_status) !== 1) {
        return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
      }

      const sessionCompany = Number(sessionUser.id_master_comp);

      const sessionOffice = Number(sessionUser.id_office);

      const sessionAllAccess = Number(sessionUser.is_all_access);

      // Get target account

      const [targetRows] = await pool.query(
        `
          SELECT
            id_admin_acct,

            id_master_comp,
            id_office,

            name,
            alias,

            email_1,
            email_2,

            phone_1,
            phone_2,

            id_profile_photo,

            id_chair,
            id_access,

            is_all_access,
            admin_acct_status

          FROM admin_acct

          WHERE id_admin_acct = ?
            AND admin_acct_status IN (0, 1)

          LIMIT 1
        `,
        [idAdminAcct],
      );

      const targetUsers = targetRows as any[];

      if (!targetUsers.length) {
        return sendError(res, 404, 'ADMIN_ACCOUNT_NOT_FOUND', 'Admin account not found');
      }

      const targetUser = targetUsers[0];

      // Audit before

      const auditBefore = {
        id_master_comp: Number(targetUser.id_master_comp),
        id_office: Number(targetUser.id_office),
        name: targetUser.name,
        alias: targetUser.alias,
        email_1: targetUser.email_1,
        email_2: targetUser.email_2,
        phone_1: targetUser.phone_1,
        phone_2: targetUser.phone_2,
        id_profile_photo: targetUser.id_profile_photo ? Number(targetUser.id_profile_photo) : null,
        id_chair: Number(targetUser.id_chair),
        id_access: Number(targetUser.id_access),
        is_all_access: Number(targetUser.is_all_access),
        admin_acct_status: Number(targetUser.admin_acct_status),
      };

      // Target company scope

      if (Number(targetUser.id_master_comp) !== sessionCompany) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
          'You do not have access to this company account',
        );
      }

      // Target office scope

      if (sessionAllAccess !== 1 && Number(targetUser.id_office) !== sessionOffice) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN',
          'You do not have access to this office account',
        );
      }

      // Protect full access target

      if (Number(targetUser.is_all_access) === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_UPDATE_FORBIDDEN',
          'You are not allowed to update a full-access account',
        );
      }

      // Destination company

      if (idMasterComp !== sessionCompany) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_MOVE_COMPANY_FORBIDDEN',
          'You cannot move this account outside your company',
        );
      }

      // Destination office

      if (sessionAllAccess !== 1 && idOffice !== sessionOffice) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_MOVE_OFFICE_FORBIDDEN',
          'You cannot move this account outside your assigned office',
        );
      }

      // Requested full access

      const requestedAllAccess = is_all_access ? 1 : 0;

      if (requestedAllAccess === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_GRANT_FORBIDDEN',
          'You are not allowed to grant full company access',
        );
      }

      // Prevent last full access loss

      if (Number(targetUser.is_all_access) === 1 && requestedAllAccess === 0) {
        const [fullAccessRows] = await pool.query(
          `
              SELECT
                COUNT(*) AS total

              FROM admin_acct

              WHERE id_master_comp = ?
                AND is_all_access = 1
                AND admin_acct_status = 1
                AND id_admin_acct != ?
            `,
          [sessionCompany, idAdminAcct],
        );

        const remainingFullAccess = Number((fullAccessRows as any[])[0]?.total ?? 0);

        if (remainingFullAccess === 0) {
          return sendError(
            res,
            409,
            'ADMIN_ACCOUNT_LAST_FULL_ACCESS_REQUIRED',
            'At least one active full-access account must remain in the company',
          );
        }
      }

      // Validate company

      const [companyRows] = await pool.query(
        `
            SELECT
              id_master_comp

            FROM master_comp

            WHERE id_master_comp = ?
              AND comp_status = 1

            LIMIT 1
          `,
        [idMasterComp],
      );

      if (!(companyRows as any[]).length) {
        return sendError(
          res,
          400,
          'ADMIN_ACCOUNT_COMPANY_NOT_AVAILABLE',
          'Company is not available',
        );
      }

      // Validate office

      const [officeRows] = await pool.query(
        `
            SELECT
              id_office

            FROM office

            WHERE id_office = ?
              AND id_master_comp = ?
              AND status = 1

            LIMIT 1
          `,
        [idOffice, idMasterComp],
      );

      if (!(officeRows as any[]).length) {
        return sendError(
          res,
          400,
          'ADMIN_ACCOUNT_OFFICE_COMPANY_MISMATCH',
          'Office does not belong to the selected company',
        );
      }

      // Profile photo

      let idProfilePhoto: number | null = targetUser.id_profile_photo
        ? Number(targetUser.id_profile_photo)
        : null;

      if (id_profile_photo !== undefined) {
        const profilePhotoResult = await resolveAdminProfilePhoto(id_profile_photo, {
          idMasterComp,
          idOffice,
          isAllAccess: sessionAllAccess,
        });

        if (!profilePhotoResult.success) {
          return sendError(
            res,
            profilePhotoResult.status,
            profilePhotoResult.code,
            profilePhotoResult.message,
          );
        }

        idProfilePhoto = profilePhotoResult.idAttachment;
      }

      // Validate chair + company

      const [chairRows] = await pool.query(
        `
      SELECT
        id_chair

      FROM chair

      WHERE id_chair = ?
        AND id_master_comp = ?
        AND chair_status = 1

      LIMIT 1
    `,
        [idChair, idMasterComp],
      );

      if (!(chairRows as any[]).length) {
        return sendError(
          res,
          400,
          'ADMIN_ACCOUNT_CHAIR_NOT_AVAILABLE',
          'Position is not available for the selected company',
        );
      }

      // Validate access + company

      const [accessRows] = await pool.query(
        `
            SELECT
              id_admin_access

            FROM admin_access

            WHERE id_admin_access = ?
              AND id_master_comp = ?
              AND admin_access_status = 1

            LIMIT 1
          `,
        [idAccess, idMasterComp],
      );

      if (!(accessRows as any[]).length) {
        return sendError(
          res,
          400,
          'ADMIN_ACCOUNT_ACCESS_NOT_AVAILABLE',
          'Access profile is not available for the selected company',
        );
      }

      // Alias duplicate

      const [aliasRows] = await pool.query(
        `
            SELECT
              id_admin_acct

            FROM admin_acct

            WHERE LOWER(alias) =
              LOWER(?)
              AND id_admin_acct != ?

            LIMIT 1
          `,
        [cleanAlias, idAdminAcct],
      );

      if ((aliasRows as any[]).length) {
        return sendError(res, 409, 'ADMIN_ACCOUNT_ALIAS_EXISTS', 'Alias is already in use');
      }

      // Email duplicate

      const emailValues = [cleanEmail1, cleanEmail2].filter((value): value is string =>
        Boolean(value),
      );

      const emailPlaceholders = emailValues.map(() => '?').join(', ');

      const [emailRows] = await pool.query(
        `
            SELECT
              id_admin_acct

            FROM admin_acct

            WHERE id_admin_acct != ?
              AND (
                email_1 IN (
                  ${emailPlaceholders}
                )
                OR email_2 IN (
                  ${emailPlaceholders}
                )
              )

            LIMIT 1
          `,
        [idAdminAcct, ...emailValues, ...emailValues],
      );

      if ((emailRows as any[]).length) {
        return sendError(res, 409, 'ADMIN_ACCOUNT_EMAIL_EXISTS', 'Email address is already in use');
      }

      // Phone duplicate

      const phoneValues = [cleanPhone1, cleanPhone2].filter((value): value is string =>
        Boolean(value),
      );

      const phonePlaceholders = phoneValues.map(() => '?').join(', ');

      const [phoneRows] = await pool.query(
        `
            SELECT
              id_admin_acct

            FROM admin_acct

            WHERE id_admin_acct != ?
              AND (
                phone_1 IN (
                  ${phonePlaceholders}
                )
                OR phone_2 IN (
                  ${phonePlaceholders}
                )
              )

            LIMIT 1
          `,
        [idAdminAcct, ...phoneValues, ...phoneValues],
      );

      if ((phoneRows as any[]).length) {
        return sendError(res, 409, 'ADMIN_ACCOUNT_PHONE_EXISTS', 'Phone number is already in use');
      }

      // Update

      await pool.query(
        `
          UPDATE admin_acct

          SET
            id_master_comp = ?,
            id_office = ?,

            name = ?,
            alias = ?,

            email_1 = ?,
            email_2 = ?,

            phone_1 = ?,
            phone_2 = ?,

            id_profile_photo = ?,

            id_chair = ?,
            id_access = ?,

            is_all_access = ?,

            updated = NOW()

          WHERE id_admin_acct = ?
        `,
        [
          idMasterComp,
          idOffice,
          cleanName,
          cleanAlias,
          cleanEmail1,
          cleanEmail2,
          cleanPhone1,
          cleanPhone2,
          idProfilePhoto,
          idChair,
          idAccess,
          requestedAllAccess,
          idAdminAcct,
        ],
      );

      // Audit after

      const auditAfter = {
        id_master_comp: idMasterComp,
        id_office: idOffice,
        name: cleanName,
        alias: cleanAlias,
        email_1: cleanEmail1,
        email_2: cleanEmail2,
        phone_1: cleanPhone1,
        phone_2: cleanPhone2,
        id_profile_photo: idProfilePhoto,
        id_chair: idChair,
        id_access: idAccess,
        is_all_access: requestedAllAccess,
        admin_acct_status: Number(targetUser.admin_acct_status),
      };

      // Audit

      await writeAuditLog({
        req,
        idMasterComp: sessionCompany,
        eventCode: 'admin_account.updated',
        category: 'data_change',
        module: 'admin_account',
        action: 'update',
        actorType: 'admin',
        actorId: sessionAdminId,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_account',
        entityId: idAdminAcct,
        entityLabel: cleanName,
        before: auditBefore,
        after: auditAfter,
        httpStatus: 200,
      });

      return sendSuccess(res, 200, 'ADMIN_ACCOUNT_UPDATED', 'Admin account updated successfully', {
        id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
      });
    } catch (error) {
      console.error('Update admin account error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

// Admin account - update status

router.patch(
  '/api/v1/admin-acct/:id/status',
  verifyToken,
  requirePermission('admin_account.update'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const { admin_acct_status } = req.body;

      const sessionAdminId = req.user?.id_admin_acct;

      // Session

      if (!sessionAdminId) {
        return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
      }

      // Status

      const newStatus = Number(admin_acct_status);

      if (![0, 1].includes(newStatus)) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_STATUS', 'Invalid account status');
      }

      // Target ID

      const decodedAdminAcct = keyhsid.idAdmin.decode(String(id))[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (!decodedAdminAcct || !Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
        return sendError(res, 400, 'ADMIN_ACCOUNT_INVALID_ID', 'Invalid admin account identifier');
      }

      // Get session

      const [sessionRows] = await pool.query(
        `
            SELECT
              id_admin_acct,
              id_master_comp,
              id_office,
              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?

            LIMIT 1
          `,
        [sessionAdminId],
      );

      const sessionUsers = sessionRows as any[];

      if (!sessionUsers.length) {
        return sendError(res, 401, 'AUTH_SESSION_INVALID', 'Invalid session');
      }

      const sessionUser = sessionUsers[0];

      if (Number(sessionUser.admin_acct_status) !== 1) {
        return sendError(res, 403, 'AUTH_ACCOUNT_INACTIVE', 'Your account is not active');
      }

      const sessionCompany = Number(sessionUser.id_master_comp);

      const sessionOffice = Number(sessionUser.id_office);

      const sessionAllAccess = Number(sessionUser.is_all_access);

      // Get target

      const [targetRows] = await pool.query(
        `
            SELECT
              id_admin_acct,

              id_master_comp,
              id_office,

              name,
              alias,

              is_all_access,
              admin_acct_status

            FROM admin_acct

            WHERE id_admin_acct = ?
              AND admin_acct_status IN (0, 1)

            LIMIT 1
          `,
        [idAdminAcct],
      );

      const targetUsers = targetRows as any[];

      if (!targetUsers.length) {
        return sendError(res, 404, 'ADMIN_ACCOUNT_NOT_FOUND', 'Admin account not found');
      }

      const targetUser = targetUsers[0];

      // Company hard boundary

      if (Number(targetUser.id_master_comp) !== sessionCompany) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN',
          'You do not have access to this company account',
        );
      }

      // Office scope

      if (sessionAllAccess !== 1 && Number(targetUser.id_office) !== sessionOffice) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN',
          'You do not have access to this office account',
        );
      }

      // Self deactivation

      if (idAdminAcct === sessionAdminId && newStatus === 0) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_SELF_DEACTIVATION_FORBIDDEN',
          'You cannot deactivate your own account',
        );
      }

      // Protect full access account

      if (Number(targetUser.is_all_access) === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          'ADMIN_ACCOUNT_FULL_ACCESS_STATUS_FORBIDDEN',
          'You are not allowed to change the status of a full-access account',
        );
      }

      // Last full access in company

      if (Number(targetUser.is_all_access) === 1 && newStatus === 0) {
        const [fullAccessRows] = await pool.query(
          `
              SELECT
                COUNT(*) AS total

              FROM admin_acct

              WHERE id_master_comp = ?
                AND is_all_access = 1
                AND admin_acct_status = 1
                AND id_admin_acct != ?
            `,
          [sessionCompany, idAdminAcct],
        );

        const remainingFullAccess = Number((fullAccessRows as any[])[0]?.total ?? 0);

        if (remainingFullAccess === 0) {
          return sendError(
            res,
            409,
            'ADMIN_ACCOUNT_LAST_FULL_ACCESS_REQUIRED',
            'At least one active full-access account must remain in the company',
          );
        }
      }

      // Already same

      if (Number(targetUser.admin_acct_status) === newStatus) {
        return sendSuccess(
          res,
          200,
          newStatus === 1 ? 'ADMIN_ACCOUNT_ALREADY_ACTIVE' : 'ADMIN_ACCOUNT_ALREADY_INACTIVE',
          newStatus === 1 ? 'Admin account is already active' : 'Admin account is already inactive',
          {
            id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
            admin_acct_status: newStatus,
          },
        );
      }

      // Update

      await pool.query(
        `
          UPDATE admin_acct

          SET
            admin_acct_status = ?,
            updated = NOW()

          WHERE id_admin_acct = ?
        `,
        [newStatus, idAdminAcct],
      );

      // Audit

      await writeAuditLog({
        req,
        idMasterComp: sessionCompany,
        eventCode: 'admin_account.status_changed',
        category: 'data_change',
        module: 'admin_account',
        action: 'status_change',
        actorType: 'admin',
        actorId: sessionAdminId,
        actorLabel: req.user?.alias ?? null,
        entityType: 'admin_account',
        entityId: idAdminAcct,
        entityLabel: targetUser.name,
        before: {
          admin_acct_status: Number(targetUser.admin_acct_status),
        },
        after: {
          admin_acct_status: newStatus,
        },
        metadata: {
          transition: newStatus === 1 ? 'activated' : 'deactivated',
        },
        httpStatus: 200,
      });

      return sendSuccess(
        res,
        200,
        newStatus === 1 ? 'ADMIN_ACCOUNT_ACTIVATED' : 'ADMIN_ACCOUNT_DEACTIVATED',
        newStatus === 1
          ? 'Admin account activated successfully'
          : 'Admin account deactivated successfully',
        {
          id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
          admin_acct_status: newStatus,
        },
      );
    } catch (error) {
      console.error('Update admin account status error:', error);

      return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  },
);

export default router;
