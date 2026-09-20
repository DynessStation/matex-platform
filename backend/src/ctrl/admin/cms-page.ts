import express = require("express");

import { Response } from "express";

import db = require("../../db");

import keyhsid from "../../hsid";

import {
  CMS_PAGE_DEFAULT_LOCALE,
  CMS_PAGE_LIST_DEFAULT_LIMIT,
  CMS_PAGE_LIST_MAX_LIMIT,
  CMS_PAGE_STATUS,
  CMS_PAGE_VISIBILITY,
  CmsPageI18nStatus,
  CmsPageStatus,
  CmsPageVisibility,
  isCmsPageLocale,
} from "../../config/cms-page.config";

import {
  CmsPageAttachmentInput,
  CmsPageEffectiveStatus,
  CmsPageListItem,
  CmsPageTranslationInput,
} from "../../interface/cms-page.interface";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { writeAuditLog } from "../../helper/audit-log.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

import { buildAttachmentUrl } from "../../helper/attachment.helper";

//==================================================
//==== APP
//==================================================

const app = express();

const { pool } = db;

//==================================================
//==== SESSION SCOPE
//==================================================

type SessionScopeResult =
  | {
      success: true;

      idAdminAcct: number;

      idMasterComp: number;

      idAccess: number;

      isAllAccess: number;
    }
  | {
      success: false;

      status: number;

      code: string;

      message: string;
    };

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

          id_access,

          is_all_access,

          admin_acct_status

        FROM admin_acct

        WHERE id_admin_acct = ?

        LIMIT 1
    `,
    [idAdminAcct],
  );

  const accounts = rows as any[];

  if (!accounts.length) {
    return {
      success: false,

      status: 401,

      code: "AUTH_SESSION_INVALID",

      message: "Invalid session",
    };
  }

  const account = accounts[0];

  if (Number(account.admin_acct_status) !== 1) {
    return {
      success: false,

      status: 403,

      code: "AUTH_ACCOUNT_INACTIVE",

      message: "Your account is not active",
    };
  }

  return {
    success: true,

    idAdminAcct: Number(account.id_admin_acct),

    idMasterComp: Number(account.id_master_comp),

    idAccess: Number(account.id_access),

    isAllAccess: Number(account.is_all_access),
  };
};

//==================================================
//==== EFFECTIVE STATUS
//==================================================

const getEffectiveStatus = (
  status: number,

  publishAt: Date | string | null,

  unpublishAt: Date | string | null,
): CmsPageEffectiveStatus => {
  if (status === CMS_PAGE_STATUS.DRAFT) {
    return "draft";
  }

  if (status === CMS_PAGE_STATUS.ARCHIVED) {
    return "archived";
  }

  const now = Date.now();

  if (publishAt) {
    const publishTime = new Date(publishAt).getTime();

    if (Number.isFinite(publishTime) && publishTime > now) {
      return "scheduled";
    }
  }

  if (unpublishAt) {
    const unpublishTime = new Date(unpublishAt).getTime();

    if (Number.isFinite(unpublishTime) && unpublishTime <= now) {
      return "expired";
    }
  }

  return "published";
};

//==================================================
//==== LIST QUERY
//==================================================

const getListQuery = (query: any) => {
  const parsedPage = Number(query.page);

  const parsedLimit = Number(query.limit);

  const page =
    Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), CMS_PAGE_LIST_MAX_LIMIT)
      : CMS_PAGE_LIST_DEFAULT_LIMIT;

  const offset = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : "";

  return {
    page,

    limit,

    offset,

    search,
  };
};

//==================================================
//==== CMS PAGE - GET LIST
//==================================================

app.get(
  "/api/v1/cms-page",

  verifyToken,

  requirePermission("cms_page.view"),

  async (
    req: AuthRequest,

    res: Response,
  ) => {
    try {
      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== PAGINATION / SEARCH
      //==================================================

      const { page, limit, offset, search } = getListQuery(req.query);

      //==================================================
      //==== LOCALE
      //==================================================

      const requestedLocaleRaw =
        typeof req.query.locale === "string"
          ? req.query.locale.trim()
          : CMS_PAGE_DEFAULT_LOCALE;

      const requestedLocale = requestedLocaleRaw || CMS_PAGE_DEFAULT_LOCALE;

      if (!isCmsPageLocale(requestedLocale)) {
        return sendError(
          res,
          400,
          "CMS_PAGE_LOCALE_UNSUPPORTED",
          "Unsupported CMS page locale",
          {
            locale: requestedLocale,
          },
        );
      }

      //==================================================
      //==== WHERE
      //==================================================

      const where: string[] = [
        "p.id_master_comp = ?",

        "p.cms_page_deleted_at IS NULL",
      ];

      const params: any[] = [scope.idMasterComp];

      //==================================================
      //==== SEARCH
      //==================================================

      if (search) {
        const searchValue = `%${search}%`;

        where.push(`
          (
            p.cms_page_key LIKE ?

            OR p.cms_page_type LIKE ?

            OR EXISTS (
              SELECT
                1

              FROM cms_page_i18n search_i18n

              WHERE search_i18n.id_cms_page =
                p.id_cms_page

                AND search_i18n.id_master_comp =
                  p.id_master_comp

                AND (
                  search_i18n.cms_page_title LIKE ?

                  OR search_i18n.cms_page_slug LIKE ?
                )
            )
          )
        `);

        params.push(searchValue, searchValue, searchValue, searchValue);
      }

      //==================================================
      //==== STATUS FILTER
      //==================================================

      const rawStatus = req.query.status;

      if (rawStatus !== undefined && rawStatus !== "") {
        const status = Number(rawStatus);

        if (
          !Number.isInteger(status) ||
          !Object.values(CMS_PAGE_STATUS).includes(status as CmsPageStatus)
        ) {
          return sendError(
            res,
            400,
            "CMS_PAGE_STATUS_INVALID",
            "Invalid CMS page status",
          );
        }

        where.push("p.cms_page_status = ?");

        params.push(status);
      }

      //==================================================
      //==== VISIBILITY FILTER
      //==================================================

      const rawVisibility = req.query.visibility;

      if (rawVisibility !== undefined && rawVisibility !== "") {
        const visibility = Number(rawVisibility);

        if (
          !Number.isInteger(visibility) ||
          !Object.values(CMS_PAGE_VISIBILITY).includes(visibility as any)
        ) {
          return sendError(
            res,
            400,
            "CMS_PAGE_VISIBILITY_INVALID",
            "Invalid CMS page visibility",
          );
        }

        where.push("p.cms_page_visibility = ?");

        params.push(visibility);
      }

      //==================================================
      //==== TYPE FILTER
      //==================================================

      const type =
        typeof req.query.type === "string"
          ? req.query.type.trim().toLowerCase()
          : "";

      if (type) {
        if (type.length > 50 || !/^[a-z0-9][a-z0-9_-]*$/.test(type)) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TYPE_INVALID",
            "Invalid CMS page type",
          );
        }

        where.push("p.cms_page_type = ?");

        params.push(type);
      }

      const whereQuery = where.join(" AND ");

      //==================================================
      //==== SORT
      //==================================================

      const order =
        typeof req.query.ord === "string" ? req.query.ord.trim() : "";

      const sort = req.query.srt;

      const allowedOrder: Record<string, string> = {
        id: "p.id_cms_page",

        cms_page_key: "p.cms_page_key",

        cms_page_title:
          "COALESCE(requested_i18n.cms_page_title, default_i18n.cms_page_title, p.cms_page_key)",

        cms_page_type: "p.cms_page_type",

        cms_page_status: "p.cms_page_status",

        cms_page_visibility: "p.cms_page_visibility",

        cms_page_sort_order: "p.cms_page_sort_order",

        cms_page_publish_at: "p.cms_page_publish_at",

        created: "p.created",

        updated: "p.updated",
      };

      const orderQuery = allowedOrder[order] ?? "p.cms_page_sort_order";

      const sortQuery = sort === "desc" || sort === "true" ? "DESC" : "ASC";

      //==================================================
      //==== COUNT
      //==================================================

      const [totalRows] = await pool.query(
        `
          SELECT
            COUNT(*) AS total

          FROM cms_page p

          WHERE ${whereQuery}
        `,
        params,
      );

      const total = Number((totalRows as any[])[0]?.total ?? 0);

      //==================================================
      //==== DATA
      //==================================================

      const [rows] = await pool.query(
        `
          SELECT
            p.id_cms_page,

            p.id_parent_cms_page,

            p.cms_page_key,

            p.cms_page_type,

            p.cms_page_template,

            p.cms_page_content_mode,

            p.cms_page_default_locale,

            p.cms_page_status,

            p.cms_page_visibility,

            p.cms_page_is_system,

            p.cms_page_is_featured,

            p.cms_page_sort_order,

            p.cms_page_publish_at,

            p.cms_page_unpublish_at,

            p.created,

            p.updated,

            requested_i18n.id_cms_page_i18n
              AS requested_translation_id,

            COALESCE(
              requested_i18n.cms_page_locale,
              default_i18n.cms_page_locale
            ) AS resolved_locale,

            COALESCE(
              requested_i18n.cms_page_slug,
              default_i18n.cms_page_slug
            ) AS cms_page_slug,

            COALESCE(
              requested_i18n.cms_page_title,
              default_i18n.cms_page_title
            ) AS cms_page_title,

            COALESCE(
              requested_i18n.cms_page_excerpt,
              default_i18n.cms_page_excerpt
            ) AS cms_page_excerpt,

            COALESCE(
              requested_i18n.cms_page_i18n_status,
              default_i18n.cms_page_i18n_status
            ) AS cms_page_i18n_status,

            (
              SELECT
                COUNT(*)

              FROM cms_page_i18n translation_count

              WHERE translation_count.id_cms_page =
                p.id_cms_page

                AND translation_count.id_master_comp =
                  p.id_master_comp
            ) AS translation_count,

            (
              SELECT
                COUNT(*)

              FROM cms_page_i18n published_count

              WHERE published_count.id_cms_page =
                p.id_cms_page

                AND published_count.id_master_comp =
                  p.id_master_comp

                AND published_count.cms_page_i18n_status = 1
            ) AS published_translation_count

          FROM cms_page p

          LEFT JOIN cms_page_i18n requested_i18n
            ON requested_i18n.id_cms_page =
              p.id_cms_page

            AND requested_i18n.id_master_comp =
              p.id_master_comp

            AND requested_i18n.cms_page_locale = ?

          LEFT JOIN cms_page_i18n default_i18n
            ON default_i18n.id_cms_page =
              p.id_cms_page

            AND default_i18n.id_master_comp =
              p.id_master_comp

            AND default_i18n.cms_page_locale =
              p.cms_page_default_locale

          WHERE ${whereQuery}

          ORDER BY
            ${orderQuery}
            ${sortQuery},

            p.id_cms_page
            ASC

          LIMIT ?
          OFFSET ?
        `,
        [requestedLocale, ...params, limit, offset],
      );

      //==================================================
      //==== RESPONSE DATA
      //==================================================

      const data: CmsPageListItem[] = (rows as any[]).map((item) => {
        const status = Number(item.cms_page_status) as CmsPageStatus;

        const resolvedLocale = item.resolved_locale
          ? String(item.resolved_locale)
          : null;

        return {
          id_cms_page: keyhsid.idCmsPage.encode(Number(item.id_cms_page)),

          id_parent_cms_page:
            item.id_parent_cms_page === null
              ? null
              : keyhsid.idCmsPage.encode(Number(item.id_parent_cms_page)),

          cms_page_key: String(item.cms_page_key),

          cms_page_type: String(item.cms_page_type),

          cms_page_template: item.cms_page_template ?? null,

          cms_page_content_mode: String(item.cms_page_content_mode),

          cms_page_default_locale: String(item.cms_page_default_locale),

          cms_page_status: status,

          effective_status: getEffectiveStatus(
            status,
            item.cms_page_publish_at,
            item.cms_page_unpublish_at,
          ),

          cms_page_visibility: Number(item.cms_page_visibility) as 0 | 1 | 2,

          cms_page_is_system: Number(item.cms_page_is_system) as 0 | 1,

          cms_page_is_featured: Number(item.cms_page_is_featured) as 0 | 1,

          cms_page_sort_order: Number(item.cms_page_sort_order ?? 0),

          cms_page_publish_at: item.cms_page_publish_at ?? null,

          cms_page_unpublish_at: item.cms_page_unpublish_at ?? null,

          requested_locale: requestedLocale,

          resolved_locale: resolvedLocale,

          is_fallback:
            !item.requested_translation_id && resolvedLocale !== null,

          cms_page_slug: item.cms_page_slug ?? null,

          cms_page_title: item.cms_page_title ?? null,

          cms_page_excerpt: item.cms_page_excerpt ?? null,

          cms_page_i18n_status:
            item.cms_page_i18n_status === null ||
            item.cms_page_i18n_status === undefined
              ? null
              : (Number(item.cms_page_i18n_status) as 0 | 1),

          translation_count: Number(item.translation_count ?? 0),

          published_translation_count: Number(
            item.published_translation_count ?? 0,
          ),

          created: item.created,

          updated: item.updated,
        };
      });

      //==================================================
      //==== PAGINATION
      //==================================================

      const totalPages = Math.ceil(total / limit);

      //==================================================
      //==== RESPONSE
      //==================================================

      return res.status(200).json({
        success: true,

        code: "CMS_PAGE_LIST_FETCHED",

        message: "CMS pages fetched successfully",

        data,

        pagination: {
          page,

          limit,

          total,

          length: data.length,

          pagerows: totalPages,

          total_pages: totalPages,

          has_more: offset + data.length < total,
        },
      });
    } catch (error) {
      console.error("Get CMS page list error:", error);

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
//==== DECODE CMS PAGE ID
//==================================================

const decodeCmsPageId = (value: unknown): number | null => {
  const encodedId = String(value ?? "").trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idCmsPage.decode(encodedId)[0];

  const idCmsPage = Number(decoded);

  if (!decoded || !Number.isInteger(idCmsPage) || idCmsPage <= 0) {
    return null;
  }

  return idCmsPage;
};

//==================================================
//==== PARSE JSON VALUE
//==================================================

const parseJsonValue = (value: unknown): unknown | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
//==== DATE
//==================================================

const normalizeDateValue = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" && !(value instanceof Date)) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

//==================================================
//==== JSON SERIALIZE
//==================================================

const serializeJsonValue = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return JSON.stringify(value);
};

//==================================================
//==== SESSION HAS PERMISSION
//==================================================

const sessionHasPermission = async (
  executor: any,

  scope: Extract<SessionScopeResult, { success: true }>,

  permissionKey: string,
): Promise<boolean> => {
  if (scope.isAllAccess === 1) {
    return true;
  }

  if (!Number.isInteger(scope.idAccess) || scope.idAccess <= 0) {
    return false;
  }

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
//==== CMS PAGE - CREATE
//==================================================

app.post(
  "/api/v1/cms-page",

  verifyToken,

  requirePermission("cms_page.create"),

  async (
    req: AuthRequest,

    res: Response,
  ) => {
    let connection: any = null;

    try {
      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== BODY
      //==================================================

      const {
        id_parent_cms_page,

        cms_page_key,

        cms_page_type,

        cms_page_template,

        cms_page_content_mode,

        cms_page_default_locale,

        cms_page_status,

        cms_page_visibility,

        cms_page_is_system,

        cms_page_is_featured,

        cms_page_sort_order,

        cms_page_publish_at,

        cms_page_unpublish_at,

        cms_page_settings_json,

        translations,

        attachments,
      } = req.body;

      //==================================================
      //==== KEY
      //==================================================

      const cleanKey = String(cms_page_key ?? "")
        .trim()
        .toLowerCase();

      if (!cleanKey) {
        return sendError(
          res,
          400,
          "CMS_PAGE_KEY_REQUIRED",
          "CMS page key is required",
        );
      }

      if (cleanKey.length > 100 || !/^[a-z0-9][a-z0-9_-]*$/.test(cleanKey)) {
        return sendError(
          res,
          400,
          "CMS_PAGE_KEY_INVALID",
          "Invalid CMS page key",
        );
      }

      //==================================================
      //==== TYPE
      //==================================================

      const cleanType = String(cms_page_type ?? "standard")
        .trim()
        .toLowerCase();

      if (
        !cleanType ||
        cleanType.length > 50 ||
        !/^[a-z0-9][a-z0-9_-]*$/.test(cleanType)
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_TYPE_INVALID",
          "Invalid CMS page type",
        );
      }

      //==================================================
      //==== TEMPLATE
      //==================================================

      const cleanTemplate = nullableString(cms_page_template);

      if (cleanTemplate && cleanTemplate.length > 100) {
        return sendError(
          res,
          400,
          "CMS_PAGE_TEMPLATE_TOO_LONG",
          "CMS page template is too long",
        );
      }

      //==================================================
      //==== CONTENT MODE
      //==================================================

      const cleanContentMode = String(cms_page_content_mode ?? "html")
        .trim()
        .toLowerCase();

      if (!["html", "blocks", "hybrid"].includes(cleanContentMode)) {
        return sendError(
          res,
          400,
          "CMS_PAGE_CONTENT_MODE_INVALID",
          "Invalid CMS page content mode",
        );
      }

      //==================================================
      //==== DEFAULT LOCALE
      //==================================================

      const defaultLocale = String(
        cms_page_default_locale ?? CMS_PAGE_DEFAULT_LOCALE,
      ).trim();

      if (!isCmsPageLocale(defaultLocale)) {
        return sendError(
          res,
          400,
          "CMS_PAGE_DEFAULT_LOCALE_UNSUPPORTED",
          "Unsupported CMS page default locale",
        );
      }

      //==================================================
      //==== STATUS
      //==================================================

      const pageStatus = Number(cms_page_status ?? CMS_PAGE_STATUS.DRAFT);

      if (
        !Number.isInteger(pageStatus) ||
        !Object.values(CMS_PAGE_STATUS).includes(pageStatus as CmsPageStatus)
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_STATUS_INVALID",
          "Invalid CMS page status",
        );
      }

      //==================================================
      //==== VISIBILITY
      //==================================================

      const visibility = Number(
        cms_page_visibility ?? CMS_PAGE_VISIBILITY.PUBLIC,
      );

      if (
        !Number.isInteger(visibility) ||
        !Object.values(CMS_PAGE_VISIBILITY).includes(
          visibility as CmsPageVisibility,
        )
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_VISIBILITY_INVALID",
          "Invalid CMS page visibility",
        );
      }

      //==================================================
      //==== FLAGS
      //==================================================

      const isSystem = normalizeFlag(cms_page_is_system, 0);

      const isFeatured = normalizeFlag(cms_page_is_featured, 0);

      if (isSystem === 1 && scope.isAllAccess !== 1) {
        return sendError(
          res,
          403,
          "CMS_PAGE_SYSTEM_ACCESS_DENIED",
          "Full access is required to create a system CMS page",
        );
      }

      //==================================================
      //==== SORT ORDER
      //==================================================

      const sortOrderRaw = Number(cms_page_sort_order ?? 0);

      if (!Number.isInteger(sortOrderRaw) || sortOrderRaw < 0) {
        return sendError(
          res,
          400,
          "CMS_PAGE_SORT_ORDER_INVALID",
          "Invalid CMS page sort order",
        );
      }

      //==================================================
      //==== PUBLISH WINDOW
      //==================================================

      const publishAt = normalizeDateValue(cms_page_publish_at);

      const unpublishAt = normalizeDateValue(cms_page_unpublish_at);

      if (cms_page_publish_at && !publishAt) {
        return sendError(
          res,
          400,
          "CMS_PAGE_PUBLISH_AT_INVALID",
          "Invalid CMS page publish date",
        );
      }

      if (cms_page_unpublish_at && !unpublishAt) {
        return sendError(
          res,
          400,
          "CMS_PAGE_UNPUBLISH_AT_INVALID",
          "Invalid CMS page unpublish date",
        );
      }

      if (
        publishAt &&
        unpublishAt &&
        unpublishAt.getTime() <= publishAt.getTime()
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_PUBLISH_WINDOW_INVALID",
          "Unpublish date must be after publish date",
        );
      }

      if (
        (publishAt || unpublishAt) &&
        pageStatus !== CMS_PAGE_STATUS.PUBLISHED
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_SCHEDULE_STATUS_INVALID",
          "Scheduled publication requires published page status",
        );
      }

      //==================================================
      //==== SETTINGS JSON
      //==================================================

      if (
        cms_page_settings_json !== null &&
        cms_page_settings_json !== undefined &&
        (typeof cms_page_settings_json !== "object" ||
          Array.isArray(cms_page_settings_json))
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_SETTINGS_INVALID",
          "CMS page settings must be an object",
        );
      }

      const settingsJson = serializeJsonValue(cms_page_settings_json);

      //==================================================
      //==== TRANSLATIONS ARRAY
      //==================================================

      if (!Array.isArray(translations) || translations.length === 0) {
        return sendError(
          res,
          400,
          "CMS_PAGE_TRANSLATIONS_REQUIRED",
          "At least one CMS page translation is required",
        );
      }

      if (translations.length > 20) {
        return sendError(
          res,
          400,
          "CMS_PAGE_TRANSLATIONS_LIMIT_EXCEEDED",
          "Too many CMS page translations",
        );
      }

      //==================================================
      //==== NORMALIZE TRANSLATIONS
      //==================================================

      const normalizedTranslations: {
        locale: string;

        slug: string;

        title: string;

        excerpt: string | null;

        content: string | null;

        contentJson: string | null;

        metaTitle: string | null;

        metaDescription: string | null;

        metaKeywords: string | null;

        metaRobots: string | null;

        canonicalUrl: string | null;

        ogTitle: string | null;

        ogDescription: string | null;

        schemaJson: string | null;

        status: CmsPageI18nStatus;
      }[] = [];

      const translationLocales = new Set<string>();

      for (const raw of translations) {
        const item = raw as CmsPageTranslationInput;

        const locale = String(item?.locale ?? "").trim();

        if (!isCmsPageLocale(locale)) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TRANSLATION_LOCALE_UNSUPPORTED",
            "Unsupported CMS page translation locale",
            {
              locale,
            },
          );
        }

        if (translationLocales.has(locale)) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TRANSLATION_DUPLICATED",
            "Duplicate CMS page translation locale",
            {
              locale,
            },
          );
        }

        translationLocales.add(locale);

        const title = String(item?.title ?? "").trim();

        if (!title) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TRANSLATION_TITLE_REQUIRED",
            "CMS page translation title is required",
            {
              locale,
            },
          );
        }

        if (title.length > 255) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TRANSLATION_TITLE_TOO_LONG",
            "CMS page translation title is too long",
            {
              locale,
            },
          );
        }

        const slug = slugify(nullableString(item?.slug) ?? title);

        if (!slug || slug.length > 191) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TRANSLATION_SLUG_INVALID",
            "Invalid CMS page translation slug",
            {
              locale,
            },
          );
        }

        const excerpt = nullableString(item?.excerpt);

        const content = typeof item?.content === "string" ? item.content : null;

        const metaTitle = nullableString(item?.meta_title);

        const metaDescription = nullableString(item?.meta_description);

        const metaKeywords = nullableString(item?.meta_keywords);

        const metaRobots = nullableString(item?.meta_robots);

        const canonicalUrl = nullableString(item?.canonical_url);

        const ogTitle = nullableString(item?.og_title);

        const ogDescription = nullableString(item?.og_description);

        //==================================================
        //==== LENGTH
        //==================================================

        if (metaTitle && metaTitle.length > 255) {
          return sendError(
            res,
            400,
            "CMS_PAGE_META_TITLE_TOO_LONG",
            "CMS page meta title is too long",
            {
              locale,
            },
          );
        }

        if (metaDescription && metaDescription.length > 500) {
          return sendError(
            res,
            400,
            "CMS_PAGE_META_DESCRIPTION_TOO_LONG",
            "CMS page meta description is too long",
            {
              locale,
            },
          );
        }

        if (metaKeywords && metaKeywords.length > 500) {
          return sendError(
            res,
            400,
            "CMS_PAGE_META_KEYWORDS_TOO_LONG",
            "CMS page meta keywords are too long",
            {
              locale,
            },
          );
        }

        if (metaRobots && metaRobots.length > 100) {
          return sendError(
            res,
            400,
            "CMS_PAGE_META_ROBOTS_TOO_LONG",
            "CMS page meta robots value is too long",
            {
              locale,
            },
          );
        }

        if (
          canonicalUrl &&
          (canonicalUrl.length > 500 || !isValidHttpUrl(canonicalUrl))
        ) {
          return sendError(
            res,
            400,
            "CMS_PAGE_CANONICAL_URL_INVALID",
            "Invalid CMS page canonical URL",
            {
              locale,
            },
          );
        }

        if (ogTitle && ogTitle.length > 255) {
          return sendError(
            res,
            400,
            "CMS_PAGE_OG_TITLE_TOO_LONG",
            "CMS page Open Graph title is too long",
            {
              locale,
            },
          );
        }

        if (ogDescription && ogDescription.length > 500) {
          return sendError(
            res,
            400,
            "CMS_PAGE_OG_DESCRIPTION_TOO_LONG",
            "CMS page Open Graph description is too long",
            {
              locale,
            },
          );
        }

        //==================================================
        //==== JSON
        //==================================================

        if (
          item?.content_json !== null &&
          item?.content_json !== undefined &&
          typeof item.content_json !== "object"
        ) {
          return sendError(
            res,
            400,
            "CMS_PAGE_CONTENT_JSON_INVALID",
            "CMS page content JSON must be an object or array",
            {
              locale,
            },
          );
        }

        if (
          item?.schema_json !== null &&
          item?.schema_json !== undefined &&
          (typeof item.schema_json !== "object" ||
            Array.isArray(item.schema_json))
        ) {
          return sendError(
            res,
            400,
            "CMS_PAGE_SCHEMA_JSON_INVALID",
            "CMS page schema JSON must be an object",
            {
              locale,
            },
          );
        }

        //==================================================
        //==== TRANSLATION STATUS
        //==================================================

        const translationStatus = Number(item?.status ?? 0);

        if (
          !Number.isInteger(translationStatus) ||
          ![0, 1].includes(translationStatus)
        ) {
          return sendError(
            res,
            400,
            "CMS_PAGE_TRANSLATION_STATUS_INVALID",
            "Invalid CMS page translation status",
            {
              locale,
            },
          );
        }

        normalizedTranslations.push({
          locale,

          slug,

          title,

          excerpt,

          content,

          contentJson: serializeJsonValue(item?.content_json),

          metaTitle,

          metaDescription,

          metaKeywords,

          metaRobots,

          canonicalUrl,

          ogTitle,

          ogDescription,

          schemaJson: serializeJsonValue(item?.schema_json),

          status: translationStatus as CmsPageI18nStatus,
        });
      }

      //==================================================
      //==== DEFAULT TRANSLATION REQUIRED
      //==================================================

      const defaultTranslation = normalizedTranslations.find(
        (item) => item.locale === defaultLocale,
      );

      if (!defaultTranslation) {
        return sendError(
          res,
          400,
          "CMS_PAGE_DEFAULT_TRANSLATION_REQUIRED",
          "Default locale translation is required",
          {
            locale: defaultLocale,
          },
        );
      }

      if (
        pageStatus === CMS_PAGE_STATUS.PUBLISHED &&
        defaultTranslation.status !== 1
      ) {
        return sendError(
          res,
          400,
          "CMS_PAGE_DEFAULT_TRANSLATION_NOT_PUBLISHED",
          "Default translation must be published before publishing the CMS page",
        );
      }

      //==================================================
      //==== ATTACHMENTS
      //==================================================

      const rawAttachments = attachments === undefined ? [] : attachments;

      if (!Array.isArray(rawAttachments)) {
        return sendError(
          res,
          400,
          "CMS_PAGE_ATTACHMENTS_ARRAY_INVALID",
          "CMS page attachments must be an array",
        );
      }

      if (rawAttachments.length > 30) {
        return sendError(
          res,
          400,
          "CMS_PAGE_ATTACHMENTS_LIMIT_EXCEEDED",
          "Too many CMS page attachments",
        );
      }

      const normalizedAttachments: {
        idAttachment: number;

        role: string;

        sortOrder: number;

        isPublic: 0 | 1;

        translations: {
          locale: string;

          caption: string | null;

          altText: string | null;
        }[];
      }[] = [];

      const attachmentKeys = new Set<string>();

      const singleRoles = new Set(["cover", "meta", "og", "hero"]);

      const usedSingleRoles = new Set<string>();

      for (const raw of rawAttachments) {
        const item = raw as CmsPageAttachmentInput;

        const encodedId = String(item?.id_attachment ?? "").trim();

        const decoded = keyhsid.idAttachment.decode(encodedId)[0];

        const idAttachment = Number(decoded);

        if (!decoded || !Number.isInteger(idAttachment) || idAttachment <= 0) {
          return sendError(
            res,
            400,
            "CMS_PAGE_ATTACHMENT_ID_INVALID",
            "Invalid CMS page attachment identifier",
          );
        }

        const role = String(item?.role ?? "gallery")
          .trim()
          .toLowerCase();

        if (!role || role.length > 50 || !/^[a-z0-9][a-z0-9_-]*$/.test(role)) {
          return sendError(
            res,
            400,
            "CMS_PAGE_ATTACHMENT_ROLE_INVALID",
            "Invalid CMS page attachment role",
          );
        }

        const attachmentKey = `${idAttachment}:${role}`;

        if (attachmentKeys.has(attachmentKey)) {
          return sendError(
            res,
            400,
            "CMS_PAGE_ATTACHMENT_DUPLICATED",
            "Duplicate CMS page attachment",
          );
        }

        attachmentKeys.add(attachmentKey);

        if (singleRoles.has(role)) {
          if (usedSingleRoles.has(role)) {
            return sendError(
              res,
              400,
              "CMS_PAGE_ATTACHMENT_ROLE_DUPLICATED",
              "Only one attachment is allowed for this CMS page attachment role",
              {
                role,
              },
            );
          }

          usedSingleRoles.add(role);
        }

        const rawSortOrder = Number(item?.sort_order ?? 0);

        const sortOrder =
          Number.isInteger(rawSortOrder) && rawSortOrder >= 0
            ? rawSortOrder
            : 0;

        const mediaTranslations = item?.translations ?? [];

        if (!Array.isArray(mediaTranslations)) {
          return sendError(
            res,
            400,
            "CMS_PAGE_ATTACHMENT_TRANSLATIONS_ARRAY_INVALID",
            "CMS page attachment translations must be an array",
          );
        }

        const normalizedMediaTranslations: {
          locale: string;

          caption: string | null;

          altText: string | null;
        }[] = [];

        const mediaLocales = new Set<string>();

        for (const rawTranslation of mediaTranslations) {
          const locale = String(rawTranslation?.locale ?? "").trim();

          if (!isCmsPageLocale(locale)) {
            return sendError(
              res,
              400,
              "CMS_PAGE_ATTACHMENT_LOCALE_UNSUPPORTED",
              "Unsupported CMS page attachment locale",
              {
                locale,
              },
            );
          }

          if (mediaLocales.has(locale)) {
            return sendError(
              res,
              400,
              "CMS_PAGE_ATTACHMENT_TRANSLATION_DUPLICATED",
              "Duplicate CMS page attachment translation",
              {
                locale,
              },
            );
          }

          mediaLocales.add(locale);

          const caption = nullableString(rawTranslation?.caption);

          const altText = nullableString(rawTranslation?.alt_text);

          if (caption && caption.length > 500) {
            return sendError(
              res,
              400,
              "CMS_PAGE_ATTACHMENT_CAPTION_TOO_LONG",
              "CMS page attachment caption is too long",
            );
          }

          if (altText && altText.length > 500) {
            return sendError(
              res,
              400,
              "CMS_PAGE_ATTACHMENT_ALT_TEXT_TOO_LONG",
              "CMS page attachment alt text is too long",
            );
          }

          normalizedMediaTranslations.push({
            locale,

            caption,

            altText,
          });
        }

        normalizedAttachments.push({
          idAttachment,

          role,

          sortOrder,

          isPublic: normalizeFlag(item?.is_public, 1),

          translations: normalizedMediaTranslations,
        });
      }

      //==================================================
      //==== TRANSACTION
      //==================================================

      connection = await pool.getConnection();

      await connection.beginTransaction();

      //==================================================
      //==== PUBLISH PERMISSION
      //==================================================

      const usesPublication =
        pageStatus === CMS_PAGE_STATUS.PUBLISHED ||
        publishAt !== null ||
        unpublishAt !== null ||
        normalizedTranslations.some((item) => item.status === 1);

      if (usesPublication) {
        const canPublish = await sessionHasPermission(
          connection,

          scope,

          "cms_page.publish",
        );

        if (!canPublish) {
          await connection.rollback();

          return sendError(
            res,
            403,
            "CMS_PAGE_PUBLISH_ACCESS_DENIED",
            "Publish permission is required",
          );
        }
      }

      //==================================================
      //==== ATTACHMENT PERMISSION
      //==================================================

      if (normalizedAttachments.length > 0) {
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
            "CMS_PAGE_ATTACHMENT_ACCESS_DENIED",
            "Attachment access is required to assign CMS page media",
          );
        }
      }

      //==================================================
      //==== PARENT
      //==================================================

      let idParentCmsPage: number | null = null;

      if (
        id_parent_cms_page !== null &&
        id_parent_cms_page !== undefined &&
        id_parent_cms_page !== ""
      ) {
        idParentCmsPage = decodeCmsPageId(id_parent_cms_page);

        if (!idParentCmsPage) {
          await connection.rollback();

          return sendError(
            res,
            400,
            "CMS_PAGE_PARENT_INVALID_ID",
            "Invalid parent CMS page identifier",
          );
        }

        const [parentRows] = await connection.query(
          `
              SELECT
                id_cms_page

              FROM cms_page

              WHERE id_cms_page = ?

                AND id_master_comp = ?

                AND cms_page_deleted_at
                  IS NULL

              LIMIT 1
            `,
          [idParentCmsPage, scope.idMasterComp],
        );

        if (!(parentRows as any[]).length) {
          await connection.rollback();

          return sendError(
            res,
            404,
            "CMS_PAGE_PARENT_NOT_FOUND",
            "Parent CMS page not found",
          );
        }
      }

      //==================================================
      //==== DUPLICATE PAGE KEY
      //==================================================

      const [keyRows] = await connection.query(
        `
            SELECT
              id_cms_page

            FROM cms_page

            WHERE id_master_comp = ?

              AND cms_page_key = ?

            LIMIT 1
          `,
        [scope.idMasterComp, cleanKey],
      );

      if ((keyRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "CMS_PAGE_KEY_EXISTS",
          "CMS page key is already in use",
        );
      }

      //==================================================
      //==== DUPLICATE SLUG
      //==================================================

      for (const translation of normalizedTranslations) {
        const [slugRows] = await connection.query(
          `
              SELECT
                id_cms_page_i18n

              FROM cms_page_i18n

              WHERE id_master_comp = ?

                AND cms_page_locale = ?

                AND cms_page_slug = ?

              LIMIT 1
            `,
          [scope.idMasterComp, translation.locale, translation.slug],
        );

        if ((slugRows as any[]).length) {
          await connection.rollback();

          return sendError(
            res,
            409,
            "CMS_PAGE_SLUG_EXISTS",
            "CMS page slug is already in use for this locale",
            {
              locale: translation.locale,

              slug: translation.slug,
            },
          );
        }
      }

      //==================================================
      //==== VALIDATE ATTACHMENTS
      //==================================================

      if (normalizedAttachments.length > 0) {
        const attachmentIds = [
          ...new Set(normalizedAttachments.map((item) => item.idAttachment)),
        ];

        const placeholders = attachmentIds.map(() => "?").join(",");

        const [attachmentRows] = await connection.query(
          `
              SELECT
                id_attachment

              FROM attachment

              WHERE id_attachment
                IN (${placeholders})

                AND id_master_comp = ?

                AND collection_name =
                  'media_library'

                AND attachment_status = 1

                AND deleted_at IS NULL
            `,
          [...attachmentIds, scope.idMasterComp],
        );

        if ((attachmentRows as any[]).length !== attachmentIds.length) {
          await connection.rollback();

          return sendError(
            res,
            400,
            "CMS_PAGE_ATTACHMENT_NOT_AVAILABLE",
            "One or more CMS page attachments are not available",
          );
        }
      }

      //==================================================
      //==== INSERT PAGE
      //==================================================

      const [pageInsert] = await connection.query(
        `
            INSERT INTO cms_page
            (
              id_master_comp,

              id_parent_cms_page,

              cms_page_key,

              cms_page_type,

              cms_page_template,

              cms_page_content_mode,

              cms_page_default_locale,

              cms_page_status,

              cms_page_visibility,

              cms_page_is_system,

              cms_page_is_featured,

              cms_page_sort_order,

              cms_page_publish_at,

              cms_page_unpublish_at,

              cms_page_settings_json,

              id_created_by,

              id_updated_by,

              created,

              updated,

              cms_page_deleted_at
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

              NOW(),

              NOW(),

              NULL
            )
          `,
        [
          scope.idMasterComp,

          idParentCmsPage,

          cleanKey,

          cleanType,

          cleanTemplate,

          cleanContentMode,

          defaultLocale,

          pageStatus,

          visibility,

          isSystem,

          isFeatured,

          sortOrderRaw,

          publishAt,

          unpublishAt,

          settingsJson,

          scope.idAdminAcct,

          scope.idAdminAcct,
        ],
      );

      const idCmsPage = Number((pageInsert as any).insertId);

      //==================================================
      //==== INSERT TRANSLATIONS
      //==================================================

      for (const translation of normalizedTranslations) {
        await connection.query(
          `
            INSERT INTO cms_page_i18n
            (
              id_cms_page,

              id_master_comp,

              cms_page_locale,

              cms_page_slug,

              cms_page_title,

              cms_page_excerpt,

              cms_page_content,

              cms_page_content_json,

              cms_page_meta_title,

              cms_page_meta_description,

              cms_page_meta_keywords,

              cms_page_meta_robots,

              cms_page_canonical_url,

              cms_page_og_title,

              cms_page_og_description,

              cms_page_schema_json,

              cms_page_i18n_status,

              created,

              updated
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

              NOW(),

              NOW()
            )
          `,
          [
            idCmsPage,

            scope.idMasterComp,

            translation.locale,

            translation.slug,

            translation.title,

            translation.excerpt,

            translation.content,

            translation.contentJson,

            translation.metaTitle,

            translation.metaDescription,

            translation.metaKeywords,

            translation.metaRobots,

            translation.canonicalUrl,

            translation.ogTitle,

            translation.ogDescription,

            translation.schemaJson,

            translation.status,
          ],
        );
      }

      //==================================================
      //==== INSERT ATTACHMENTS
      //==================================================

      for (const media of normalizedAttachments) {
        const [relationInsert] = await connection.query(
          `
              INSERT INTO cms_page_attachment
              (
                id_cms_page,

                id_attachment,

                cms_page_attachment_role,

                cms_page_attachment_sort_order,

                cms_page_attachment_is_public,

                created,

                updated
              )
              VALUES
              (
                ?,
                ?,
                ?,
                ?,
                ?,

                NOW(),

                NOW()
              )
            `,
          [
            idCmsPage,

            media.idAttachment,

            media.role,

            media.sortOrder,

            media.isPublic,
          ],
        );

        const idRelation = Number((relationInsert as any).insertId);

        for (const translation of media.translations) {
          await connection.query(
            `
              INSERT INTO cms_page_attachment_i18n
              (
                id_cms_page_attachment,

                cms_page_attachment_locale,

                cms_page_attachment_caption,

                cms_page_attachment_alt_text,

                created,

                updated
              )
              VALUES
              (
                ?,
                ?,
                ?,
                ?,

                NOW(),

                NOW()
              )
            `,
            [
              idRelation,

              translation.locale,

              translation.caption,

              translation.altText,
            ],
          );
        }
      }

      //==================================================
      //==== AUDIT
      //==================================================

      await writeAuditLog({
        req,

        connection,

        writeMode: "strict",

        idMasterComp: scope.idMasterComp,

        eventCode: "cms_page.created",

        category: "data_change",

        module: "cms_page",

        action: "create",

        actorType: "admin",

        actorId: scope.idAdminAcct,

        actorLabel: req.user?.alias ?? null,

        entityType: "cms_page",

        entityId: idCmsPage,

        entityLabel: defaultTranslation.title,

        after: {
          cms_page_key: cleanKey,

          cms_page_type: cleanType,

          cms_page_template: cleanTemplate,

          cms_page_content_mode: cleanContentMode,

          cms_page_default_locale: defaultLocale,

          cms_page_status: pageStatus,

          cms_page_visibility: visibility,

          cms_page_is_system: isSystem,

          cms_page_is_featured: isFeatured,

          cms_page_sort_order: sortOrderRaw,

          cms_page_publish_at: publishAt,

          cms_page_unpublish_at: unpublishAt,

          translations: normalizedTranslations.map((item) => ({
            locale: item.locale,

            slug: item.slug,

            title: item.title,

            status: item.status,
          })),

          attachments: normalizedAttachments.map((item) => ({
            id_attachment: item.idAttachment,

            role: item.role,

            sort_order: item.sortOrder,

            is_public: item.isPublic,
          })),
        },

        httpStatus: 201,
      });

      //==================================================
      //==== COMMIT
      //==================================================

      await connection.commit();

      //==================================================
      //==== RESPONSE
      //==================================================

      return sendSuccess(
        res,
        201,
        "CMS_PAGE_CREATED",
        "CMS page created successfully",
        {
          id_cms_page: keyhsid.idCmsPage.encode(idCmsPage),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      //==================================================
      //==== UNIQUE RACE CONDITION
      //==================================================

      if ((error as any)?.code === "ER_DUP_ENTRY") {
        return sendError(
          res,
          409,
          "CMS_PAGE_ALREADY_EXISTS",
          "CMS page key or slug is already in use",
        );
      }

      console.error("Create CMS page error:", error);

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
//==== CMS PAGE - GET DETAIL
//==================================================

app.get(
  "/api/v1/cms-page/:id",

  verifyToken,

  requirePermission("cms_page.view"),

  async (
    req: AuthRequest,

    res: Response,
  ) => {
    try {
      //==================================================
      //==== ID
      //==================================================

      const idCmsPage = decodeCmsPageId(req.params.id);

      if (!idCmsPage) {
        return sendError(
          res,
          400,
          "CMS_PAGE_INVALID_ID",
          "Invalid CMS page identifier",
        );
      }

      //==================================================
      //==== SESSION
      //==================================================

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      //==================================================
      //==== PAGE
      //==================================================

      const [pageRows] = await pool.query(
        `
          SELECT
            p.id_cms_page,

            p.id_parent_cms_page,

            p.cms_page_key,

            p.cms_page_type,

            p.cms_page_template,

            p.cms_page_content_mode,

            p.cms_page_default_locale,

            p.cms_page_status,

            p.cms_page_visibility,

            p.cms_page_is_system,

            p.cms_page_is_featured,

            p.cms_page_sort_order,

            p.cms_page_publish_at,

            p.cms_page_unpublish_at,

            p.cms_page_settings_json,

            p.id_created_by,

            p.id_updated_by,

            p.created,

            p.updated,

            creator.alias
              AS created_by_alias,

            updater.alias
              AS updated_by_alias

          FROM cms_page p

          LEFT JOIN admin_acct creator
            ON creator.id_admin_acct =
              p.id_created_by

          LEFT JOIN admin_acct updater
            ON updater.id_admin_acct =
              p.id_updated_by

          WHERE p.id_cms_page = ?

            AND p.id_master_comp = ?

            AND p.cms_page_deleted_at
              IS NULL

          LIMIT 1
        `,
        [idCmsPage, scope.idMasterComp],
      );

      const pages = pageRows as any[];

      if (!pages.length) {
        return sendError(res, 404, "CMS_PAGE_NOT_FOUND", "CMS page not found");
      }

      const page = pages[0];

      //==================================================
      //==== TRANSLATIONS
      //==================================================

      const [translationRows] = await pool.query(
        `
            SELECT
              id_cms_page_i18n,

              cms_page_locale,

              cms_page_slug,

              cms_page_title,

              cms_page_excerpt,

              cms_page_content,

              cms_page_content_json,

              cms_page_meta_title,

              cms_page_meta_description,

              cms_page_meta_keywords,

              cms_page_meta_robots,

              cms_page_canonical_url,

              cms_page_og_title,

              cms_page_og_description,

              cms_page_schema_json,

              cms_page_i18n_status,

              created,

              updated

            FROM cms_page_i18n

            WHERE id_cms_page = ?

              AND id_master_comp = ?

            ORDER BY
              cms_page_locale ASC
          `,
        [idCmsPage, scope.idMasterComp],
      );

      //==================================================
      //==== ATTACHMENTS
      //==================================================

      const [attachmentRows] = await pool.query(
        `
            SELECT
              cpa.id_cms_page_attachment,

              cpa.id_attachment,

              cpa.cms_page_attachment_role,

              cpa.cms_page_attachment_sort_order,

              cpa.cms_page_attachment_is_public,

              cpa.created,

              cpa.updated,

              a.collection_name,

              a.name,

              a.original_name,

              a.file_name,

              a.mime_type,

              a.extension,

              a.storage_path,

              a.file_size,

              a.width,

              a.height

            FROM cms_page_attachment cpa

            INNER JOIN attachment a
              ON a.id_attachment =
                cpa.id_attachment

            WHERE cpa.id_cms_page = ?

              AND a.id_master_comp = ?

              AND a.attachment_status = 1

              AND a.deleted_at IS NULL

            ORDER BY
              cpa.cms_page_attachment_sort_order ASC,

              cpa.id_cms_page_attachment ASC
          `,
        [idCmsPage, scope.idMasterComp],
      );

      //==================================================
      //==== ATTACHMENT TRANSLATIONS
      //==================================================

      const attachments = attachmentRows as any[];

      const attachmentRelationIds = attachments.map((item) =>
        Number(item.id_cms_page_attachment),
      );

      let attachmentTranslationRows: any[] = [];

      if (attachmentRelationIds.length) {
        const placeholders = attachmentRelationIds.map(() => "?").join(",");

        const [rows] = await pool.query(
          `
              SELECT
                id_cms_page_attachment_i18n,

                id_cms_page_attachment,

                cms_page_attachment_locale,

                cms_page_attachment_caption,

                cms_page_attachment_alt_text,

                created,

                updated

              FROM cms_page_attachment_i18n

              WHERE id_cms_page_attachment
                IN (${placeholders})

              ORDER BY
                cms_page_attachment_locale ASC
            `,
          attachmentRelationIds,
        );

        attachmentTranslationRows = rows as any[];
      }

      //==================================================
      //==== MAP TRANSLATIONS
      //==================================================

      const translations = (translationRows as any[]).map((item) => ({
        cms_page_locale: String(item.cms_page_locale),

        cms_page_slug: String(item.cms_page_slug),

        cms_page_title: String(item.cms_page_title),

        cms_page_excerpt: item.cms_page_excerpt ?? null,

        cms_page_content: item.cms_page_content ?? null,

        cms_page_content_json: parseJsonValue(item.cms_page_content_json),

        cms_page_meta_title: item.cms_page_meta_title ?? null,

        cms_page_meta_description: item.cms_page_meta_description ?? null,

        cms_page_meta_keywords: item.cms_page_meta_keywords ?? null,

        cms_page_meta_robots: item.cms_page_meta_robots ?? null,

        cms_page_canonical_url: item.cms_page_canonical_url ?? null,

        cms_page_og_title: item.cms_page_og_title ?? null,

        cms_page_og_description: item.cms_page_og_description ?? null,

        cms_page_schema_json: parseJsonValue(item.cms_page_schema_json),

        cms_page_i18n_status: Number(item.cms_page_i18n_status),

        created: item.created,

        updated: item.updated,
      }));

      //==================================================
      //==== MAP ATTACHMENTS
      //==================================================

      const media = attachments.map((item) => {
        const relationId = Number(item.id_cms_page_attachment);

        return {
          id_attachment: keyhsid.idAttachment.encode(
            Number(item.id_attachment),
          ),

          cms_page_attachment_role: String(item.cms_page_attachment_role),

          cms_page_attachment_sort_order: Number(
            item.cms_page_attachment_sort_order ?? 0,
          ),

          cms_page_attachment_is_public: Number(
            item.cms_page_attachment_is_public,
          ),

          collection_name: item.collection_name,

          name: item.name,

          original_name: item.original_name,

          file_name: item.file_name,

          mime_type: item.mime_type,

          extension: item.extension,

          file_size: Number(item.file_size ?? 0),

          width: item.width === null ? null : Number(item.width),

          height: item.height === null ? null : Number(item.height),

          asset_url: buildAttachmentUrl(item.storage_path),

          translations: attachmentTranslationRows
            .filter(
              (translation) =>
                Number(translation.id_cms_page_attachment) === relationId,
            )
            .map((translation) => ({
              cms_page_attachment_locale: String(
                translation.cms_page_attachment_locale,
              ),

              cms_page_attachment_caption:
                translation.cms_page_attachment_caption ?? null,

              cms_page_attachment_alt_text:
                translation.cms_page_attachment_alt_text ?? null,

              created: translation.created,

              updated: translation.updated,
            })),

          created: item.created,

          updated: item.updated,
        };
      });

      //==================================================
      //==== RESPONSE
      //==================================================

      return res.status(200).json({
        success: true,

        code: "CMS_PAGE_DETAIL_FETCHED",

        message: "CMS page detail fetched successfully",

        data: {
          id_cms_page: keyhsid.idCmsPage.encode(Number(page.id_cms_page)),

          id_parent_cms_page:
            page.id_parent_cms_page === null
              ? null
              : keyhsid.idCmsPage.encode(Number(page.id_parent_cms_page)),

          cms_page_key: page.cms_page_key,

          cms_page_type: page.cms_page_type,

          cms_page_template: page.cms_page_template ?? null,

          cms_page_content_mode: page.cms_page_content_mode,

          cms_page_default_locale: page.cms_page_default_locale,

          cms_page_status: Number(page.cms_page_status),

          effective_status: getEffectiveStatus(
            Number(page.cms_page_status),
            page.cms_page_publish_at,
            page.cms_page_unpublish_at,
          ),

          cms_page_visibility: Number(page.cms_page_visibility),

          cms_page_is_system: Number(page.cms_page_is_system),

          cms_page_is_featured: Number(page.cms_page_is_featured),

          cms_page_sort_order: Number(page.cms_page_sort_order ?? 0),

          cms_page_publish_at: page.cms_page_publish_at ?? null,

          cms_page_unpublish_at: page.cms_page_unpublish_at ?? null,

          cms_page_settings_json: parseJsonValue(page.cms_page_settings_json),

          translations,

          attachments: media,

          translation_count: translations.length,

          attachment_count: media.length,

          created_by: page.id_created_by
            ? {
                id_admin_acct: keyhsid.idAdmin.encode(
                  Number(page.id_created_by),
                ),

                alias: page.created_by_alias ?? null,
              }
            : null,

          updated_by: page.id_updated_by
            ? {
                id_admin_acct: keyhsid.idAdmin.encode(
                  Number(page.id_updated_by),
                ),

                alias: page.updated_by_alias ?? null,
              }
            : null,

          created: page.created,

          updated: page.updated,
        },
      });
    } catch (error) {
      console.error("Get CMS page detail error:", error);

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
//==== ROUTER
//==================================================

export default app;
