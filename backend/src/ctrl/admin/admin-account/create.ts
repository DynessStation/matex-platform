// Create an admin account.
import express = require("express");
import bcrypt from "bcrypt";
import keyhsid from "../../../hsid";
import db = require("../../../db");

import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";
import { resolveAdminProfilePhoto } from "./profile-photo";

const { pool } = db;

const router = express.Router();

//==================================================
//==== ADMIN ACCOUNT - CREATE
//==================================================

router.post(
  "/api/v1/admin-acct",

  verifyToken,

  requirePermission("admin_account.create"),

  async (req: AuthRequest, res) => {
    try {
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

        password,
      } = req.body;

      //==================================================
      //==== REQUIRED VALIDATION
      //==================================================

      if (
        !name ||
        !alias ||
        !email_1 ||
        !phone_1 ||
        !id_master_comp ||
        !id_office ||
        !id_chair ||
        !id_access ||
        !password
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_REQUIRED_FIELDS_MISSING",
          "Required fields are missing",
        );
      }

      //==================================================
      //==== NORMALIZE INPUT
      //==================================================

      const cleanName = String(name).trim();

      const cleanAlias = String(alias).trim();

      const cleanEmail1 = String(email_1).trim().toLowerCase();

      const cleanEmail2 = email_2 ? String(email_2).trim().toLowerCase() : null;

      const cleanPhone1 = String(phone_1).trim();

      const cleanPhone2 = phone_2 ? String(phone_2).trim() : null;

      //==================================================
      //==== NAME VALIDATION
      //==================================================

      if (cleanName.length > 50 || !/^[\p{L}\s.,'-]+$/u.test(cleanName)) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_NAME_INVALID",
          "Invalid name format",
        );
      }

      //==================================================
      //==== ALIAS VALIDATION
      //==================================================

      if (cleanAlias.length > 15 || !/^[a-zA-Z0-9]+$/.test(cleanAlias)) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_ALIAS_INVALID",
          "Invalid alias format",
        );
      }

      //==================================================
      //==== EMAIL VALIDATION
      //==================================================

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(cleanEmail1) ||
        (cleanEmail2 && !emailRegex.test(cleanEmail2))
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_EMAIL_INVALID",
          "Invalid email address",
        );
      }

      //==================================================
      //==== PHONE VALIDATION
      //==================================================

      const phoneRegex = /^\+[1-9]\d{6,14}$/;

      if (
        !phoneRegex.test(cleanPhone1) ||
        (cleanPhone2 && !phoneRegex.test(cleanPhone2))
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_PHONE_INVALID",
          "Invalid phone number",
        );
      }

      //==================================================
      //==== PASSWORD VALIDATION
      //==================================================

      const cleanPassword = String(password);

      if (
        cleanPassword.length < 8 ||
        cleanPassword.length > 64 ||
        /\s/.test(cleanPassword) ||
        !/[^a-zA-Z]/.test(cleanPassword)
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_PASSWORD_INVALID",
          "Invalid password format",
        );
      }

      //==================================================
      //==== DECODE HASHIDS
      //==================================================

      const decodedMasterComp =
        keyhsid.idMasterCompany.decode(id_master_comp)[0];

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
          "ADMIN_ACCOUNT_REFERENCE_INVALID",
          "Invalid reference identifier",
        );
      }

      //==================================================
      //==== SESSION ACCOUNT
      //==================================================

      const sessionAdminId = req.user?.id_admin_acct;

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

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
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const sessionUser = sessionUsers[0];

      if (Number(sessionUser.admin_acct_status) !== 1) {
        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      const sessionCompany = Number(sessionUser.id_master_comp);

      const sessionOffice = Number(sessionUser.id_office);

      const sessionAllAccess = Number(sessionUser.is_all_access);

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (idMasterComp !== sessionCompany) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_CREATE_COMPANY_SCOPE_FORBIDDEN",
          "You cannot create an account outside your company",
        );
      }

      //==================================================
      //==== OFFICE SCOPE
      //==================================================

      if (sessionAllAccess !== 1 && idOffice !== sessionOffice) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_CREATE_OFFICE_SCOPE_FORBIDDEN",
          "You cannot create an account outside your assigned office",
        );
      }

      //==================================================
      //==== FULL ACCESS
      //==================================================

      const requestedAllAccess = is_all_access ? 1 : 0;

      if (requestedAllAccess === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_FULL_ACCESS_GRANT_FORBIDDEN",
          "You are not allowed to grant full company access",
        );
      }

      //==================================================
      //==== VALIDATE COMPANY
      //==================================================

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
          "ADMIN_ACCOUNT_COMPANY_NOT_AVAILABLE",
          "Company is not available",
        );
      }

      //==================================================
      //==== VALIDATE OFFICE + COMPANY
      //==================================================

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
          "ADMIN_ACCOUNT_OFFICE_COMPANY_MISMATCH",
          "Office does not belong to the selected company",
        );
      }

      //==================================================
      //==== VALIDATE PROFILE PHOTO
      //==================================================

      const profilePhotoResult = await resolveAdminProfilePhoto(
        id_profile_photo,
        {
          idMasterComp,
          idOffice,

          isAllAccess: sessionAllAccess,
        },
      );

      if (!profilePhotoResult.success) {
        return sendError(
          res,
          profilePhotoResult.status,
          profilePhotoResult.code,
          profilePhotoResult.message,
        );
      }

      const idProfilePhoto = profilePhotoResult.idAttachment;

      //==================================================
      //==== VALIDATE CHAIR + COMPANY
      //==================================================

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
          "ADMIN_ACCOUNT_CHAIR_NOT_AVAILABLE",
          "Position is not available for the selected company",
        );
      }
      //==================================================
      //==== VALIDATE ACCESS + COMPANY
      //==================================================

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
          "ADMIN_ACCOUNT_ACCESS_NOT_AVAILABLE",
          "Access profile is not available for the selected company",
        );
      }

      //==================================================
      //==== CHECK ALIAS DUPLICATE
      //==================================================

      const [aliasRows] = await pool.query(
        `
            SELECT
              id_admin_acct

            FROM admin_acct

            WHERE LOWER(alias) =
              LOWER(?)

            LIMIT 1
          `,
        [cleanAlias],
      );

      if ((aliasRows as any[]).length) {
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_ALIAS_EXISTS",
          "Alias is already in use",
        );
      }

      //==================================================
      //==== CHECK EMAIL DUPLICATE
      //==================================================

      const emailValues = [cleanEmail1, cleanEmail2].filter(
        (value): value is string => Boolean(value),
      );

      const emailPlaceholders = emailValues.map(() => "?").join(", ");

      const [emailRows] = await pool.query(
        `
            SELECT
              id_admin_acct

            FROM admin_acct

            WHERE
              email_1 IN (
                ${emailPlaceholders}
              )
              OR email_2 IN (
                ${emailPlaceholders}
              )

            LIMIT 1
          `,
        [...emailValues, ...emailValues],
      );

      if ((emailRows as any[]).length) {
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_EMAIL_EXISTS",
          "Email address is already in use",
        );
      }

      //==================================================
      //==== CHECK PHONE DUPLICATE
      //==================================================

      const phoneValues = [cleanPhone1, cleanPhone2].filter(
        (value): value is string => Boolean(value),
      );

      const phonePlaceholders = phoneValues.map(() => "?").join(", ");

      const [phoneRows] = await pool.query(
        `
            SELECT
              id_admin_acct

            FROM admin_acct

            WHERE
              phone_1 IN (
                ${phonePlaceholders}
              )
              OR phone_2 IN (
                ${phonePlaceholders}
              )

            LIMIT 1
          `,
        [...phoneValues, ...phoneValues],
      );

      if ((phoneRows as any[]).length) {
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_PHONE_EXISTS",
          "Phone number is already in use",
        );
      }

      //==================================================
      //==== PASSWORD
      //==================================================

      const passwordHash = await bcrypt.hash(cleanPassword, 12);

      //==================================================
      //==== UUID
      //==================================================

      let accountUuid = 0;

      let uuidAvailable = false;

      while (!uuidAvailable) {
        accountUuid = Math.floor(100000000 + Math.random() * 900000000);

        const [uuidRows] = await pool.query(
          `
              SELECT
                id_admin_acct

              FROM admin_acct

              WHERE uuid = ?

              LIMIT 1
            `,
          [accountUuid],
        );

        uuidAvailable = !(uuidRows as any[]).length;
      }

      //==================================================
      //==== INSERT
      //==================================================

      const [insertResult] = await pool.query(
        `
            INSERT INTO admin_acct
            (
              id_master_comp,
              id_office,

              password,

              name,
              alias,

              email_1,
              email_2,

              phone_1,
              phone_2,

              id_profile_photo,

              uuid,

              id_chair,
              id_access,

              is_all_access,

              fcm,

              created,
              updated,

              admin_acct_status
            )
            VALUES
            (
              ?,
              ?,

              ?,

              ?,
              ?,

              ?,
              ?,

              ?,
              ?,

              ?,

              ?,

              ?,
              ?,

              ?,

              NULL,

              NOW(),
              NOW(),

              1
            )
          `,
        [
          idMasterComp,
          idOffice,

          passwordHash,

          cleanName,
          cleanAlias,

          cleanEmail1,
          cleanEmail2,

          cleanPhone1,
          cleanPhone2,

          idProfilePhoto,

          accountUuid,

          idChair,
          idAccess,

          requestedAllAccess,
        ],
      );

      const insertData = insertResult as any;

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        idMasterComp,

        eventCode: "admin_account.created",

        category: "data_change",

        module: "admin_account",

        action: "create",

        actorType: "admin",

        actorId: sessionAdminId,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_account",

        entityId: insertData.insertId,

        entityLabel: cleanName,

        after: {
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

          admin_acct_status: 1,
        },

        httpStatus: 201,
      });

      return sendSuccess(
        res,
        201,
        "ADMIN_ACCOUNT_CREATED",
        "Admin account created successfully",
        {
          id_admin_acct: keyhsid.idAdmin.encode(insertData.insertId),
        },
      );
    } catch (error) {
      console.error("Create admin account error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

export default router;
