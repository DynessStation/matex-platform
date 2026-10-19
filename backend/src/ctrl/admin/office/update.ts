// Update an office and change its status.
import express = require("express");
import db = require("../../../db");
import keyhsid from "../../../hsid";
import { AuthRequest, verifyToken } from "../../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../../middleware/auth-permission.middleware";
import { sendError, sendSuccess } from "../../../helper/api-response.helper";
import { writeAuditLog } from "../../../helper/audit-log.helper";

import { getSessionScope, sessionHasPermission, decodeOfficeId } from "./scope";
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
  isSameAuditValue,
  getOfficeAttachmentDiff,
} from "./relations";

const { pool } = db;

const router = express.Router();

//==================================================
//==== OFFICE - UPDATE
//==================================================

router.put(
  "/api/v1/office/:id",

  verifyToken,

  requirePermission("office.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const idOffice = decodeOfficeId(req.params.id);

      if (!idOffice) {
        return sendError(
          res,
          400,
          "OFFICE_INVALID_ID",
          "Invalid office identifier",
        );
      }

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
      //==== NORMALIZE
      //==================================================

      const cleanCode = String(office_code ?? "")
        .trim()
        .toUpperCase();

      const cleanName = String(office_name ?? "").trim();

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

      if (!cleanName) {
        return sendError(
          res,
          400,
          "OFFICE_NAME_REQUIRED",
          "Office name is required",
        );
      }

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

      if (cleanEmail && !isValidEmail(cleanEmail)) {
        return sendError(
          res,
          400,
          "OFFICE_EMAIL_INVALID",
          "Invalid office email address",
        );
      }

      if (
        [cleanWebsiteUrl, cleanGoogleMapsUrl, cleanGoogleBusinessUrl].some(
          (value) => value && !isValidHttpUrl(value),
        )
      ) {
        return sendError(
          res,
          400,
          "OFFICE_URLS_INVALID",
          "One or more office URLs are invalid",
        );
      }

      //==================================================
      //==== LOCATION / ATTENDANCE
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

      const sortOrderRaw = Number(public_sort_order ?? 0);

      const publicSortOrder =
        Number.isInteger(sortOrderRaw) && sortOrderRaw >= 0 ? sortOrderRaw : 0;

      //==================================================
      //==== HOURS
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
      //==== TARGET
      //==================================================

      const [targetRows] = await connection.query(
        `
            SELECT
              id_office,

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

              status

            FROM office

            WHERE id_office = ?
              AND id_master_comp = ?
              AND status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idOffice, scope.idMasterComp],
      );

      const offices = targetRows as any[];

      if (!offices.length) {
        await connection.rollback();

        return sendError(res, 404, "OFFICE_NOT_FOUND", "Office not found");
      }

      const currentOffice = offices[0];

      //==================================================
      //==== CURRENT OPERATING HOURS
      //==================================================

      const [currentHourRows] = await connection.query(
        `
            SELECT
              day_of_week,

              sequence,

              open_time,

              close_time,

              is_closed

            FROM office_operating_hour

            WHERE id_office = ?

            ORDER BY
              day_of_week ASC,
              sequence ASC
          `,
        [idOffice],
      );

      //==================================================
      //==== CURRENT ATTACHMENTS
      //==================================================

      const [currentAttachmentRows] = await connection.query(
        `
          SELECT
            id_attachment,

            attachment_role,

            caption,

            sort_order,

            is_public

          FROM office_attachment

          WHERE id_office = ?

          ORDER BY
            CASE
              WHEN attachment_role =
                'cover'
              THEN 0
              ELSE 1
            END ASC,

            sort_order ASC,

            id_attachment ASC
        `,
        [idOffice],
      );

      //==================================================
      //==== ATTACHMENTS
      //==================================================

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
      //==== DUPLICATE
      //==================================================

      const [duplicateRows] = await connection.query(
        `
            SELECT
              id_office

            FROM office

            WHERE id_master_comp = ?

              AND id_office != ?

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
        [scope.idMasterComp, idOffice, cleanCode, cleanName],
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

      if (cleanSlug) {
        const [slugRows] = await connection.query(
          `
              SELECT
                id_office

              FROM office

              WHERE id_master_comp = ?

                AND id_office != ?

                AND public_slug = ?

                AND status IN (0, 1)

              LIMIT 1
            `,
          [scope.idMasterComp, idOffice, cleanSlug],
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
      //==== AUDIT CORE BEFORE
      //==================================================

      const coreBefore = {
        office_code: currentOffice.office_code,

        office_name: currentOffice.office_name,

        office_description: currentOffice.office_description ?? null,

        address: currentOffice.address ?? null,

        city: currentOffice.city ?? null,

        province: currentOffice.province ?? null,

        postal_code: currentOffice.postal_code ?? null,

        email: currentOffice.email ?? null,

        phone: currentOffice.phone ?? null,

        lat: currentOffice.lat === null ? null : Number(currentOffice.lat),

        lng: currentOffice.lng === null ? null : Number(currentOffice.lng),

        attendance_enabled: Number(currentOffice.attendance_enabled),

        attendance_radius_meter:
          currentOffice.attendance_radius_meter === null
            ? null
            : Number(currentOffice.attendance_radius_meter),

        google_place_id: currentOffice.google_place_id ?? null,

        google_maps_url: currentOffice.google_maps_url ?? null,

        google_business_url: currentOffice.google_business_url ?? null,
      };

      //==================================================
      //==== AUDIT CORE AFTER
      //==================================================

      const coreAfter = {
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

        attendance_radius_meter: attendanceEnabled === 1 ? numericRadius : null,

        google_place_id: cleanGooglePlaceId,

        google_maps_url: cleanGoogleMapsUrl,

        google_business_url: cleanGoogleBusinessUrl,
      };

      //==================================================
      //==== AUDIT PUBLICATION
      //==================================================

      const publicationBefore = {
        website_url: currentOffice.website_url ?? null,

        is_public: Number(currentOffice.is_public),

        public_slug: currentOffice.public_slug ?? null,

        public_sort_order: Number(currentOffice.public_sort_order ?? 0),
      };

      const publicationAfter = {
        website_url: cleanWebsiteUrl,

        is_public: isPublic,

        public_slug: cleanSlug,

        public_sort_order: publicSortOrder,
      };

      //==================================================
      //==== AUDIT CHILD DATA
      //==================================================

      const hoursBefore = toAuditOperatingHours(currentHourRows as any[]);

      const hoursAfter = toAuditOperatingHours(hourResult.data);

      const attachmentsBefore = toAuditOfficeAttachments(
        currentAttachmentRows as any[],
      );

      const attachmentsAfter = toAuditOfficeAttachments(attachmentResult.data);

      //==================================================
      //==== CHANGE CHECK
      //==================================================

      const coreChanged = !isSameAuditValue(coreBefore, coreAfter);

      const publicationChanged = !isSameAuditValue(
        publicationBefore,
        publicationAfter,
      );

      const hoursChanged = !isSameAuditValue(hoursBefore, hoursAfter);

      const mediaChanged = !isSameAuditValue(
        attachmentsBefore,
        attachmentsAfter,
      );

      //==================================================
      //==== MEDIA PERMISSION
      //==================================================

      if (mediaChanged) {
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

            "Attachment access is required to modify office media",
          );
        }
      }

      //==================================================
      //==== UPDATE OFFICE
      //==================================================

      if (coreChanged || publicationChanged) {
        await connection.query(
          `
              UPDATE office

              SET
                office_code = ?,

                office_name = ?,

                office_description = ?,

                address = ?,

                city = ?,

                province = ?,

                postal_code = ?,

                email = ?,

                phone = ?,

                lat = ?,

                lng = ?,

                attendance_enabled = ?,

                attendance_radius_meter = ?,

                website_url = ?,

                is_public = ?,

                public_slug = ?,

                public_sort_order = ?,

                google_place_id = ?,

                google_maps_url = ?,

                google_business_url = ?,

                updated = NOW()

              WHERE id_office = ?

                AND id_master_comp = ?
            `,
          [
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

            idOffice,

            scope.idMasterComp,
          ],
        );
      }

      //==================================================
      //==== REPLACE HOURS
      //==================================================

      if (hoursChanged) {
        await connection.query(
          `
            DELETE FROM office_operating_hour

            WHERE id_office = ?
          `,
          [idOffice],
        );

        await insertOperatingHours(
          connection,

          idOffice,

          hourResult.data,
        );
      }

      //==================================================
      //==== REPLACE ATTACHMENTS
      //==================================================

      if (mediaChanged) {
        await connection.query(
          `
            DELETE FROM office_attachment

            WHERE id_office = ?
          `,
          [idOffice],
        );

        await insertOfficeAttachments(
          connection,

          idOffice,

          attachmentResult.data,
        );
      }

      //==================================================
      //==== AUDIT CORE
      //==================================================

      if (coreChanged) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "office.updated",

          category: "data_change",

          module: "office",

          action: "update",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "office",

          entityId: idOffice,

          entityLabel: cleanName,

          before: coreBefore,

          after: coreAfter,

          httpStatus: 200,
        });
      }

      //==================================================
      //==== AUDIT PUBLICATION
      //==================================================

      if (publicationChanged) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "office.publication_changed",

          category: "data_change",

          module: "office",

          action: "publication_change",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "office",

          entityId: idOffice,

          entityLabel: cleanName,

          before: publicationBefore,

          after: publicationAfter,

          httpStatus: 200,
        });
      }

      //==================================================
      //==== AUDIT OPERATING HOURS
      //==================================================

      if (hoursChanged) {
        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "office.operating_hours_changed",

          category: "data_change",

          module: "office",

          action: "operating_hours_change",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "office",

          entityId: idOffice,

          entityLabel: cleanName,

          before: {
            operating_hours: hoursBefore,
          },

          after: {
            operating_hours: hoursAfter,
          },

          httpStatus: 200,
        });
      }

      //==================================================
      //==== AUDIT MEDIA
      //==================================================

      if (mediaChanged) {
        const attachmentDiff = getOfficeAttachmentDiff(
          attachmentsBefore,

          attachmentsAfter,
        );

        await writeAuditLog({
          req,

          connection,

          writeMode: "strict",

          idMasterComp: scope.idMasterComp,

          eventCode: "office.media_changed",

          category: "file",

          module: "office",

          action: "media_change",

          actorType: "admin",

          actorId: scope.idAdminAcct,

          actorLabel: req.user?.alias ?? null,

          entityType: "office",

          entityId: idOffice,

          entityLabel: cleanName,

          before: {
            attachments: attachmentsBefore,
          },

          after: {
            attachments: attachmentsAfter,
          },

          metadata: {
            added_attachment_ids: attachmentDiff.added,

            removed_attachment_ids: attachmentDiff.removed,
          },

          httpStatus: 200,
        });
      }

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "OFFICE_UPDATED",
        "Office updated successfully",
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

      console.error("Update office error:", error);

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

//==================================================
//==== OFFICE - UPDATE STATUS
//==================================================

router.patch(
  "/api/v1/office/:id/status",

  verifyToken,

  requirePermission("office.update"),

  async (
    req: AuthRequest,

    res,
  ) => {
    let connection: any = null;

    try {
      const idOffice = decodeOfficeId(req.params.id);

      if (!idOffice) {
        return sendError(
          res,
          400,
          "OFFICE_INVALID_ID",
          "Invalid office identifier",
        );
      }

      const newStatus = Number(req.body?.status);

      if (![0, 1].includes(newStatus)) {
        return sendError(
          res,
          400,
          "OFFICE_INVALID_STATUS",
          "Invalid office status",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== TARGET
      //==================================================

      const [officeRows] = await connection.query(
        `
            SELECT
              id_office,

              office_name,

              status

            FROM office

            WHERE id_office = ?

              AND id_master_comp = ?

              AND status IN (0, 1)

            LIMIT 1

            FOR UPDATE
          `,
        [idOffice, scope.idMasterComp],
      );

      const offices = officeRows as any[];

      if (!offices.length) {
        await connection.rollback();

        return sendError(res, 404, "OFFICE_NOT_FOUND", "Office not found");
      }

      const office = offices[0];

      //==================================================
      //==== SAME STATUS
      //==================================================

      if (Number(office.status) === newStatus) {
        await connection.rollback();

        return sendSuccess(
          res,
          200,
          newStatus === 1 ? "OFFICE_ALREADY_ACTIVE" : "OFFICE_ALREADY_INACTIVE",
          newStatus === 1
            ? "Office is already active"
            : "Office is already inactive",
          {
            id_office: keyhsid.idOffice.encode(idOffice),

            status: newStatus,
          },
        );
      }

      //==================================================
      //==== AFFECTED ACCOUNTS
      //==================================================

      const [accountRows] = await connection.query(
        `
            SELECT
              COUNT(*) AS total

            FROM admin_acct

            WHERE id_master_comp = ?

              AND id_office = ?

              AND admin_acct_status
                IN (0, 1)
          `,
        [scope.idMasterComp, idOffice],
      );

      const affectedAccounts = Number((accountRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== UPDATE
      //==================================================

      await connection.query(
        `
          UPDATE office

          SET
            status = ?,

            updated = NOW()

          WHERE id_office = ?

            AND id_master_comp = ?
        `,
        [newStatus, idOffice, scope.idMasterComp],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "office.status_changed",

        category: "data_change",

        module: "office",

        action: "status_change",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "office",

        entityId: idOffice,

        entityLabel: office.office_name,

        before: {
          status: Number(office.status),
        },

        after: {
          status: newStatus,
        },

        metadata: {
          transition: newStatus === 1 ? "activated" : "deactivated",

          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },

        httpStatus: 200,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      return sendSuccess(
        res,
        200,
        newStatus === 1 ? "OFFICE_ACTIVATED" : "OFFICE_DEACTIVATED",
        newStatus === 1
          ? "Office activated successfully"
          : "Office deactivated successfully",
        {
          id_office: keyhsid.idOffice.encode(idOffice),

          status: newStatus,

          affected_accounts: newStatus === 0 ? affectedAccounts : 0,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("Update office status error:", error);

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
