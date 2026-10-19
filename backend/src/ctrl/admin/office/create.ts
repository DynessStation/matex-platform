// Create an office.
import express = require("express");
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";

import { getSessionScope, sessionHasPermission } from "./scope";
import {
  nullableString,
  normalizeFlag,
  slugify,
  isValidEmail,
  isValidHttpUrl,
  validateOperatingHours,
} from "./input";
import {
  resolveOfficeAttachments,
  insertOperatingHours,
  insertOfficeAttachments,
  toAuditOperatingHours,
  toAuditOfficeAttachments,
} from "./relations";

const { pool } = db;

const router = express.Router();

//==================================================
//==== OFFICE - CREATE
//==================================================

router.post(
  "/api/v1/office",

  verifyToken,

  requirePermission("office.create"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const {
        office_code,

        office_name,

        office_description,

        address,

        city,

        province,

        postal_code,

        email,

        phone,

        lat,

        lng,

        attendance_enabled,

        attendance_radius_meter,

        website_url,

        is_public,

        public_slug,

        public_sort_order,

        google_place_id,

        google_maps_url,

        google_business_url,

        operating_hours,

        attachments,
      } = req.body;

      //==================================================
      //==== BASIC DATA
      //==================================================

      const cleanCode = String(office_code ?? "")
        .trim()
        .toUpperCase();

      const cleanName = String(office_name ?? "").trim();

      const cleanDescription = nullableString(office_description);

      const cleanAddress = nullableString(address);

      const cleanCity = nullableString(city);

      const cleanProvince = nullableString(province);

      const cleanPostalCode = nullableString(postal_code);

      const cleanEmail = nullableString(email);

      const cleanPhone = nullableString(phone);

      const cleanWebsiteUrl = nullableString(website_url);

      const cleanGooglePlaceId = nullableString(google_place_id);

      const cleanGoogleMapsUrl = nullableString(google_maps_url);

      const cleanGoogleBusinessUrl = nullableString(google_business_url);

      //==================================================
      //==== REQUIRED
      //==================================================

      if (!cleanCode) {
        return sendError(
          res,
          400,
          "OFFICE_CODE_REQUIRED",
          "Office code is required",
        );
      }

      if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
        return sendError(
          res,
          400,
          "OFFICE_CODE_INVALID",
          "Office code contains invalid characters",
        );
      }

      if (cleanCode.length > 50) {
        return sendError(
          res,
          400,
          "OFFICE_CODE_TOO_LONG",
          "Office code is too long",
        );
      }

      if (!cleanName) {
        return sendError(
          res,
          400,
          "OFFICE_NAME_REQUIRED",
          "Office name is required",
        );
      }

      if (cleanName.length > 255) {
        return sendError(
          res,
          400,
          "OFFICE_NAME_TOO_LONG",
          "Office name is too long",
        );
      }

      //==================================================
      //==== EMAIL / URL
      //==================================================

      if (cleanEmail && !isValidEmail(cleanEmail)) {
        return sendError(
          res,
          400,
          "OFFICE_EMAIL_INVALID",
          "Invalid office email address",
        );
      }

      const urls = [
        cleanWebsiteUrl,

        cleanGoogleMapsUrl,

        cleanGoogleBusinessUrl,
      ];

      if (urls.some((value) => value && !isValidHttpUrl(value))) {
        return sendError(
          res,
          400,
          "OFFICE_URLS_INVALID",
          "One or more office URLs are invalid",
        );
      }

      //==================================================
      //==== LOCATION
      //==================================================

      const numericLat =
        lat === null || lat === undefined || lat === "" ? null : Number(lat);

      const numericLng =
        lng === null || lng === undefined || lng === "" ? null : Number(lng);

      if (
        numericLat !== null &&
        (!Number.isFinite(numericLat) || numericLat < -90 || numericLat > 90)
      ) {
        return sendError(
          res,
          400,
          "OFFICE_LATITUDE_INVALID",
          "Invalid latitude",
        );
      }

      if (
        numericLng !== null &&
        (!Number.isFinite(numericLng) || numericLng < -180 || numericLng > 180)
      ) {
        return sendError(
          res,
          400,
          "OFFICE_LONGITUDE_INVALID",
          "Invalid longitude",
        );
      }

      const attendanceEnabled = normalizeFlag(attendance_enabled, 0);

      const numericRadius =
        attendance_radius_meter === null ||
        attendance_radius_meter === undefined ||
        attendance_radius_meter === ""
          ? null
          : Number(attendance_radius_meter);

      if (
        numericRadius !== null &&
        (!Number.isInteger(numericRadius) || numericRadius <= 0)
      ) {
        return sendError(
          res,
          400,
          "OFFICE_ATTENDANCE_RADIUS_INVALID",
          "Attendance radius must be greater than zero",
        );
      }

      if (
        attendanceEnabled === 1 &&
        (numericLat === null || numericLng === null || numericRadius === null)
      ) {
        return sendError(
          res,
          400,
          "OFFICE_LOCATION_AND_ATTENDANCE_RADIUS_REQUIRED",
          "Location and attendance radius are required when attendance is enabled",
        );
      }

      //==================================================
      //==== PUBLIC
      //==================================================

      const isPublic = normalizeFlag(is_public, 0);

      const rawSlug = nullableString(public_slug);

      const cleanSlug = isPublic === 1 ? slugify(rawSlug ?? cleanName) : null;

      if (isPublic === 1 && !cleanSlug) {
        return sendError(
          res,
          400,
          "OFFICE_PUBLIC_SLUG_REQUIRED",
          "Public slug is required for public office",
        );
      }

      const sortOrderRaw = Number(public_sort_order ?? 0);

      const publicSortOrder =
        Number.isInteger(sortOrderRaw) && sortOrderRaw >= 0 ? sortOrderRaw : 0;

      //==================================================
      //==== OPERATING HOURS
      //==================================================

      const hourResult = validateOperatingHours(operating_hours ?? []);

      if (!hourResult.success) {
        return sendError(
          res,
          hourResult.status,
          hourResult.code,
          hourResult.message,
        );
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== ATTACHMENTS
      //==================================================

      //==================================================
      //==== ATTACHMENT ACCESS
      //==================================================

      const hasRequestedAttachments =
        Array.isArray(attachments) && attachments.length > 0;

      if (hasRequestedAttachments) {
        const canViewAttachments = await sessionHasPermission(
          connection,

          scope,

          "attachment.view",
        );

        if (!canViewAttachments) {
          await connection.rollback();

          return sendError(
            res,

            403,

            "OFFICE_ATTACHMENT_ACCESS_DENIED",

            "Attachment access is required to assign office media",
          );
        }
      }

      const attachmentResult = await resolveOfficeAttachments(
        connection,

        scope.idMasterComp,

        attachments ?? [],
      );

      if (!attachmentResult.success) {
        await connection.rollback();

        return sendError(
          res,
          attachmentResult.status,
          attachmentResult.code,
          attachmentResult.message,
        );
      }

      //==================================================
      //==== DUPLICATE CODE / NAME
      //==================================================

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_office,

              office_code,

              office_name

            FROM office

            WHERE id_master_comp = ?

              AND status IN (0, 1)

              AND (
                UPPER(
                  COALESCE(
                    office_code,
                    ''
                  )
                ) =
                  UPPER(?)

                OR LOWER(
                  office_name
                ) =
                  LOWER(?)
              )

            LIMIT 1
          `,
        [scope.idMasterComp, cleanCode, cleanName],
      );

      if ((duplicateRows as any[]).length) {
        await connection.rollback();
        return sendError(
          res,
          409,
          "OFFICE_ALREADY_EXISTS",
          "Office code or office name is already in use",
        );
      }

      //==================================================
      //==== DUPLICATE PUBLIC SLUG
      //==================================================

      if (cleanSlug) {
        const [slugRows] = await connection.query(
          `
              SELECT
                id_office

              FROM office

              WHERE id_master_comp = ?

                AND public_slug = ?

                AND status IN (0, 1)

              LIMIT 1
            `,
          [scope.idMasterComp, cleanSlug],
        );

        if ((slugRows as any[]).length) {
          await connection.rollback();

          return sendError(
            res,
            409,
            "OFFICE_PUBLIC_SLUG_EXISTS",
            "Public office slug is already in use",
          );
        }
      }

      //==================================================
      //==== INSERT OFFICE
      //==================================================

      const [insertResult] = await connection.query(
        `
            INSERT INTO office
            (
              id_master_comp,

              office_code,

              office_name,

              office_description,

              address,

              city,

              province,

              postal_code,

              email,

              phone,

              lat,

              lng,

              attendance_enabled,

              attendance_radius_meter,

              website_url,

              is_public,

              public_slug,

              public_sort_order,

              google_place_id,

              google_maps_url,

              google_business_url,

              created,

              updated,

              status
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
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,

              NOW(),

              NOW(),

              1
            )
          `,
        [
          scope.idMasterComp,

          cleanCode,

          cleanName,

          cleanDescription,

          cleanAddress,

          cleanCity,

          cleanProvince,

          cleanPostalCode,

          cleanEmail,

          cleanPhone,

          numericLat,

          numericLng,

          attendanceEnabled,

          attendanceEnabled === 1 ? numericRadius : null,

          cleanWebsiteUrl,

          isPublic,

          cleanSlug,

          publicSortOrder,

          cleanGooglePlaceId,

          cleanGoogleMapsUrl,

          cleanGoogleBusinessUrl,
        ],
      );

      const idOffice = Number((insertResult as any).insertId);

      //==================================================
      //==== CHILD DATA
      //==================================================

      await insertOperatingHours(
        connection,

        idOffice,

        hourResult.data,
      );

      await insertOfficeAttachments(
        connection,

        idOffice,

        attachmentResult.data,
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "office.created",

        category: "data_change",

        module: "office",

        action: "create",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "office",

        entityId: idOffice,

        entityLabel: cleanName,

        after: {
          office_code: cleanCode,

          office_name: cleanName,

          office_description: cleanDescription,

          address: cleanAddress,

          city: cleanCity,

          province: cleanProvince,

          postal_code: cleanPostalCode,

          email: cleanEmail,

          phone: cleanPhone,

          lat: numericLat,

          lng: numericLng,

          attendance_enabled: attendanceEnabled,

          attendance_radius_meter:
            attendanceEnabled === 1 ? numericRadius : null,

          google_place_id: cleanGooglePlaceId,

          google_maps_url: cleanGoogleMapsUrl,

          google_business_url: cleanGoogleBusinessUrl,

          website_url: cleanWebsiteUrl,

          is_public: isPublic,

          public_slug: cleanSlug,

          public_sort_order: publicSortOrder,

          operating_hours: toAuditOperatingHours(hourResult.data),

          attachments: toAuditOfficeAttachments(attachmentResult.data),

          status: 1,
        },

        httpStatus: 201,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      return sendSuccess(
        res,
        201,
        "OFFICE_CREATED",
        "Office created successfully",
        {
          id_office: keyhsid.idOffice.encode(idOffice),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Create office error:", error);

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

export default router;
