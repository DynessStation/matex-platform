import express = require("express");

import db = require("../../db");

import keyhsid from "../../hsid";

import { buildAttachmentUrl } from "../../helper/attachment.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { writeAuditLog } from "../../helper/audit-log.helper";

//==================================================
//==== APP
//==================================================

const app = express();

const { pool } = db;

//==================================================
//==== TYPES
//==================================================

type SessionScopeResult =
  | {
      success: true;

      idAdminAcct: number;

      idMasterComp: number;

      idOffice: number;

      idAccess: number;

      isAllAccess: number;
    }
  | {
      success: false;

      status: number;

      code: string;

      message: string;
    };

interface OfficeOperatingHourInput {
  day_of_week: number;

  sequence?: number;

  open_time?: string | null;

  close_time?: string | null;

  is_closed?: number | boolean;
}

interface NormalizedOfficeOperatingHour {
  day_of_week: number;

  sequence: number;

  open_time: string | null;

  close_time: string | null;

  is_closed: 0 | 1;
}

type OperatingHourResult =
  | {
      success: true;

      data: NormalizedOfficeOperatingHour[];
    }
  | {
      success: false;

      status: number;
      code: string;
      message: string;
    };

interface OfficeAttachmentInput {
  id_attachment: string;

  attachment_role?: string;

  caption?: string | null;

  sort_order?: number;

  is_public?: number | boolean;
}

interface NormalizedOfficeAttachment {
  idAttachment: number;

  attachmentRole: "cover" | "gallery";

  caption: string | null;

  sortOrder: number;

  isPublic: 0 | 1;
}

type AttachmentResolveResult =
  | {
      success: true;

      data: NormalizedOfficeAttachment[];
    }
  | {
      success: false;

      status: number;
      code: string;
      message: string;
    };

//==================================================
//==== SESSION SCOPE
//==================================================

const getSessionScope = async (
  req: AuthRequest,
): Promise<SessionScopeResult> => {
  const idAdminAcct = req.user?.id_admin_acct;

  if (!idAdminAcct) {
    return {
      success: false,
      status: 401,
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }

  const [rows] = await pool.query(
    `
    SELECT
      id_admin_acct,
      id_master_comp,
      id_office,
      id_access,
      is_all_access,
      admin_acct_status

    FROM admin_acct

    WHERE id_admin_acct = ?

    LIMIT 1
  `,
    [idAdminAcct],
  );

  const users = rows as any[];

  if (!users.length) {
    return {
      success: false,

      status: 401,
      code: "AUTH_SESSION_INVALID",
      message: "Invalid session",
    };
  }

  const user = users[0];

  if (Number(user.admin_acct_status) !== 1) {
    return {
      success: false,

      status: 403,
      code: "AUTH_ACCOUNT_INACTIVE",
      message: "Your account is not active",
    };
  }

  return {
    success: true,

    idAdminAcct: Number(user.id_admin_acct),

    idMasterComp: Number(user.id_master_comp),

    idOffice: Number(user.id_office),

    idAccess: Number(user.id_access),

    isAllAccess: Number(user.is_all_access),
  };
};

//==================================================
//==== SESSION HAS PERMISSION
//==================================================

const sessionHasPermission = async (
  executor: any,

  scope: Extract<SessionScopeResult, { success: true }>,

  permissionKey: string,
): Promise<boolean> => {
  //==================================================
  //==== FULL ACCESS
  //==================================================

  if (scope.isAllAccess === 1) {
    return true;
  }

  //==================================================
  //==== ACCESS PROFILE
  //==================================================

  if (!Number.isInteger(scope.idAccess) || scope.idAccess <= 0) {
    return false;
  }

  //==================================================
  //==== PERMISSION
  //==================================================

  const [rows] = await executor.query(
    `
      SELECT
        1

      FROM admin_access_permission aap

      INNER JOIN admin_permission ap
        ON ap.id_admin_permission =
          aap.id_admin_permission

      WHERE aap.id_admin_access = ?

        AND ap.permission_key = ?

        AND ap.permission_status = 1

      LIMIT 1
    `,
    [scope.idAccess, permissionKey],
  );

  return (rows as any[]).length > 0;
};

//==================================================
//==== DECODE OFFICE
//==================================================

const decodeOfficeId = (value: unknown): number | null => {
  const encoded = String(value ?? "").trim();

  if (!encoded) {
    return null;
  }

  const decoded = keyhsid.idOffice.decode(encoded)[0];

  const idOffice = Number(decoded);

  if (!decoded || !Number.isInteger(idOffice) || idOffice <= 0) {
    return null;
  }

  return idOffice;
};

//==================================================
//==== NULLABLE STRING
//==================================================

const nullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  return clean || null;
};

//==================================================
//==== BOOLEAN FLAG
//==================================================

const normalizeFlag = (
  value: unknown,

  fallback: 0 | 1 = 0,
): 0 | 1 => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return 0;
  }

  return fallback;
};

//==================================================
//==== SLUGIFY
//==================================================

const slugify = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

//==================================================
//==== EMAIL
//==================================================

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

//==================================================
//==== HTTP URL
//==================================================

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

//==================================================
//==== TIME
//==================================================

const normalizeTime = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(clean);

  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}:${match[3] ?? "00"}`;
};

//==================================================
//==== OPERATING HOURS
//==================================================

const validateOperatingHours = (value: unknown): OperatingHourResult => {
  if (!Array.isArray(value)) {
    return {
      success: false,

      status: 400,
      code: "OFFICE_OPERATING_HOURS_ARRAY_INVALID",
      message: "Operating hours must be an array",
    };
  }

  if (value.length > 30) {
    return {
      success: false,

      status: 400,
      code: "OFFICE_OPERATING_HOURS_AMOUNT_INVALID",
      message: "Too many operating hour entries",
    };
  }

  const result: NormalizedOfficeOperatingHour[] = [];

  const uniqueKeys = new Set<string>();

  const closedDays = new Set<number>();

  const entriesPerDay = new Map<number, number>();

  for (const raw of value) {
    const item = raw as OfficeOperatingHourInput;

    const day = Number(item?.day_of_week);

    const sequence = item?.sequence === undefined ? 1 : Number(item.sequence);

    const isClosed = normalizeFlag(item?.is_closed, 0);

    //==================================================
    //==== DAY
    //==================================================

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_OPERATING_DAY_INVALID",
        message: "Invalid operating day",
      };
    }

    //==================================================
    //==== SEQUENCE
    //==================================================

    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_OPERATING_HOURS_SEQUENCE_INVALID",
        message: "Invalid operating hour sequence",
      };
    }

    const key = `${day}:${sequence}`;

    if (uniqueKeys.has(key)) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_OPERATING_HOURS_DUPLICATED",
        message: "Duplicate operating hour entry",
      };
    }

    uniqueKeys.add(key);

    entriesPerDay.set(
      day,

      (entriesPerDay.get(day) ?? 0) + 1,
    );

    //==================================================
    //==== CLOSED
    //==================================================

    if (isClosed === 1) {
      if (sequence !== 1) {
        return {
          success: false,

          status: 400,
          code: "OFFICE_OPERATING_DAY_SEQUENCE_INVALID",
          message: "Closed day must use sequence 1",
        };
      }

      closedDays.add(day);

      result.push({
        day_of_week: day,

        sequence,

        open_time: null,

        close_time: null,

        is_closed: 1,
      });

      continue;
    }

    //==================================================
    //==== OPEN / CLOSE
    //==================================================

    const openTime = normalizeTime(item?.open_time);

    const closeTime = normalizeTime(item?.close_time);

    if (!openTime || !closeTime) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_OPERATING_HOURS_OPEN_CLOSE_INVALID", // SUMPAH BINGUNG NAMAIN CODENYA WKWK
        message: "Open and close time are required for operating days",
      };
    }

    if (openTime === closeTime) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_OPERATING_HOURS_SAME_OPEN_CLOSE",
        message: "Open time and close time cannot be the same",
      };
    }

    result.push({
      day_of_week: day,

      sequence,

      open_time: openTime,

      close_time: closeTime,

      is_closed: 0,
    });
  }

  //==================================================
  //==== CLOSED DAY CANNOT HAVE ANOTHER RANGE
  //==================================================

  for (const day of closedDays) {
    if ((entriesPerDay.get(day) ?? 0) > 1) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_OPERATING_HOURS_CONTAIN_ANOTHER_OPERATING_TIME",
        message: "Closed day cannot contain another operating time",
      };
    }
  }

  result.sort(
    (a, b) => a.day_of_week - b.day_of_week || a.sequence - b.sequence,
  );

  return {
    success: true,

    data: result,
  };
};

//==================================================
//==== RESOLVE OFFICE ATTACHMENTS
//==================================================

const resolveOfficeAttachments = async (
  executor: any,

  idMasterComp: number,

  value: unknown,
): Promise<AttachmentResolveResult> => {
  if (!Array.isArray(value)) {
    return {
      success: false,

      status: 400,
      code: "OFFICE_ATTACHMENTS_ARRAY_INVALID",
      message: "Office attachments must be an array",
    };
  }

  if (value.length > 20) {
    return {
      success: false,

      status: 400,
      code: "OFFICE_ATTACHMENTS_LIMIT_EXCEEDED",
      message: "A maximum of 20 office attachments is allowed",
    };
  }

  if (value.length === 0) {
    return {
      success: true,

      data: [],
    };
  }

  const normalized: NormalizedOfficeAttachment[] = [];

  const ids = new Set<number>();

  let coverCount = 0;

  for (const raw of value) {
    const item = raw as OfficeAttachmentInput;

    const encodedId = String(item?.id_attachment ?? "").trim();

    const decoded = keyhsid.idAttachment.decode(encodedId)[0];

    const idAttachment = Number(decoded);

    if (!decoded || !Number.isInteger(idAttachment) || idAttachment <= 0) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_ATTACHMENT_ID_INVALID",
        message: "Invalid office attachment identifier",
      };
    }

    if (ids.has(idAttachment)) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_ATTACHMENT_DUPLICATED",
        message: "Duplicate office attachment",
      };
    }

    ids.add(idAttachment);

    const roleRaw = String(item?.attachment_role ?? "gallery")
      .trim()
      .toLowerCase();

    if (roleRaw !== "cover" && roleRaw !== "gallery") {
      return {
        success: false,

        status: 400,
        code: "OFFICE_ATTACHMENT_ROLE_INVALID",
        message: "Invalid office attachment role",
      };
    }

    const role = roleRaw as "cover" | "gallery";

    if (role === "cover") {
      coverCount++;
    }

    const caption = nullableString(item?.caption);

    if (caption && caption.length > 255) {
      return {
        success: false,

        status: 400,
        code: "OFFICE_ATTACHMENT_CAPTION_TOO_LONG",
        message: "Office attachment caption is too long",
      };
    }

    const rawSortOrder = Number(item?.sort_order ?? 0);

    const sortOrder =
      Number.isInteger(rawSortOrder) && rawSortOrder >= 0 ? rawSortOrder : 0;

    normalized.push({
      idAttachment,

      attachmentRole: role,

      caption,

      sortOrder,

      isPublic: normalizeFlag(item?.is_public, 1),
    });
  }

  if (coverCount > 1) {
    return {
      success: false,

      status: 400,
      code: "OFFICE_ATTACHMENT_MULTIPLE_COVER",
      message: "Only one cover image is allowed per office",
    };
  }

  //==================================================
  //==== VALIDATE ATTACHMENTS
  //==================================================

  const numericIds = [...ids];

  const placeholders = numericIds.map(() => "?").join(",");

  const [attachmentRows] = await executor.query(
    `
          SELECT
            id_attachment

          FROM attachment

          WHERE id_attachment IN (
            ${placeholders}
          )

            AND id_master_comp = ?

            AND collection_name =
              'office_media'

            AND attachment_status = 1

            AND deleted_at IS NULL
        `,
    [...numericIds, idMasterComp],
  );

  if ((attachmentRows as any[]).length !== numericIds.length) {
    return {
      success: false,

      status: 400,
      code: "OFFICE_ATTACHMENT_NOT_AVAILABLE",
      message: "One or more office attachments are not available",
    };
  }

  return {
    success: true,

    data: normalized,
  };
};

//==================================================
//==== INSERT OPERATING HOURS
//==================================================

const insertOperatingHours = async (
  connection: any,

  idOffice: number,

  hours: NormalizedOfficeOperatingHour[],
): Promise<void> => {
  if (!hours.length) {
    return;
  }

  const valuesSql = hours
    .map(() => "(?, ?, ?, ?, ?, ?, NOW(), NOW())")
    .join(",");

  const values = hours.flatMap((item) => [
    idOffice,

    item.day_of_week,

    item.sequence,

    item.open_time,

    item.close_time,

    item.is_closed,
  ]);

  await connection.query(
    `
        INSERT INTO office_operating_hour
        (
          id_office,

          day_of_week,

          sequence,

          open_time,

          close_time,

          is_closed,

          created,

          updated
        )
        VALUES
          ${valuesSql}
      `,
    values,
  );
};

//==================================================
//==== INSERT OFFICE ATTACHMENTS
//==================================================

const insertOfficeAttachments = async (
  connection: any,

  idOffice: number,

  attachments: NormalizedOfficeAttachment[],
): Promise<void> => {
  if (!attachments.length) {
    return;
  }

  const valuesSql = attachments
    .map(() => "(?, ?, ?, ?, ?, ?, NOW(), NOW())")
    .join(",");

  const values = attachments.flatMap((item) => [
    idOffice,

    item.idAttachment,

    item.attachmentRole,

    item.caption,

    item.sortOrder,

    item.isPublic,
  ]);

  await connection.query(
    `
        INSERT INTO office_attachment
        (
          id_office,

          id_attachment,

          attachment_role,

          caption,

          sort_order,

          is_public,

          created,

          updated
        )
        VALUES
          ${valuesSql}
      `,
    values,
  );
};

//==================================================
//==== AUDIT OPERATING HOURS
//==================================================

const toAuditOperatingHours = (items: any[]) => {
  return items
    .map((item) => ({
      day_of_week: Number(item.day_of_week),

      sequence: Number(item.sequence),

      open_time: item.open_time ? String(item.open_time).slice(0, 8) : null,

      close_time: item.close_time ? String(item.close_time).slice(0, 8) : null,

      is_closed: Number(item.is_closed),
    }))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.sequence - b.sequence);
};

//==================================================
//==== AUDIT OFFICE ATTACHMENTS
//==================================================

const toAuditOfficeAttachments = (items: any[]) => {
  return items
    .map((item) => ({
      id_attachment: Number(item.idAttachment ?? item.id_attachment),

      attachment_role: String(item.attachmentRole ?? item.attachment_role),

      caption: item.caption ?? null,

      sort_order: Number(item.sortOrder ?? item.sort_order ?? 0),

      is_public: Number(item.isPublic ?? item.is_public ?? 0),
    }))
    .sort((a, b) => {
      if (a.attachment_role !== b.attachment_role) {
        if (a.attachment_role === "cover") {
          return -1;
        }

        if (b.attachment_role === "cover") {
          return 1;
        }
      }

      return a.sort_order - b.sort_order || a.id_attachment - b.id_attachment;
    });
};

//==================================================
//==== AUDIT VALUE EQUALITY
//==================================================

const isSameAuditValue = (
  before: unknown,

  after: unknown,
): boolean => {
  return JSON.stringify(before) === JSON.stringify(after);
};

//==================================================
//==== ATTACHMENT DIFF
//==================================================

const getOfficeAttachmentDiff = (
  before: any[],

  after: any[],
) => {
  const beforeIds = new Set(before.map((item) => Number(item.id_attachment)));

  const afterIds = new Set(after.map((item) => Number(item.id_attachment)));

  return {
    added: after
      .filter((item) => !beforeIds.has(Number(item.id_attachment)))
      .map((item) => Number(item.id_attachment)),

    removed: before
      .filter((item) => !afterIds.has(Number(item.id_attachment)))
      .map((item) => Number(item.id_attachment)),
  };
};

//==================================================
//==== GET LIST QUERY
//==================================================

const getListQuery = (query: any) => {
  const parsedPage = Number(query.page);

  const parsedLimit = Number(query.limit);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 15;

  const offset = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : "";

  return {
    page,

    limit,

    offset,

    searchValue: `%${search}%`,
  };
};

//==================================================
//==== OFFICE - GET LIST
//==================================================

app.get(
  "/api/v1/office",

  verifyToken,

  requirePermission("office.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
    try {
      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const { page, limit, offset, searchValue } = getListQuery(req.query);

      //==================================================
      //==== SORT
      //==================================================

      const order = typeof req.query.ord === "string" ? req.query.ord : "";

      const sort = req.query.srt;

      const allowedOrder: Record<string, string> = {
        id: "o.id_office",

        office_code: "o.office_code",

        office_name: "o.office_name",

        city: "o.city",

        admin_count: "admin_count",

        media_count: "media_count",

        created: "o.created",

        updated: "o.updated",

        public_sort_order: "o.public_sort_order",
      };

      const orderQuery = allowedOrder[order] ?? "o.id_office";

      const sortQuery = sort === "desc" || sort === "true" ? "DESC" : "ASC";

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
            SELECT
              COUNT(*) AS total

            FROM office o

            WHERE o.id_master_comp = ?

              AND o.status IN (0, 1)

              AND (
                COALESCE(
                  o.office_code,
                  ''
                ) LIKE ?

                OR o.office_name LIKE ?

                OR COALESCE(
                  o.address,
                  ''
                ) LIKE ?

                OR COALESCE(
                  o.city,
                  ''
                ) LIKE ?

                OR COALESCE(
                  o.province,
                  ''
                ) LIKE ?
              )
          `,
        [
          scope.idMasterComp,

          searchValue,

          searchValue,

          searchValue,

          searchValue,

          searchValue,
        ],
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
            SELECT
              o.id_office,

              o.office_code,

              o.office_name,

              o.office_description,

              o.address,

              o.city,

              o.province,

              o.postal_code,

              o.email,

              o.phone,

              o.lat,

              o.lng,

              o.attendance_enabled,

              o.attendance_radius_meter,

              o.website_url,

              o.is_public,

              o.public_slug,

              o.public_sort_order,

              o.google_place_id,

              o.google_maps_url,

              o.google_business_url,

              o.created,

              o.updated,

              o.status,

              COUNT(
                DISTINCT aa.id_admin_acct
              ) AS admin_count,

              COUNT(
                DISTINCT oa.id_office_attachment
              ) AS media_count

            FROM office o

            LEFT JOIN admin_acct aa
              ON o.id_office =
                aa.id_office

              AND aa.admin_acct_status
                IN (0, 1)

            LEFT JOIN office_attachment oa
              ON o.id_office =
                oa.id_office

            WHERE o.id_master_comp = ?

              AND o.status IN (0, 1)

              AND (
                COALESCE(
                  o.office_code,
                  ''
                ) LIKE ?

                OR o.office_name LIKE ?

                OR COALESCE(
                  o.address,
                  ''
                ) LIKE ?

                OR COALESCE(
                  o.city,
                  ''
                ) LIKE ?

                OR COALESCE(
                  o.province,
                  ''
                ) LIKE ?
              )

            GROUP BY
              o.id_office,
              o.office_code,
              o.office_name,
              o.office_description,
              o.address,
              o.city,
              o.province,
              o.postal_code,
              o.email,
              o.phone,
              o.lat,
              o.lng,
              o.attendance_enabled,
              o.attendance_radius_meter,
              o.website_url,
              o.is_public,
              o.public_slug,
              o.public_sort_order,
              o.google_place_id,
              o.google_maps_url,
              o.google_business_url,
              o.created,
              o.updated,
              o.status

            ORDER BY
              ${orderQuery}
              ${sortQuery}

            LIMIT ?
            OFFSET ?
          `,
        [
          scope.idMasterComp,

          searchValue,

          searchValue,

          searchValue,

          searchValue,

          searchValue,

          limit,

          offset,
        ],
      );

      const data = (rows as any[]).map((item) => ({
        id_office: keyhsid.idOffice.encode(item.id_office),

        office_code: item.office_code,

        office_name: item.office_name,

        office_description: item.office_description,

        address: item.address,

        city: item.city,

        province: item.province,

        postal_code: item.postal_code,

        email: item.email,

        phone: item.phone,

        lat: item.lat === null ? null : Number(item.lat),

        lng: item.lng === null ? null : Number(item.lng),

        attendance_enabled: Number(item.attendance_enabled),

        attendance_radius_meter:
          item.attendance_radius_meter === null
            ? null
            : Number(item.attendance_radius_meter),

        website_url: item.website_url,

        is_public: Number(item.is_public),

        public_slug: item.public_slug,

        public_sort_order: Number(item.public_sort_order ?? 0),

        google_place_id: item.google_place_id,

        google_maps_url: item.google_maps_url,

        google_business_url: item.google_business_url,

        admin_count: Number(item.admin_count ?? 0),

        media_count: Number(item.media_count ?? 0),

        status: Number(item.status),

        status_label: Number(item.status) === 1 ? "Active" : "Inactive",

        visibility_label: Number(item.is_public) === 1 ? "Public" : "Internal",

        created: item.created,

        updated: item.updated,
      }));

      return res.status(200).json({
        success: true,

        data,

        pagination: {
          page,

          limit,

          total,

          length: data.length,

          pagerows: Math.ceil(total / limit),

          total_pages: Math.ceil(total / limit),

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Get office list error:", error);

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
//==== OFFICE - CREATE
//==================================================

app.post(
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

//==================================================
//==== OFFICE - GET DETAIL
//==================================================

app.get(
  "/api/v1/office/:id",

  verifyToken,

  requirePermission("office.view"),

  async (
    req: AuthRequest,

    res,
  ) => {
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

      //==================================================
      //==== OFFICE
      //==================================================

      const [officeRows] = await pool.query(
        `
            SELECT
              o.*,

              (
                SELECT
                  COUNT(*)

                FROM admin_acct aa

                WHERE aa.id_office =
                  o.id_office

                  AND aa.admin_acct_status
                    IN (0, 1)
              ) AS admin_count

            FROM office o

            WHERE o.id_office = ?

              AND o.id_master_comp = ?

              AND o.status IN (0, 1)

            LIMIT 1
          `,
        [idOffice, scope.idMasterComp],
      );

      const offices = officeRows as any[];

      if (!offices.length) {
        return sendError(res, 404, "OFFICE_NOT_FOUND", "Office not found");
      }

      const office = offices[0];

      //==================================================
      //==== OPERATING HOURS
      //==================================================

      const [hourRows] = await pool.query(
        `
            SELECT
              id_office_operating_hour,

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

      const operatingHours = (hourRows as any[]).map((item) => ({
        id_office_operating_hour: item.id_office_operating_hour,

        day_of_week: Number(item.day_of_week),

        sequence: Number(item.sequence),

        open_time: item.open_time,

        close_time: item.close_time,

        is_closed: Number(item.is_closed),
      }));

      //==================================================
      //==== ATTACHMENTS
      //==================================================

      const [attachmentRows] = await pool.query(
        `
            SELECT
              oa.id_office_attachment,

              oa.attachment_role,

              oa.caption,

              oa.sort_order,

              oa.is_public,

              a.id_attachment,

              a.collection_name,

              a.name,

              a.original_name,

              a.file_name,

              a.mime_type,

              a.extension,

              a.disk,

              a.storage_path,

              a.file_size,

              a.width,

              a.height

            FROM office_attachment oa

            INNER JOIN attachment a
              ON oa.id_attachment =
                a.id_attachment

              AND a.attachment_status = 1

              AND a.deleted_at IS NULL

            WHERE oa.id_office = ?

            ORDER BY
              CASE
                WHEN oa.attachment_role =
                  'cover'
                THEN 0
                ELSE 1
              END ASC,

              oa.sort_order ASC,

              oa.id_office_attachment ASC
          `,
        [idOffice],
      );

      const attachments = (attachmentRows as any[]).map((item) => ({
        id_office_attachment: item.id_office_attachment,

        attachment_role: item.attachment_role,

        caption: item.caption,

        sort_order: Number(item.sort_order ?? 0),

        is_public: Number(item.is_public),

        id_attachment: keyhsid.idAttachment.encode(item.id_attachment),

        collection_name: item.collection_name,

        name: item.name,

        original_name: item.original_name,

        file_name: item.file_name,

        mime_type: item.mime_type,

        extension: item.extension,

        disk: item.disk,

        storage_path: item.storage_path,

        file_size: Number(item.file_size),

        width: item.width,

        height: item.height,

        asset_url: buildAttachmentUrl(item.storage_path),
      }));

      return res.status(200).json({
        success: true,

        data: {
          id_office: keyhsid.idOffice.encode(office.id_office),

          office_code: office.office_code,

          office_name: office.office_name,

          office_description: office.office_description,

          address: office.address,

          city: office.city,

          province: office.province,

          postal_code: office.postal_code,

          email: office.email,

          phone: office.phone,

          lat: office.lat === null ? null : Number(office.lat),

          lng: office.lng === null ? null : Number(office.lng),

          attendance_enabled: Number(office.attendance_enabled),

          attendance_radius_meter:
            office.attendance_radius_meter === null
              ? null
              : Number(office.attendance_radius_meter),

          website_url: office.website_url,

          is_public: Number(office.is_public),

          public_slug: office.public_slug,

          public_sort_order: Number(office.public_sort_order ?? 0),

          google_place_id: office.google_place_id,

          google_maps_url: office.google_maps_url,

          google_business_url: office.google_business_url,

          status: Number(office.status),

          status_label: Number(office.status) === 1 ? "Active" : "Inactive",

          admin_count: Number(office.admin_count ?? 0),

          operating_hours: operatingHours,

          attachments,

          created: office.created,

          updated: office.updated,
        },
      });
    } catch (error) {
      console.error("Get office detail error:", error);

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
//==== OFFICE - UPDATE
//==================================================

app.put(
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

app.patch(
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

//==================================================
//==== OFFICE - DELETE
//==================================================

app.delete(
  "/api/v1/office/:id",

  verifyToken,

  requirePermission("office.delete"),

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

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== TARGET
      //==================================================

      const [officeRows] = await connection.query(
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

      const offices = officeRows as any[];

      if (!offices.length) {
        await connection.rollback();

        return sendError(res, 404, "OFFICE_NOT_FOUND", "Office not found");
      }

      const office = offices[0];

      //==================================================
      //==== MUST BE INACTIVE
      //==================================================

      if (Number(office.status) !== 0) {
        await connection.rollback();
        return sendError(
          res,
          409,
          "OFFICE_MUST_BE_INACTIVE",
          "Deactivate the office before deleting it",
        );
      }

      //==================================================
      //==== ADMIN REFERENCES
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

      const references = Number((accountRows as any[])[0]?.total ?? 0);

      if (references > 0) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "OFFICE_HAS_ADMIN_REFERENCES",
          "Office is still assigned to one or more admin accounts",
          {
            assigned_accounts: references,
          },
        );
      }

      //==================================================
      //==== OPERATING HOURS BEFORE DELETE
      //==================================================

      const [hourRows] = await connection.query(
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
      //==== ATTACHMENTS BEFORE DELETE
      //==================================================

      const [attachmentRows] = await connection.query(
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

      const auditHours = toAuditOperatingHours(hourRows as any[]);

      const auditAttachments = toAuditOfficeAttachments(
        attachmentRows as any[],
      );

      //==================================================
      //==== AUDIT BEFORE
      //==================================================

      const auditBefore = {
        office_code: office.office_code,

        office_name: office.office_name,

        office_description: office.office_description ?? null,

        address: office.address ?? null,

        city: office.city ?? null,

        province: office.province ?? null,

        postal_code: office.postal_code ?? null,

        email: office.email ?? null,

        phone: office.phone ?? null,

        lat: office.lat === null ? null : Number(office.lat),

        lng: office.lng === null ? null : Number(office.lng),

        attendance_enabled: Number(office.attendance_enabled),

        attendance_radius_meter:
          office.attendance_radius_meter === null
            ? null
            : Number(office.attendance_radius_meter),

        website_url: office.website_url ?? null,

        is_public: Number(office.is_public),

        public_slug: office.public_slug ?? null,

        public_sort_order: Number(office.public_sort_order ?? 0),

        google_place_id: office.google_place_id ?? null,

        google_maps_url: office.google_maps_url ?? null,

        google_business_url: office.google_business_url ?? null,

        operating_hours: auditHours,

        attachments: auditAttachments,

        status: Number(office.status),
      };

      //==================================================
      //==== DETACH MEDIA
      //==================================================

      await connection.query(
        `
          DELETE FROM office_attachment

          WHERE id_office = ?
        `,
        [idOffice],
      );

      //==================================================
      //==== DELETE OPERATING HOURS
      //==================================================

      await connection.query(
        `
          DELETE FROM office_operating_hour

          WHERE id_office = ?
        `,
        [idOffice],
      );

      //==================================================
      //==== SOFT DELETE OFFICE
      //==================================================

      await connection.query(
        `
          UPDATE office

          SET
            status = 99,

            updated = NOW()

          WHERE id_office = ?

            AND id_master_comp = ?
        `,
        [idOffice, scope.idMasterComp],
      );

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "office.deleted",

        category: "data_change",

        module: "office",

        action: "delete",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "office",

        entityId: idOffice,

        entityLabel: office.office_name,

        before: auditBefore,

        after: {
          ...auditBefore,

          operating_hours: [],

          attachments: [],

          status: 99,
        },

        metadata: {
          delete_type: "soft_delete",

          removed_operating_hours: auditHours.length,

          removed_attachment_ids: auditAttachments.map(
            (item) => item.id_attachment,
          ),
        },

        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "OFFICE_DELETED",
        "Office deleted successfully",
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

      console.error("Delete office error:", error);

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
//==== ROUTER
//==================================================

export default app;
