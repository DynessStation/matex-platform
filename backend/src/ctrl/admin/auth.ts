import express = require("express");
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import db = require("../../db");

import helper from "../../helpers";
import bcrypt from "bcrypt";
import hashids from "hashids";
import keyhsid from "../../hsid";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";
import { buildAttachmentUrl } from "../../helper/attachment.helper";

import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { writeAuditLog } from "../../helper/audit-log.helper";

const app = express();

const { pool } = db;

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

//==================================================
//==== ADMIN PROFILE PHOTO VALIDATION
//==================================================

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

const resolveAdminProfilePhoto = async (
  value: unknown,

  scope: {
    idMasterComp: number;
    idOffice: number;
    isAllAccess: number;
  },
): Promise<ProfilePhotoValidationResult> => {
  //==================================================
  //==== EMPTY
  //==================================================

  if (value === undefined || value === null || String(value).trim() === "") {
    return {
      success: true,
      idAttachment: null,
    };
  }

  //==================================================
  //==== DECODE
  //==================================================

  const encodedAttachment = String(value).trim();

  const decodedAttachment = keyhsid.idAttachment.decode(encodedAttachment)[0];

  const idAttachment = Number(decodedAttachment);

  if (
    !decodedAttachment ||
    !Number.isInteger(idAttachment) ||
    idAttachment <= 0
  ) {
    return {
      success: false,

      status: 400,

      code: "ADMIN_ACCOUNT_PROFILE_PHOTO_INVALID_ID",

      message: "Invalid profile photo identifier",
    };
  }

  //==================================================
  //==== GET ATTACHMENT
  //==================================================

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

      code: "ADMIN_ACCOUNT_PROFILE_PHOTO_NOT_AVAILABLE",

      message: "Profile photo is not available",
    };
  }

  const attachment = attachments[0];

  //==================================================
  //==== COMPANY SCOPE
  //==================================================

  if (Number(attachment.id_master_comp) !== scope.idMasterComp) {
    return {
      success: false,

      status: 403,

      code: "ADMIN_ACCOUNT_PROFILE_PHOTO_COMPANY_SCOPE_FORBIDDEN",

      message: "Profile photo is outside the company scope",
    };
  }

  //==================================================
  //==== OFFICE SCOPE
  //==================================================

  if (
    scope.isAllAccess !== 1 &&
    Number(attachment.id_office) !== scope.idOffice
  ) {
    return {
      success: false,

      status: 403,

      code: "ADMIN_ACCOUNT_PROFILE_PHOTO_OFFICE_SCOPE_FORBIDDEN",

      message: "Profile photo is outside the office scope",
    };
  }

  //==================================================
  //==== RESULT
  //==================================================

  return {
    success: true,
    idAttachment,
  };
};

pool.on("error" as any, (err) => {
  console.error(err);
});

// ---------- V1 ----------- //

// get accounts
app.get(
  "/api/v1/admin-acct",
  verifyToken,
  requirePermission("admin_account.view"),
  async (req: AuthRequest, res) => {
    const { query } = req;

    let { page, search, limit, ord: order, srt: sort } = query;

    try {
      // =========================================
      // AUTH ACCOUNT
      // =========================================

      const idAdminAcct = req.user?.id_admin_acct;

      if (!idAdminAcct) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      // =========================================
      // GET ACCOUNT SCOPE
      // =========================================

      const [sessionRows] = await pool.query(
        `
        SELECT
            id_master_comp,
            id_office

        FROM admin_acct

        WHERE id_admin_acct = ?
            AND admin_acct_status = 1

        LIMIT 1
    `,
        [idAdminAcct],
      );

      const sessionUsers = sessionRows as any[];

      if (sessionUsers.length === 0) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const idMasterComp = sessionUsers[0].id_master_comp;

      const idOffice = sessionUsers[0].id_office;

      // =========================================
      // PAGINATION
      // =========================================

      const parsedPage =
        typeof page === "string" && page !== "" ? Number(page) : NaN;

      const parsedLimit =
        typeof limit === "string" && limit !== "" ? Number(limit) : 10;

      const pageNumber =
        Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const itemsPerPage =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 100)
          : 10;

      const offset = (pageNumber - 1) * itemsPerPage;

      // =========================================
      // SORTING
      // =========================================

      const allowedOrder: Record<string, string> = {
        id: "aa.id_admin_acct",
        name: "aa.name",
        alias: "aa.alias",
        email_1: "aa.email_1",
        email_2: "aa.email_2",
        phone_1: "aa.phone_1",
        phone_2: "aa.phone_2",
        created: "aa.created",
        updated: "aa.updated",
      };

      const orderQuery =
        typeof order === "string" && allowedOrder[order]
          ? allowedOrder[order]
          : "aa.id_admin_acct";

      const sortQuery = sort === "true" ? "DESC" : "ASC";

      // =========================================
      // SEARCH
      // =========================================

      const searchTerm = typeof search === "string" ? search.trim() : "";

      const searchValue = `%${searchTerm}%`;

      // =========================================
      // COUNT TOTAL DATA
      // =========================================

      const qGetTotal = `
                SELECT
                    COUNT(*) AS total

                FROM admin_acct aa

                WHERE (
                    aa.name LIKE ?
                    OR aa.email_1 LIKE ?
                    OR aa.email_2 LIKE ?
                    OR aa.phone_1 LIKE ?
                    OR aa.phone_2 LIKE ?
                    OR aa.alias LIKE ?
                    OR aa.uuid LIKE ?
                )

                AND aa.id_master_comp = ?
                AND aa.id_office = ?
                AND aa.admin_acct_status IN (0, 1)
            `;

      const [totalRows] = await pool.query(qGetTotal, [
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        idMasterComp,
        idOffice,
      ]);

      const totalData = Number((totalRows as any[])[0].total);

      // =========================================
      // GET DATA
      // =========================================

      const qGetData = `
                SELECT
                    aa.id_admin_acct,

                    mc.id_master_comp,
                    mc.comp_name,
                    mc.comp_alias,

                    o.id_office,
                    o.office_name,

                    aa.name,
                    aa.alias,
                    aa.email_1,
                    aa.email_2,
                    aa.phone_1,
                    aa.phone_2,
                    aa.uuid,

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

                    ch.id_chair,
                    ch.chair_name,
                    ch.chair_description,

                    ac.id_admin_access,
                    ac.access_name,

                    aa.is_all_access,
                    aa.admin_acct_status,
                    aa.created,
                    aa.updated

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
                    aa.name LIKE ?
                    OR aa.email_1 LIKE ? 
                    OR aa.email_2 LIKE ?
                    OR aa.phone_1 LIKE ?
                    OR aa.phone_2 LIKE ?
                    OR aa.alias LIKE ?
                    OR aa.uuid LIKE ?
                )

                AND aa.id_master_comp = ?
                AND aa.id_office = ?
                AND aa.admin_acct_status IN (0, 1)

                ORDER BY ${orderQuery} ${sortQuery}

                LIMIT ? OFFSET ?
            `;

      const [rows] = await pool.query(qGetData, [
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        idMasterComp,
        idOffice,
        itemsPerPage,
        offset,
      ]);

      // =========================================
      // RESPONSE DATA
      // =========================================

      const data = (rows as any[]).map((item) => {
        //==================================================
        //==== PROFILE PHOTO
        //==================================================

        const profilePhoto = item.profile_attachment_id
          ? {
              id_attachment: keyhsid.idAttachment.encode(
                item.profile_attachment_id,
              ),

              collection_name: item.profile_collection_name,

              name: item.profile_name,

              original_name: item.profile_original_name,

              file_name: item.profile_file_name,

              mime_type: item.profile_mime_type,

              extension: item.profile_extension,

              disk: item.profile_disk,

              storage_path: item.profile_storage_path,

              file_size: Number(item.profile_file_size),

              width: item.profile_width,

              height: item.profile_height,

              asset_url: buildAttachmentUrl(item.profile_storage_path),
            }
          : null;

        //==================================================
        //==== RESPONSE
        //==================================================

        return {
          ...item,

          id_admin_acct: keyhsid.idAdmin.encode(item.id_admin_acct),

          id_master_comp: keyhsid.idMasterCompany.encode(item.id_master_comp),

          id_office: keyhsid.idOffice.encode(item.id_office),

          id_chair: keyhsid.idChair.encode(item.id_chair),

          id_admin_access: keyhsid.idAdminAccess.encode(item.id_admin_access),

          id_profile_photo: profilePhoto?.id_attachment ?? null,

          profile_photo: profilePhoto,

          status_label: item.admin_acct_status === 1 ? "Active" : "Inactive",
        };
      });

      // =========================================
      // PAGINATION RESPONSE
      // =========================================

      const pagerows = Math.ceil(totalData / itemsPerPage);

      return res.status(200).json({
        success: true,
        data: data,

        pagination: {
          total: totalData,
          page: pageNumber,
          limit: itemsPerPage,
          length: (rows as any[]).length,
          pagerows: pagerows,
        },
      });
    } catch (error) {
      console.error("Database query error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

// login
app.post("/api/v1/admin-acct/login", multer().none(), async (req, res) => {
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
      httpOnly: true,
      secure: false,
      sameSite: "lax",
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

app.post(
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

    res.clearCookie("access_token", {
      httpOnly: true,

      secure: false,

      sameSite: "lax",
    });

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

app.get(
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

//==================================================
//==== SELECT QUERY HELPER
//==================================================

const getSelectQuery = (query: any) => {
  const parsedPage =
    typeof query.page === "string" && query.page !== ""
      ? Number(query.page)
      : 1;

  const parsedLimit =
    typeof query.limit === "string" && query.limit !== ""
      ? Number(query.limit)
      : 20;

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 50)
      : 20;

  const offset = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : "";

  const searchValue = `%${search}%`;

  return {
    page,
    limit,
    offset,
    search,
    searchValue,
  };
};

//==================================================
//==== ADMIN ACCOUNT - SELECT COMPANY
//==================================================

app.get(
  "/api/v1/admin-acct/select/company",

  verifyToken,

  async (req: AuthRequest, res) => {
    try {
      //==================================================
      //==== SESSION
      //==================================================

      const sessionAdminId = req.user?.id_admin_acct;

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const [sessionRows] = await pool.query(
        `
            SELECT
              id_master_comp,
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

      const idMasterComp = Number(sessionUser.id_master_comp);

      //==================================================
      //==== QUERY PARAMS
      //==================================================

      const { page, limit, offset, searchValue } = getSelectQuery(req.query);

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM master_comp

            WHERE id_master_comp = ?
              AND comp_status = 1
              AND (
                comp_name LIKE ?
                OR comp_alias LIKE ?
              )
          `,
        [idMasterComp, searchValue, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              id_master_comp,
              comp_name,
              comp_alias

            FROM master_comp

            WHERE id_master_comp = ?
              AND comp_status = 1
              AND (
                comp_name LIKE ?
                OR comp_alias LIKE ?
              )

            ORDER BY comp_name ASC

            LIMIT ?
            OFFSET ?
          `,
        [idMasterComp, searchValue, searchValue, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
        value: keyhsid.idMasterCompany.encode(item.id_master_comp),

        label: item.comp_name,

        data: {
          alias: item.comp_alias,
        },
      }));

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          page,
          limit,
          total,

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Company select query error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - SELECT OFFICE
//==================================================

app.get(
  "/api/v1/admin-acct/select/office",

  verifyToken,

  async (req: AuthRequest, res) => {
    try {
      const { id_master_comp } = req.query;

      //==================================================
      //==== COMPANY PARAM
      //==================================================

      if (typeof id_master_comp !== "string" || !id_master_comp) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_COMPANY_REQUIRED",
          "Company is required",
        );
      }

      const decodedMasterComp =
        keyhsid.idMasterCompany.decode(id_master_comp)[0];

      const idMasterComp = Number(decodedMasterComp);

      if (
        !decodedMasterComp ||
        !Number.isInteger(idMasterComp) ||
        idMasterComp <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_COMPANY_INVALID_ID",
          "Invalid company identifier",
        );
      }

      //==================================================
      //==== SESSION
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

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (idMasterComp !== Number(sessionUser.id_master_comp)) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company",
        );
      }

      //==================================================
      //==== QUERY PARAMS
      //==================================================

      const { page, limit, offset, searchValue } = getSelectQuery(req.query);

      const isAllAccess = Number(sessionUser.is_all_access);

      const sessionOffice = Number(sessionUser.id_office);

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM office

            WHERE status = 1
              AND id_master_comp = ?
              AND (
                ? = 1
                OR id_office = ?
              )
              AND (
                office_name LIKE ?
                OR address LIKE ?
              )
          `,
        [idMasterComp, isAllAccess, sessionOffice, searchValue, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              id_office,
              office_name,
              address

            FROM office

            WHERE status = 1
              AND id_master_comp = ?
              AND (
                ? = 1
                OR id_office = ?
              )
              AND (
                office_name LIKE ?
                OR address LIKE ?
              )

            ORDER BY
              office_name ASC

            LIMIT ?
            OFFSET ?
          `,
        [
          idMasterComp,

          isAllAccess,
          sessionOffice,

          searchValue,
          searchValue,

          limit,
          offset,
        ],
      );

      const data = (rows as any[]).map((item) => ({
        value: keyhsid.idOffice.encode(item.id_office),

        label: item.office_name,

        data: {
          address: item.address,
        },
      }));

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          page,
          limit,
          total,

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Office select query error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - SELECT CHAIR
//==================================================

app.get(
  "/api/v1/admin-acct/select/chair",

  verifyToken,

  async (req: AuthRequest, res) => {
    try {
      const { id_master_comp } = req.query;

      //==================================================
      //==== COMPANY PARAM
      //==================================================

      if (typeof id_master_comp !== "string" || !id_master_comp) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_COMPANY_REQUIRED",
          "Company is required",
        );
      }

      const decodedMasterComp =
        keyhsid.idMasterCompany.decode(id_master_comp)[0];

      const idMasterComp = Number(decodedMasterComp);

      if (
        !decodedMasterComp ||
        !Number.isInteger(idMasterComp) ||
        idMasterComp <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_COMPANY_INVALID_ID",
          "Invalid company identifier",
        );
      }

      //==================================================
      //==== SESSION
      //==================================================

      const sessionAdminId = req.user?.id_admin_acct;

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const [sessionRows] = await pool.query(
        `
            SELECT
              id_master_comp,
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

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (idMasterComp !== Number(sessionUser.id_master_comp)) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company",
        );
      }

      //==================================================
      //==== QUERY PARAMS
      //==================================================

      const { page, limit, offset, searchValue } = getSelectQuery(req.query);

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM chair

            WHERE id_master_comp = ?
              AND chair_status = 1
              AND (
                chair_name LIKE ?
                OR COALESCE(
                  chair_description,
                  ''
                ) LIKE ?
              )
          `,
        [idMasterComp, searchValue, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              id_chair,
              chair_name,
              chair_description

            FROM chair

            WHERE id_master_comp = ?
              AND chair_status = 1
              AND (
                chair_name LIKE ?
                OR COALESCE(
                  chair_description,
                  ''
                ) LIKE ?
              )

            ORDER BY chair_name ASC

            LIMIT ?
            OFFSET ?
          `,
        [idMasterComp, searchValue, searchValue, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
        value: keyhsid.idChair.encode(item.id_chair),

        label: item.chair_name,

        data: {
          description: item.chair_description,
        },
      }));

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          page,
          limit,
          total,

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Chair select query error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - SELECT ACCESS
//==================================================

app.get(
  "/api/v1/admin-acct/select/access",

  verifyToken,

  async (req: AuthRequest, res) => {
    try {
      const { id_master_comp } = req.query;

      //==================================================
      //==== COMPANY PARAM
      //==================================================

      if (typeof id_master_comp !== "string" || !id_master_comp) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_COMPANY_REQUIRED",
          "Company is required",
        );
      }

      const decodedMasterComp =
        keyhsid.idMasterCompany.decode(id_master_comp)[0];

      const idMasterComp = Number(decodedMasterComp);

      if (
        !decodedMasterComp ||
        !Number.isInteger(idMasterComp) ||
        idMasterComp <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_COMPANY_INVALID_ID",
          "Invalid company identifier",
        );
      }

      //==================================================
      //==== SESSION
      //==================================================

      const sessionAdminId = req.user?.id_admin_acct;

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      const [sessionRows] = await pool.query(
        `
            SELECT
              id_master_comp,
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

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (idMasterComp !== Number(sessionUser.id_master_comp)) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company",
        );
      }

      //==================================================
      //==== QUERY PARAMS
      //==================================================

      const { page, limit, offset, searchValue } = getSelectQuery(req.query);

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_access

            WHERE id_master_comp = ?
              AND admin_access_status = 1
              AND access_name LIKE ?
          `,
        [idMasterComp, searchValue],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              id_admin_access,
              access_name,
              access_description

            FROM admin_access

            WHERE id_master_comp = ?
              AND admin_access_status = 1
              AND access_name LIKE ?

            ORDER BY
              access_name ASC

            LIMIT ?
            OFFSET ?
          `,
        [idMasterComp, searchValue, limit, offset],
      );

      const data = (rows as any[]).map((item) => ({
        value: keyhsid.idAdminAccess.encode(item.id_admin_access),

        label: item.access_name,

        data: {
          description: item.access_description,
        },
      }));

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          page,
          limit,
          total,

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Access select query error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - CREATE
//==================================================

app.post(
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

//==================================================
//==== ADMIN ACCOUNT - GET DETAIL
//==================================================

app.get(
  "/api/v1/admin-acct/:id",
  verifyToken,
  requirePermission("admin_account.view"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      //==================================================
      //==== DECODE ADMIN ACCOUNT ID
      //==================================================

      const decodedAdminAcct = keyhsid.idAdmin.decode(id as string)[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (
        !decodedAdminAcct ||
        !Number.isInteger(idAdminAcct) ||
        idAdminAcct <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_INVALID_ID",
          "Invalid admin account identifier",
        );
      }

      //==================================================
      //==== GET ADMIN ACCOUNT
      //==================================================

      const qGetData = `
                SELECT
                    aa.id_admin_acct,

                    aa.id_master_comp,
                    mc.comp_name,
                    mc.comp_alias,

                    aa.id_office,
                    o.office_name,

                    aa.id_chair,
                    ch.chair_name,
                    ch.chair_description,

                    aa.id_access,
                    ac.access_name,

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

                    aa.is_all_access,

                    aa.created,
                    aa.updated,

                    aa.admin_acct_status

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

                WHERE aa.id_admin_acct = ?

                LIMIT 1
            `;

      const [rows] = await pool.query(qGetData, [idAdminAcct]);

      const dataRows = rows as any[];

      if (dataRows.length === 0) {
        return sendError(
          res,
          404,
          "ADMIN_ACCOUNT_NOT_FOUND",
          "Admin account not found",
        );
      }

      const account = dataRows[0];

      //==================================================
      //==== SESSION SCOPE
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

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (
        Number(account.id_master_comp) !== Number(sessionUser.id_master_comp)
      ) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company account",
        );
      }

      //==================================================
      //==== OFFICE SCOPE
      //==================================================

      if (
        Number(sessionUser.is_all_access) !== 1 &&
        Number(account.id_office) !== Number(sessionUser.id_office)
      ) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN",
          "You do not have access to this office account",
        );
      }

      //==================================================
      //==== RESPONSE
      //==================================================

      const profilePhoto = account.profile_attachment_id
        ? {
            id_attachment: keyhsid.idAttachment.encode(
              account.profile_attachment_id,
            ),

            collection_name: account.profile_collection_name,

            name: account.profile_name,

            original_name: account.profile_original_name,

            file_name: account.profile_file_name,

            mime_type: account.profile_mime_type,

            extension: account.profile_extension,

            disk: account.profile_disk,

            storage_path: account.profile_storage_path,

            file_size: Number(account.profile_file_size),

            width: account.profile_width,

            height: account.profile_height,

            asset_url: buildAttachmentUrl(account.profile_storage_path),
          }
        : null;

      return res.status(200).json({
        success: true,

        data: {
          id_admin_acct: keyhsid.idAdmin.encode(account.id_admin_acct),

          name: account.name,

          alias: account.alias,

          email_1: account.email_1,

          email_2: account.email_2,

          phone_1: account.phone_1,

          phone_2: account.phone_2,

          id_profile_photo: profilePhoto?.id_attachment ?? null,

          profile_photo: profilePhoto,

          master_comp: {
            id_master_comp: keyhsid.idMasterCompany.encode(
              account.id_master_comp,
            ),

            comp_name: account.comp_name,

            comp_alias: account.comp_alias,
          },

          office: {
            id_office: keyhsid.idOffice.encode(account.id_office),

            office_name: account.office_name,
          },

          chair: {
            id_chair: keyhsid.idChair.encode(account.id_chair),

            chair_name: account.chair_name,

            chair_description: account.chair_description,
          },

          access: {
            id_access: keyhsid.idAdminAccess.encode(account.id_access),

            access_name: account.access_name,
          },

          is_all_access: account.is_all_access,

          admin_acct_status: account.admin_acct_status,

          created: account.created,

          updated: account.updated,
        },
      });
    } catch (error) {
      console.error("Get admin account detail error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - UPDATE
//==================================================

app.put(
  "/api/v1/admin-acct/:id",

  verifyToken,

  requirePermission("admin_account.update"),

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

      //==================================================
      //==== SESSION
      //==================================================

      const sessionAdminId = req.user?.id_admin_acct;

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== TARGET ID
      //==================================================

      const decodedAdminAcct = keyhsid.idAdmin.decode(String(id))[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (
        !decodedAdminAcct ||
        !Number.isInteger(idAdminAcct) ||
        idAdminAcct <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_INVALID_ID",
          "Invalid admin account identifier",
        );
      }

      //==================================================
      //==== REQUIRED
      //==================================================

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
          "ADMIN_ACCOUNT_REQUIRED_FIELDS_MISSING",
          "Required fields are missing",
        );
      }

      //==================================================
      //==== NORMALIZE
      //==================================================

      const cleanName = String(name).trim();

      const cleanAlias = String(alias).trim();

      const cleanEmail1 = String(email_1).trim().toLowerCase();

      const cleanEmail2 = email_2 ? String(email_2).trim().toLowerCase() : null;

      const cleanPhone1 = String(phone_1).trim();

      const cleanPhone2 = phone_2 ? String(phone_2).trim() : null;

      //==================================================
      //==== VALIDATION
      //==================================================

      if (cleanName.length > 50 || !/^[\p{L}\s.,'-]+$/u.test(cleanName)) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_NAME_INVALID",
          "Invalid name format",
        );
      }

      if (cleanAlias.length > 15 || !/^[a-zA-Z0-9]+$/.test(cleanAlias)) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_ALIAS_INVALID",
          "Invalid alias format",
        );
      }

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
      //==== DECODE REFERENCES
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
      //==== GET SESSION ACCOUNT
      //==================================================

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
      //==== GET TARGET ACCOUNT
      //==================================================

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
        return sendError(
          res,
          404,
          "ADMIN_ACCOUNT_NOT_FOUND",
          "Admin account not found",
        );
      }

      const targetUser = targetUsers[0];

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        id_master_comp: Number(targetUser.id_master_comp),

        id_office: Number(targetUser.id_office),

        name: targetUser.name,

        alias: targetUser.alias,

        email_1: targetUser.email_1,

        email_2: targetUser.email_2,

        phone_1: targetUser.phone_1,

        phone_2: targetUser.phone_2,

        id_profile_photo: targetUser.id_profile_photo
          ? Number(targetUser.id_profile_photo)
          : null,

        id_chair: Number(targetUser.id_chair),

        id_access: Number(targetUser.id_access),

        is_all_access: Number(targetUser.is_all_access),

        admin_acct_status: Number(targetUser.admin_acct_status),
      };

      //==================================================
      //==== TARGET COMPANY SCOPE
      //==================================================

      if (Number(targetUser.id_master_comp) !== sessionCompany) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company account",
        );
      }

      //==================================================
      //==== TARGET OFFICE SCOPE
      //==================================================

      if (
        sessionAllAccess !== 1 &&
        Number(targetUser.id_office) !== sessionOffice
      ) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN",
          "You do not have access to this office account",
        );
      }

      //==================================================
      //==== PROTECT FULL ACCESS TARGET
      //==================================================

      if (Number(targetUser.is_all_access) === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_FULL_ACCESS_UPDATE_FORBIDDEN",
          "You are not allowed to update a full-access account",
        );
      }

      //==================================================
      //==== DESTINATION COMPANY
      //==================================================

      if (idMasterComp !== sessionCompany) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_MOVE_COMPANY_FORBIDDEN",
          "You cannot move this account outside your company",
        );
      }

      //==================================================
      //==== DESTINATION OFFICE
      //==================================================

      if (sessionAllAccess !== 1 && idOffice !== sessionOffice) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_MOVE_OFFICE_FORBIDDEN",
          "You cannot move this account outside your assigned office",
        );
      }

      //==================================================
      //==== REQUESTED FULL ACCESS
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
      //==== PREVENT LAST FULL ACCESS LOSS
      //==================================================

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

        const remainingFullAccess = Number(
          (fullAccessRows as any[])[0]?.total ?? 0,
        );

        if (remainingFullAccess === 0) {
          return sendError(
            res,
            409,
            "ADMIN_ACCOUNT_LAST_FULL_ACCESS_REQUIRED",
            "At least one active full-access account must remain in the company",
          );
        }
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
      //==== VALIDATE OFFICE
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
      //==== PROFILE PHOTO
      //==================================================

      let idProfilePhoto: number | null = targetUser.id_profile_photo
        ? Number(targetUser.id_profile_photo)
        : null;

      if (id_profile_photo !== undefined) {
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

        idProfilePhoto = profilePhotoResult.idAttachment;
      }

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
      //==== ALIAS DUPLICATE
      //==================================================

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
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_ALIAS_EXISTS",
          "Alias is already in use",
        );
      }

      //==================================================
      //==== EMAIL DUPLICATE
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
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_EMAIL_EXISTS",
          "Email address is already in use",
        );
      }

      //==================================================
      //==== PHONE DUPLICATE
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
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_PHONE_EXISTS",
          "Phone number is already in use",
        );
      }

      //==================================================
      //==== UPDATE
      //==================================================

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

      //==================================================
      //==== AUDIT AFTER
      //==================================================

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

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        idMasterComp: sessionCompany,

        eventCode: "admin_account.updated",

        category: "data_change",

        module: "admin_account",

        action: "update",

        actorType: "admin",

        actorId: sessionAdminId,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_account",

        entityId: idAdminAcct,

        entityLabel: cleanName,

        before: auditBefore,

        after: auditAfter,

        httpStatus: 200,
      });

      return sendSuccess(
        res,
        200,
        "ADMIN_ACCOUNT_UPDATED",
        "Admin account updated successfully",
        {
          id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
        },
      );
    } catch (error) {
      console.error("Update admin account error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - UPDATE STATUS
//==================================================

app.patch(
  "/api/v1/admin-acct/:id/status",

  verifyToken,

  requirePermission("admin_account.update"),

  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const { admin_acct_status } = req.body;

      const sessionAdminId = req.user?.id_admin_acct;

      //==================================================
      //==== SESSION
      //==================================================

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== STATUS
      //==================================================

      const newStatus = Number(admin_acct_status);

      if (![0, 1].includes(newStatus)) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_INVALID_STATUS",
          "Invalid account status",
        );
      }

      //==================================================
      //==== TARGET ID
      //==================================================

      const decodedAdminAcct = keyhsid.idAdmin.decode(String(id))[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (
        !decodedAdminAcct ||
        !Number.isInteger(idAdminAcct) ||
        idAdminAcct <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_INVALID_ID",
          "Invalid admin account identifier",
        );
      }

      //==================================================
      //==== GET SESSION
      //==================================================

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
      //==== GET TARGET
      //==================================================

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
        return sendError(
          res,
          404,
          "ADMIN_ACCOUNT_NOT_FOUND",
          "Admin account not found",
        );
      }

      const targetUser = targetUsers[0];

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (Number(targetUser.id_master_comp) !== sessionCompany) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company account",
        );
      }

      //==================================================
      //==== OFFICE SCOPE
      //==================================================

      if (
        sessionAllAccess !== 1 &&
        Number(targetUser.id_office) !== sessionOffice
      ) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN",
          "You do not have access to this office account",
        );
      }

      //==================================================
      //==== SELF DEACTIVATION
      //==================================================

      if (idAdminAcct === sessionAdminId && newStatus === 0) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_SELF_DEACTIVATION_FORBIDDEN",
          "You cannot deactivate your own account",
        );
      }

      //==================================================
      //==== PROTECT FULL ACCESS ACCOUNT
      //==================================================

      if (Number(targetUser.is_all_access) === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_FULL_ACCESS_STATUS_FORBIDDEN",
          "You are not allowed to change the status of a full-access account",
        );
      }

      //==================================================
      //==== LAST FULL ACCESS IN COMPANY
      //==================================================

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

        const remainingFullAccess = Number(
          (fullAccessRows as any[])[0]?.total ?? 0,
        );

        if (remainingFullAccess === 0) {
          return sendError(
            res,
            409,
            "ADMIN_ACCOUNT_LAST_FULL_ACCESS_REQUIRED",
            "At least one active full-access account must remain in the company",
          );
        }
      }

      //==================================================
      //==== ALREADY SAME
      //==================================================

      if (Number(targetUser.admin_acct_status) === newStatus) {
        return sendSuccess(
          res,
          200,
          newStatus === 1
            ? "ADMIN_ACCOUNT_ALREADY_ACTIVE"
            : "ADMIN_ACCOUNT_ALREADY_INACTIVE",
          newStatus === 1
            ? "Admin account is already active"
            : "Admin account is already inactive",
          {
            id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),

            admin_acct_status: newStatus,
          },
        );
      }

      //==================================================
      //==== UPDATE
      //==================================================

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

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        idMasterComp: sessionCompany,

        eventCode: "admin_account.status_changed",

        category: "data_change",

        module: "admin_account",

        action: "status_change",

        actorType: "admin",

        actorId: sessionAdminId,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_account",

        entityId: idAdminAcct,

        entityLabel: targetUser.name,

        before: {
          admin_acct_status: Number(targetUser.admin_acct_status),
        },

        after: {
          admin_acct_status: newStatus,
        },

        metadata: {
          transition: newStatus === 1 ? "activated" : "deactivated",
        },

        httpStatus: 200,
      });

      return sendSuccess(
        res,
        200,
        newStatus === 1
          ? "ADMIN_ACCOUNT_ACTIVATED"
          : "ADMIN_ACCOUNT_DEACTIVATED",
        newStatus === 1
          ? "Admin account activated successfully"
          : "Admin account deactivated successfully",
        {
          id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),

          admin_acct_status: newStatus,
        },
      );
    } catch (error) {
      console.error("Update admin account status error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//==================================================
//==== ADMIN ACCOUNT - DELETE
//==================================================

app.delete(
  "/api/v1/admin-acct/:id",

  verifyToken,

  requirePermission("admin_account.delete"),

  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const sessionAdminId = req.user?.id_admin_acct;

      //==================================================
      //==== SESSION
      //==================================================

      if (!sessionAdminId) {
        return sendError(res, 401, "AUTH_SESSION_INVALID", "Invalid session");
      }

      //==================================================
      //==== TARGET ID
      //==================================================

      const decodedAdminAcct = keyhsid.idAdmin.decode(String(id))[0];

      const idAdminAcct = Number(decodedAdminAcct);

      if (
        !decodedAdminAcct ||
        !Number.isInteger(idAdminAcct) ||
        idAdminAcct <= 0
      ) {
        return sendError(
          res,
          400,
          "ADMIN_ACCOUNT_INVALID_ID",
          "Invalid admin account identifier",
        );
      }

      //==================================================
      //==== GET SESSION
      //==================================================

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
      //==== GET TARGET
      //==================================================

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
        return sendError(
          res,
          404,
          "ADMIN_ACCOUNT_NOT_FOUND",
          "Admin account not found",
        );
      }

      const targetUser = targetUsers[0];

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        id_master_comp: Number(targetUser.id_master_comp),

        id_office: Number(targetUser.id_office),

        name: targetUser.name,

        alias: targetUser.alias,

        email_1: targetUser.email_1,

        email_2: targetUser.email_2,

        phone_1: targetUser.phone_1,

        phone_2: targetUser.phone_2,

        id_profile_photo: targetUser.id_profile_photo
          ? Number(targetUser.id_profile_photo)
          : null,

        id_chair: Number(targetUser.id_chair),

        id_access: Number(targetUser.id_access),

        is_all_access: Number(targetUser.is_all_access),

        admin_acct_status: Number(targetUser.admin_acct_status),
      };

      //==================================================
      //==== PREVENT SELF DELETE
      //==================================================

      if (idAdminAcct === sessionAdminId) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_SELF_DELETE_FORBIDDEN",
          "You cannot delete your own account",
        );
      }

      //==================================================
      //==== COMPANY HARD BOUNDARY
      //==================================================

      if (Number(targetUser.id_master_comp) !== sessionCompany) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_COMPANY_SCOPE_FORBIDDEN",
          "You do not have access to this company account",
        );
      }

      //==================================================
      //==== OFFICE SCOPE
      //==================================================

      if (
        sessionAllAccess !== 1 &&
        Number(targetUser.id_office) !== sessionOffice
      ) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_OFFICE_SCOPE_FORBIDDEN",
          "You do not have access to this office account",
        );
      }

      //==================================================
      //==== PROTECT FULL ACCESS
      //==================================================

      if (Number(targetUser.is_all_access) === 1 && sessionAllAccess !== 1) {
        return sendError(
          res,
          403,
          "ADMIN_ACCOUNT_FULL_ACCESS_DELETE_FORBIDDEN",
          "You are not allowed to delete a full-access account",
        );
      }

      //==================================================
      //==== MUST BE INACTIVE
      //==================================================

      if (Number(targetUser.admin_acct_status) !== 0) {
        return sendError(
          res,
          409,
          "ADMIN_ACCOUNT_MUST_BE_INACTIVE",
          "Deactivate the admin account before deleting it",
        );
      }

      //==================================================
      //==== SOFT DELETE
      //==================================================

      await pool.query(
        `
            UPDATE admin_acct

            SET
              admin_acct_status = 99,
              updated = NOW()

            WHERE id_admin_acct = ?
          `,
        [idAdminAcct],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        idMasterComp: sessionCompany,

        eventCode: "admin_account.deleted",

        category: "data_change",

        module: "admin_account",

        action: "delete",

        actorType: "admin",

        actorId: sessionAdminId,

        actorLabel: req.user?.alias ?? null,

        entityType: "admin_account",

        entityId: idAdminAcct,

        entityLabel: targetUser.name,

        before: auditBefore,

        after: {
          ...auditBefore,

          admin_acct_status: 99,
        },

        metadata: {
          delete_type: "soft_delete",
        },

        httpStatus: 200,
      });

      return sendSuccess(
        res,
        200,
        "ADMIN_ACCOUNT_DELETED",
        "Admin account deleted successfully",
        {
          id_admin_acct: keyhsid.idAdmin.encode(idAdminAcct),
        },
      );
    } catch (error) {
      console.error("Delete admin account error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    }
  },
);

//================================

//test hashing
app.post("/api/v1/generate-hash", multer().none(), async (req, res) => {
  try {
    const { data } = req.body;
    const saltRounds = 10;
    const hashedText = await bcrypt.hash(data, saltRounds);
    console.log(hashedText);
    res.json({ success: true, hashedText });
  } catch (error) {
    console.error("Hashing error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/api/v1/generate-hash-admin", multer().none(), async (req, res) => {
  try {
    const { data } = req.body;
    const hashedText = keyhsid.idAdmin.encode(data);
    res.json({ success: true, hashedText });
  } catch (error) {
    console.error("Hashing error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/api/v1/generate-hash-office", multer().none(), async (req, res) => {
  try {
    const { data } = req.body;
    const hashedText = keyhsid.idOffice.encode(data);
    res.json({ success: true, hashedText });
  } catch (error) {
    console.error("Hashing error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post(
  "/api/v1/generate-hash-mastercomp",
  multer().none(),
  async (req, res) => {
    try {
      const { data } = req.body;
      const hashedText = keyhsid.idMasterCompany.encode(data);
      res.json({ success: true, hashedText });
    } catch (error) {
      console.error("Hashing error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
);

export default app;
