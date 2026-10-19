// Admin session: login, logout, and the current session (/me).
import express = require("express");
import jwt from "jsonwebtoken";
import multer from "multer";
import bcrypt from "bcrypt";
import keyhsid from "../../../hsid";
import db = require("../../../db");

import { AuthRequest, verifyToken } from "../../middleware/authJwt";
import { buildAttachmentUrl } from "../../../helper/attachment.helper";
import { accessTokenCookieOptions } from "../../../config/cookie.config";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";

const { pool } = db;

const router = express.Router();

//==================================================
//==== MASK LOGIN IDENTITY
//==================================================

const maskLoginIdentity = (value: unknown): string | null => {
  const clean = String(value ?? "").trim();

  if (!clean) {
    return null;
  }

  //==================================================
  //==== EMAIL
  //==================================================

  if (clean.includes("@")) {
    const [local, domain] = clean.split("@");

    if (!domain) {
      return "***";
    }

    const visibleLocal = local.slice(0, 2);

    return `${visibleLocal}***@${domain}`;
  }

  //==================================================
  //==== PHONE / OTHER IDENTITY
  //==================================================

  if (clean.length <= 4) {
    return "***";
  }

  return `***${clean.slice(-4)}`;
};

// login
router.post("/api/v1/admin-acct/login", multer().none(), async (req, res) => {
  const { body } = req;

  try {
    const { identity, password } = body;

    // =========================================
    // VALIDATION
    // =========================================

    if (!identity || !password) {
      return sendError(
        res,
        400,
        "AUTH_LOGIN_FIELDS_REQUIRED",
        "Email/Phone and password are required",
      );
    }

    // =========================================
    // GET ACCOUNT
    // =========================================

    const query = `
            SELECT
                aa.id_admin_acct,
                aa.id_master_comp,
                aa.id_office,
                aa.password,
                aa.name,
                aa.alias,
                aa.email_1,
                aa.email_2,
                aa.phone_1,
                aa.phone_2,
                aa.id_profile_photo,

                pa.id_attachment AS profile_attachment_id,
                pa.collection_name AS profile_collection_name,
                pa.name AS profile_name,
                pa.original_name AS profile_original_name,
                pa.file_name AS profile_file_name,
                pa.mime_type AS profile_mime_type,
                pa.extension AS profile_extension,
                pa.disk AS profile_disk,
                pa.storage_path AS profile_storage_path,
                pa.file_size AS profile_file_size,
                pa.width AS profile_width,
                pa.height AS profile_height,
                aa.id_chair,
                aa.id_access,
                aa.is_all_access,
                aa.admin_acct_status,

                mc.comp_name,
                mc.comp_alias,

                o.office_name,
                o.address,

                ch.chair_name,
                ch.chair_description,

                ac.access_name,
                ac.admin_access_status

            FROM admin_acct aa

            INNER JOIN master_comp mc
                ON aa.id_master_comp = mc.id_master_comp

            INNER JOIN office o
                ON aa.id_office = o.id_office

            INNER JOIN chair ch
                ON aa.id_chair = ch.id_chair

            INNER JOIN admin_access ac
                ON aa.id_access = ac.id_admin_access

            LEFT JOIN attachment pa
                ON aa.id_profile_photo = pa.id_attachment
                AND pa.collection_name = 'admin_profile'
                AND pa.attachment_status = 1
                AND pa.deleted_at IS NULL

            WHERE (
                aa.email_1 = ?
                OR aa.phone_1 = ?
            )

            LIMIT 1
        `;

    const [rows] = await pool.query(query, [identity, identity]);

    const users = rows as any[];

    if (users.length === 0) {
      //==================================================
      //==== AUDIT FAILED LOGIN
      //==================================================

      await writeAuditLog({
        req,

        writeMode: "best_effort",

        eventCode: "auth.login.failed",

        category: "security",

        module: "auth",

        action: "login",

        actorType: "admin",

        actorId: null,

        actorLabel: null,

        entityType: "admin_account",

        entityId: null,

        entityLabel: maskLoginIdentity(identity),

        outcome: "failure",

        metadata: {
          reason: "account_not_found",

          identity_hint: maskLoginIdentity(identity),
        },

        httpStatus: 401,
      });

      return sendError(
        res,
        401,
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email/phone or password",
      );
    }

    const user = users[0];

    //==================================================
    //==== VERIFY PASSWORD
    //==================================================

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      //==================================================
      //==== AUDIT FAILED LOGIN
      //==================================================

      await writeAuditLog({
        req,

        writeMode: "best_effort",

        idMasterComp: Number(user.id_master_comp),

        eventCode: "auth.login.failed",

        category: "security",

        module: "auth",

        action: "login",

        actorType: "admin",

        actorId: Number(user.id_admin_acct),

        actorLabel: user.alias ?? null,

        entityType: "admin_account",

        entityId: Number(user.id_admin_acct),

        entityLabel: user.alias ?? null,

        outcome: "failure",

        metadata: {
          reason: "password_mismatch",

          identity_hint: maskLoginIdentity(identity),
        },

        httpStatus: 401,
      });

      return sendError(
        res,
        401,
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email/phone or password",
      );
    }

    //==================================================
    //==== ACCOUNT STATUS
    //==================================================

    if (Number(user.admin_acct_status) !== 1) {
      await writeAuditLog({
        req,

        writeMode: "best_effort",

        idMasterComp: Number(user.id_master_comp),

        eventCode: "auth.login.denied",

        category: "security",

        module: "auth",

        action: "login",

        actorType: "admin",

        actorId: Number(user.id_admin_acct),

        actorLabel: user.alias ?? null,

        entityType: "admin_account",

        entityId: Number(user.id_admin_acct),

        entityLabel: user.alias ?? null,

        outcome: "denied",

        metadata: {
          reason: "account_inactive",
        },

        httpStatus: 403,
      });

      return sendError(
        res,
        403,
        "AUTH_ACCOUNT_INACTIVE",
        "Your account is not active",
      );
    }

    //==================================================
    //==== ACCESS PROFILE STATUS
    //==================================================

    if (
      Number(user.is_all_access) !== 1 &&
      Number(user.admin_access_status) !== 1
    ) {
      await writeAuditLog({
        req,

        writeMode: "best_effort",

        idMasterComp: Number(user.id_master_comp),

        eventCode: "auth.login.denied",

        category: "security",

        module: "auth",

        action: "login",

        actorType: "admin",

        actorId: Number(user.id_admin_acct),

        actorLabel: user.alias ?? null,

        entityType: "admin_account",

        entityId: Number(user.id_admin_acct),

        entityLabel: user.alias ?? null,

        outcome: "denied",

        metadata: {
          reason: "access_profile_inactive",

          id_access: Number(user.id_access),
        },

        httpStatus: 403,
      });

      return sendError(
        res,
        403,
        "AUTH_ACCESS_PROFILE_INACTIVE",
        "Your access profile is not active",
      );
    }

    // =========================================
    // PERMISSION CHECK
    // =========================================

    const permissionQuery = `
            SELECT
                ap.permission_key

            FROM admin_access_permission aap

            INNER JOIN admin_permission ap
                ON aap.id_admin_permission = ap.id_admin_permission

            WHERE aap.id_admin_access = ?
                AND ap.permission_status = 1

            ORDER BY ap.id_admin_permission ASC
        `;

    const [permissionRows] = await pool.query(permissionQuery, [
      user.id_access,
    ]);

    const permissionData = permissionRows as any[];

    const permissions = permissionData.map((item) => item.permission_key);

    // =========================================
    // GENERATE JWT
    // =========================================

    const payload = {
      id_admin_acct: user.id_admin_acct,
      alias: user.alias,
      id_access: user.id_access,
    };

    const secretKey = process.env.JWT_SECRET;

    if (!secretKey) {
      throw new Error("JWT_SECRET is not configured");
    }

    const jwtExpiresIn: jwt.SignOptions["expiresIn"] =
      (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) || "24h";

    if (!jwtExpiresIn) {
      throw new Error("JWT_EXPIRES_IN is not configured");
    }

    const token = jwt.sign(payload, secretKey as jwt.Secret, {
      expiresIn: jwtExpiresIn,
    });

    res.cookie("access_token", token, {
      ...accessTokenCookieOptions(),
      maxAge: 24 * 60 * 60 * 1000,
    });

    const decodedToken = jwt.decode(token) as jwt.JwtPayload;

    const tokenIssuedAt = decodedToken.iat ? decodedToken.iat * 1000 : null;

    const tokenExpiresAt = decodedToken.exp ? decodedToken.exp * 1000 : null;

    //==================================================
    //==== PROFILE PHOTO
    //==================================================

    const profilePhoto = user.profile_attachment_id
      ? {
          id_attachment: keyhsid.idAttachment.encode(
            user.profile_attachment_id,
          ),

          collection_name: user.profile_collection_name,

          name: user.profile_name,

          original_name: user.profile_original_name,

          file_name: user.profile_file_name,

          mime_type: user.profile_mime_type,

          extension: user.profile_extension,

          disk: user.profile_disk,

          storage_path: user.profile_storage_path,

          file_size: Number(user.profile_file_size),

          width: user.profile_width,

          height: user.profile_height,

          asset_url: buildAttachmentUrl(user.profile_storage_path),
        }
      : null;

    //==================================================
    //==== AUDIT LOGIN SUCCESS
    //==================================================

    await writeAuditLog({
      req,

      writeMode: "best_effort",

      idMasterComp: Number(user.id_master_comp),

      eventCode: "auth.login.succeeded",

      category: "security",

      module: "auth",

      action: "login",

      actorType: "admin",

      actorId: Number(user.id_admin_acct),

      actorLabel: user.alias ?? null,

      entityType: "admin_account",

      entityId: Number(user.id_admin_acct),

      entityLabel: user.alias ?? null,

      outcome: "success",

      metadata: {
        id_office: Number(user.id_office),

        id_access: Number(user.id_access),

        is_all_access: Number(user.is_all_access),
      },

      httpStatus: 200,
    });

    // =========================================
    // RESPONSE
    // =========================================

    return res.status(200).json({
      success: true,
      code: "AUTH_LOGIN_SUCCESS",
      message: "Login successful",
      session: {
        issued_at: tokenIssuedAt,
        expires_at: tokenExpiresAt,
      },
      data: {
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
          permissions: permissions,
        },
        is_all_access: user.is_all_access,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "Internal Server Error",
    );
  }
});

//==================================================
//==== LOGOUT
//==================================================

router.post(
  "/api/v1/admin-acct/logout",

  async (
    req: AuthRequest,

    res,
  ) => {
    const token = req.cookies?.access_token;

    let logoutUser: jwt.JwtPayload | null = null;

    //==================================================
    //==== OPTIONAL TOKEN VERIFY
    //==================================================

    if (token && process.env.JWT_SECRET) {
      try {
        logoutUser = jwt.verify(
          token,

          process.env.JWT_SECRET,
        ) as jwt.JwtPayload;
      } catch {
        //==================================================
        //==== INVALID / EXPIRED TOKEN
        //==== LOGOUT MUST STILL SUCCEED
        //==================================================
      }
    }

    //==================================================
    //==== CLEAR COOKIE
    //==================================================

    res.clearCookie("access_token", accessTokenCookieOptions());

    //==================================================
    //==== AUDIT KNOWN SESSION
    //==================================================

    const logoutAdminId = Number(logoutUser?.id_admin_acct);

    if (Number.isInteger(logoutAdminId) && logoutAdminId > 0) {
      try {
        const [rows] = await pool.query(
          `
              SELECT
                id_admin_acct,

                id_master_comp,

                alias

              FROM admin_acct

              WHERE id_admin_acct = ?

              LIMIT 1
            `,
          [logoutAdminId],
        );

        const users = rows as any[];

        if (users.length) {
          const user = users[0];

          await writeAuditLog({
            req,

            writeMode: "best_effort",

            idMasterComp: Number(user.id_master_comp),

            eventCode: "auth.logout",

            category: "security",

            module: "auth",

            action: "logout",

            actorType: "admin",

            actorId: logoutAdminId,

            actorLabel: user.alias ?? logoutUser?.alias ?? null,

            entityType: "admin_account",

            entityId: logoutAdminId,

            entityLabel: user.alias ?? null,

            outcome: "success",

            httpStatus: 200,
          });
        }
      } catch (error) {
        //==================================================
        //==== LOGOUT MUST NOT FAIL BECAUSE AUDIT LOOKUP FAILS
        //==================================================

        console.error("Logout audit error:", error);
      }
    }

    return sendSuccess(res, 200, "AUTH_LOGOUT_SUCCESS", "Logout successful");
  },
);

//==================================================
//==== ME / CURRENT SESSION
//==================================================

router.get(
  "/api/v1/admin-acct/me",

  verifyToken,

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      //==================================================
      //==== SESSION IDENTITY
      //==================================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          eventCode: "auth.session.invalid",

          category: "security",

          module: "auth",

          action: "session",

          actorType: "admin",

          actorId: null,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_account",

          entityId: null,

          entityLabel: req.user?.alias ?? null,

          outcome: "denied",

          metadata: {
            reason: "missing_admin_identity",
          },

          httpStatus: 401,
        });

        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== CURRENT ACCOUNT
      //==================================================

      const query = `
        SELECT
          aa.id_admin_acct,

          aa.id_master_comp,
          aa.id_office,

          aa.name,
          aa.alias,

          aa.email_1,
          aa.email_2,

          aa.phone_1,
          aa.phone_2,

          aa.id_profile_photo,

          pa.id_attachment
            AS profile_attachment_id,

          pa.collection_name
            AS profile_collection_name,

          pa.name
            AS profile_name,

          pa.original_name
            AS profile_original_name,

          pa.file_name
            AS profile_file_name,

          pa.mime_type
            AS profile_mime_type,

          pa.extension
            AS profile_extension,

          pa.disk
            AS profile_disk,

          pa.storage_path
            AS profile_storage_path,

          pa.file_size
            AS profile_file_size,

          pa.width
            AS profile_width,

          pa.height
            AS profile_height,

          aa.id_chair,
          aa.id_access,

          aa.is_all_access,
          aa.admin_acct_status,

          mc.comp_name,
          mc.comp_alias,

          o.office_name,
          o.address,

          ch.chair_name,
          ch.chair_description,

          ac.access_name,

          ac.id_master_comp
            AS access_master_comp,

          ac.admin_access_status

        FROM admin_acct aa

        INNER JOIN master_comp mc
          ON aa.id_master_comp =
            mc.id_master_comp

        INNER JOIN office o
          ON aa.id_office =
            o.id_office

        INNER JOIN chair ch
          ON aa.id_chair =
            ch.id_chair

        INNER JOIN admin_access ac
          ON aa.id_access =
            ac.id_admin_access

        LEFT JOIN attachment pa
          ON aa.id_profile_photo =
            pa.id_attachment

          AND pa.collection_name =
            'admin_profile'

          AND pa.attachment_status = 1

          AND pa.deleted_at IS NULL

        WHERE aa.id_admin_acct = ?

        LIMIT 1
      `;

      const [rows] = await pool.query(
        query,

        [idAdminAcct],
      );

      const users = rows as any[];

      //==================================================
      //==== ACCOUNT NOT FOUND
      //==================================================

      if (!users.length) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          eventCode: "auth.session.invalid",

          category: "security",

          module: "auth",

          action: "session",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "admin_account",

          entityId: idAdminAcct,

          entityLabel: req.user?.alias ?? null,

          outcome: "denied",

          metadata: {
            reason: "account_not_found",
          },

          httpStatus: 401,
        });

        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const user = users[0];

      const idMasterComp = Number(user.id_master_comp);

      const actorAlias = user.alias ?? req.user?.alias ?? null;

      //==================================================
      //==== ACCOUNT STATUS
      //==================================================

      if (Number(user.admin_acct_status) !== 1) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.account.inactive",

          category: "security",

          module: "auth",

          action: "session",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_account",

          entityId: idAdminAcct,

          entityLabel: actorAlias,

          outcome: "denied",

          metadata: {
            reason: "account_inactive",
          },

          httpStatus: 403,
        });

        return sendError(
          res,
          403,
          "AUTH_ACCOUNT_INACTIVE",
          "Your account is not active",
        );
      }

      //==================================================
      //==== ACCESS COMPANY CONSISTENCY
      //==================================================

      if (Number(user.access_master_comp) !== idMasterComp) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.access_company_mismatch",

          category: "security",

          module: "auth",

          action: "session",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_access",

          entityId: Number(user.id_access),

          entityLabel: user.access_name ?? null,

          outcome: "denied",

          metadata: {
            reason: "access_company_mismatch",

            account_master_comp: idMasterComp,

            access_master_comp: Number(user.access_master_comp),

            id_access: Number(user.id_access),
          },

          httpStatus: 403,
        });

        return sendError(
          res,
          403,
          "AUTH_ACCESS_COMPANY_MISMATCH",
          "Access profile does not belong to your company",
        );
      }

      //==================================================
      //==== ACCESS PROFILE STATUS
      //==================================================

      if (
        Number(user.is_all_access) !== 1 &&
        Number(user.admin_access_status) !== 1
      ) {
        await writeAuditLog({
          req,

          writeMode: "best_effort",

          idMasterComp,

          eventCode: "auth.access_profile.inactive",

          category: "access_control",

          module: "auth",

          action: "session",

          actorType: "admin",

          actorId: idAdminAcct,

          actorLabel: actorAlias,

          entityType: "admin_access",

          entityId: Number(user.id_access),

          entityLabel: user.access_name ?? null,

          outcome: "denied",

          metadata: {
            reason: "access_profile_inactive",

            id_access: Number(user.id_access),
          },

          httpStatus: 403,
        });

        return sendError(
          res,
          403,
          "AUTH_ACCESS_PROFILE_INACTIVE",
          "Your access profile is not active",
        );
      }

      //==================================================
      //==== PROFILE PHOTO
      //==================================================

      const profilePhoto = user.profile_attachment_id
        ? {
            id_attachment: keyhsid.idAttachment.encode(
              user.profile_attachment_id,
            ),

            collection_name: user.profile_collection_name,

            name: user.profile_name,

            original_name: user.profile_original_name,

            file_name: user.profile_file_name,

            mime_type: user.profile_mime_type,

            extension: user.profile_extension,

            disk: user.profile_disk,

            storage_path: user.profile_storage_path,

            file_size: Number(user.profile_file_size),

            width: user.profile_width,

            height: user.profile_height,

            asset_url: buildAttachmentUrl(user.profile_storage_path),
          }
        : null;

      //==================================================
      //==== PERMISSIONS
      //==================================================

      const permissionQuery = `
        SELECT
          ap.permission_key

        FROM admin_access_permission aap

        INNER JOIN admin_permission ap
          ON aap.id_admin_permission =
            ap.id_admin_permission

        WHERE aap.id_admin_access = ?
          AND ap.permission_status = 1

        ORDER BY
          ap.id_admin_permission ASC
      `;

      const [permissionRows] = await pool.query(
        permissionQuery,

        [user.id_access],
      );

      const permissionData = permissionRows as any[];

      const permissions = permissionData.map((item) => item.permission_key);

      //==================================================
      //==== RESPONSE
      //==================================================

      return res.status(200).json({
        success: true,

        code: "AUTH_AUTHENTICATED",

        message: "Authenticated",

        session: {
          issued_at: req.user?.issued_at ?? null,

          expires_at: req.user?.expires_at ?? null,
        },

        data: {
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
        },
      });
    } catch (error) {
      console.error("Get authenticated user error:", error);

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
