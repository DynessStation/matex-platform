import express = require("express");

import { Response } from "express";

import db = require("../../db");

import keyhsid from "../../hsid";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

import { isCmsPageLocale } from "../../config/cms-page.config";

import { writeAuditLog } from "../../helper/audit-log.helper";

const app = express();

const { pool } = db;

type SessionScopeResult =
  | {
      success: true;
      idAdminAcct: number;
      idMasterComp: number;
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
  const idAdminAcct = Number(req.user?.id_admin_acct);

  if (!Number.isInteger(idAdminAcct) || idAdminAcct <= 0) {
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
  };
};

const decodeNavigationId = (value: unknown): number | null => {
  const encodedId = String(value ?? "").trim();

  if (!encodedId) {
    return null;
  }

  const decoded = keyhsid.idWebNavigation.decode(encodedId)[0];

  const id = Number(decoded);

  if (!decoded || !Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

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

type NavigationMetadataResult =
  | {
      success: true;
      name: string;
      location: string;
      defaultLocale: string;
      settingsJson: string | null;
      settings: Record<string, unknown> | null;
    }
  | {
      success: false;
      code: string;
      message: string;
    };

const normalizeNavigationKey = (value: unknown): string | null => {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!key || key.length > 100 || !/^[a-z0-9][a-z0-9_-]*$/.test(key)) {
    return null;
  }

  return key;
};

const normalizeNavigationMetadata = (body: any): NavigationMetadataResult => {
  const name = String(body?.web_navigation_name ?? "").trim();

  if (!name || name.length > 255) {
    return {
      success: false,
      code: "WEB_NAVIGATION_NAME_INVALID",
      message:
        "Web navigation name is required and must not exceed 255 characters",
    };
  }

  const location = String(body?.web_navigation_location ?? "")
    .trim()
    .toLowerCase();

  if (
    !location ||
    location.length > 50 ||
    !/^[a-z0-9][a-z0-9_-]*$/.test(location)
  ) {
    return {
      success: false,
      code: "WEB_NAVIGATION_LOCATION_INVALID",
      message: "Invalid web navigation location",
    };
  }

  const defaultLocale = String(
    body?.web_navigation_default_locale ?? "",
  ).trim();

  if (!isCmsPageLocale(defaultLocale)) {
    return {
      success: false,
      code: "WEB_NAVIGATION_LOCALE_UNSUPPORTED",
      message: "Unsupported default locale",
    };
  }

  const rawSettings = body?.web_navigation_settings_json ?? null;

  if (rawSettings === null || rawSettings === undefined || rawSettings === "") {
    return {
      success: true,
      name,
      location,
      defaultLocale,
      settingsJson: null,
      settings: null,
    };
  }

  let settings: unknown = rawSettings;

  if (typeof rawSettings === "string") {
    try {
      settings = JSON.parse(rawSettings);
    } catch {
      return {
        success: false,
        code: "WEB_NAVIGATION_SETTINGS_INVALID",
        message: "Web navigation settings must contain valid JSON",
      };
    }
  }

  if (
    typeof settings !== "object" ||
    settings === null ||
    Array.isArray(settings)
  ) {
    return {
      success: false,
      code: "WEB_NAVIGATION_SETTINGS_INVALID",
      message: "Web navigation settings must be a JSON object",
    };
  }

  return {
    success: true,
    name,
    location,
    defaultLocale,
    settingsJson: JSON.stringify(settings),
    settings: settings as Record<string, unknown>,
  };
};

//==================================================
//==== WEB NAVIGATION - LIST
//==================================================

app.get(
  "/api/v1/web-navigation",

  verifyToken,

  requirePermission("web_navigation.view"),

  async (req: AuthRequest, res: Response) => {
    try {
      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const [rows] = await pool.query(
        `
          SELECT
            navigation.id_web_navigation,

            navigation.web_navigation_key,

            navigation.web_navigation_name,

            navigation.web_navigation_location,

            navigation.web_navigation_default_locale,

            navigation.web_navigation_status,

            navigation.created,

            navigation.updated,

            COUNT(item.id_web_navigation_item)
              AS item_count,

            SUM(
              CASE
                WHEN item.web_navigation_item_status = 1
                THEN 1
                ELSE 0
              END
            ) AS active_item_count

          FROM web_navigation navigation

          LEFT JOIN web_navigation_item item
            ON item.id_web_navigation =
              navigation.id_web_navigation

            AND item.id_master_comp =
              navigation.id_master_comp

            AND item.web_navigation_item_deleted_at
              IS NULL

          WHERE navigation.id_master_comp = ?

            AND navigation.web_navigation_deleted_at
              IS NULL

          GROUP BY
            navigation.id_web_navigation,

            navigation.web_navigation_key,

            navigation.web_navigation_name,

            navigation.web_navigation_location,

            navigation.web_navigation_default_locale,

            navigation.web_navigation_status,

            navigation.created,

            navigation.updated

          ORDER BY
            navigation.web_navigation_location,

            navigation.web_navigation_name,

            navigation.id_web_navigation
        `,
        [scope.idMasterComp],
      );

      const navigations = (rows as any[]).map((row) => ({
        id_web_navigation: keyhsid.idWebNavigation.encode(
          Number(row.id_web_navigation),
        ),

        key: row.web_navigation_key,

        name: row.web_navigation_name,

        location: row.web_navigation_location,

        default_locale: row.web_navigation_default_locale,

        status: Number(row.web_navigation_status),

        item_count: Number(row.item_count ?? 0),

        active_item_count: Number(row.active_item_count ?? 0),

        created: row.created,

        updated: row.updated,
      }));

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_LIST_FOUND",
        "Web navigation loaded",
        {
          navigations,
        },
      );
    } catch (error) {
      console.error("[Web Navigation] Failed to load navigation list", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_LIST_UNAVAILABLE",
        "Unable to load web navigation",
      );
    }
  },
);

//==================================================
//==== WEB NAVIGATION - DETAIL
//==================================================

app.get(
  "/api/v1/web-navigation/:id",

  verifyToken,

  requirePermission("web_navigation.view"),

  async (req: AuthRequest, res: Response) => {
    try {
      const idNavigation = decodeNavigationId(req.params.id);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const [navigationRows] = await pool.query(
        `
          SELECT
            id_web_navigation,

            web_navigation_key,

            web_navigation_name,

            web_navigation_location,

            web_navigation_default_locale,

            web_navigation_status,

            web_navigation_settings_json,

            created,

            updated

          FROM web_navigation

          WHERE id_web_navigation = ?

            AND id_master_comp = ?

            AND web_navigation_deleted_at IS NULL

          LIMIT 1
        `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const navigation = navigations[0];

      const [itemRows] = await pool.query(
        `
          SELECT
            item.id_web_navigation_item,

            item.id_parent_web_navigation_item,

            item.id_cms_page,

            item.web_navigation_item_key,

            item.web_navigation_item_link_type,

            item.web_navigation_item_target_blank,

            item.web_navigation_item_icon,

            item.web_navigation_item_badge_text,

            item.web_navigation_item_badge_color,

            item.web_navigation_item_sort_order,

            item.web_navigation_item_status,

            item.web_navigation_item_settings_json,

            item.created,

            item.updated,

            cms_page.cms_page_key,

            cms_page_i18n.cms_page_title

          FROM web_navigation_item item

          LEFT JOIN cms_page
            ON cms_page.id_cms_page =
              item.id_cms_page

            AND cms_page.id_master_comp =
              item.id_master_comp

          LEFT JOIN cms_page_i18n
            ON cms_page_i18n.id_cms_page =
              cms_page.id_cms_page

            AND cms_page_i18n.id_master_comp =
              cms_page.id_master_comp

            AND cms_page_i18n.cms_page_locale =
              ?

          WHERE item.id_web_navigation = ?

            AND item.id_master_comp = ?

            AND item.web_navigation_item_deleted_at
              IS NULL

          ORDER BY
            item.web_navigation_item_sort_order,

            item.id_web_navigation_item
        `,
        [
          navigation.web_navigation_default_locale,
          idNavigation,
          scope.idMasterComp,
        ],
      );

      const [translationRows] = await pool.query(
        `
          SELECT
            translation.id_web_navigation_item,

            translation.web_navigation_item_locale,

            translation.web_navigation_item_label,

            translation.web_navigation_item_path,

            translation.web_navigation_item_url,

            translation.web_navigation_item_i18n_status

          FROM web_navigation_item_i18n translation

          INNER JOIN web_navigation_item item
            ON item.id_web_navigation_item =
              translation.id_web_navigation_item

            AND item.id_master_comp =
              translation.id_master_comp

          WHERE item.id_web_navigation = ?

            AND item.id_master_comp = ?

            AND item.web_navigation_item_deleted_at
              IS NULL

          ORDER BY
            translation.id_web_navigation_item,

            translation.web_navigation_item_locale
        `,
        [idNavigation, scope.idMasterComp],
      );

      const translationsByItem = new Map<number, any[]>();

      for (const row of translationRows as any[]) {
        const itemId = Number(row.id_web_navigation_item);

        const translations = translationsByItem.get(itemId) ?? [];

        translations.push({
          locale: row.web_navigation_item_locale,

          label: row.web_navigation_item_label,

          path: row.web_navigation_item_path,

          url: row.web_navigation_item_url,

          status: Number(row.web_navigation_item_i18n_status),
        });

        translationsByItem.set(itemId, translations);
      }

      const items = (itemRows as any[]).map((item) => {
        const itemId = Number(item.id_web_navigation_item);

        return {
          id_web_navigation_item: keyhsid.idWebNavigationItem.encode(itemId),

          id_parent_web_navigation_item:
            item.id_parent_web_navigation_item === null
              ? null
              : keyhsid.idWebNavigationItem.encode(
                  Number(item.id_parent_web_navigation_item),
                ),

          id_cms_page:
            item.id_cms_page === null
              ? null
              : keyhsid.idCmsPage.encode(Number(item.id_cms_page)),

          cms_page:
            item.id_cms_page === null
              ? null
              : {
                  key: item.cms_page_key ?? null,

                  title: item.cms_page_title ?? null,
                },

          key: item.web_navigation_item_key,

          link_type: item.web_navigation_item_link_type,

          target_blank: Number(item.web_navigation_item_target_blank) === 1,

          icon: item.web_navigation_item_icon,

          badge_text: item.web_navigation_item_badge_text,

          badge_color: item.web_navigation_item_badge_color,

          sort_order: Number(item.web_navigation_item_sort_order),

          status: Number(item.web_navigation_item_status),

          settings: parseJsonValue(item.web_navigation_item_settings_json),

          translations: translationsByItem.get(itemId) ?? [],

          created: item.created,

          updated: item.updated,
        };
      });

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_FOUND",
        "Web navigation loaded",
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(
            Number(navigation.id_web_navigation),
          ),

          key: navigation.web_navigation_key,

          name: navigation.web_navigation_name,

          location: navigation.web_navigation_location,

          default_locale: navigation.web_navigation_default_locale,

          status: Number(navigation.web_navigation_status),

          settings: parseJsonValue(navigation.web_navigation_settings_json),

          items,

          created: navigation.created,

          updated: navigation.updated,
        },
      );
    } catch (error) {
      console.error("[Web Navigation] Failed to load navigation detail", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_UNAVAILABLE",
        "Unable to load web navigation",
      );
    }
  },
);

//==================================================
//==== WEB NAVIGATION - CREATE
//==================================================

app.post(
  "/api/v1/web-navigation",

  verifyToken,

  requirePermission("web_navigation.create"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const key = normalizeNavigationKey(req.body?.web_navigation_key);

      if (!key) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_KEY_INVALID",
          "Invalid web navigation key",
        );
      }

      const metadata = normalizeNavigationMetadata(req.body);

      if (!metadata.success) {
        return sendError(res, 400, metadata.code, metadata.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        `
          SELECT id_web_navigation

          FROM web_navigation

          WHERE id_master_comp = ?

            AND web_navigation_key = ?

          LIMIT 1

          FOR UPDATE
        `,
        [scope.idMasterComp, key],
      );

      if ((existingRows as any[]).length) {
        await connection.rollback();

        return sendError(
          res,
          409,
          "WEB_NAVIGATION_KEY_EXISTS",
          "Web navigation key is already in use",
        );
      }

      const [insertResult] = await connection.query(
        `
          INSERT INTO web_navigation
          (
            id_master_comp,

            web_navigation_key,

            web_navigation_name,

            web_navigation_location,

            web_navigation_default_locale,

            web_navigation_status,

            web_navigation_settings_json,

            id_created_by,

            id_updated_by,

            created,

            updated
          )
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())
        `,
        [
          scope.idMasterComp,
          key,
          metadata.name,
          metadata.location,
          metadata.defaultLocale,
          metadata.settingsJson,
          scope.idAdminAcct,
          scope.idAdminAcct,
        ],
      );

      const idNavigation = Number((insertResult as any).insertId);

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation.created",
        category: "data_change",
        module: "web_navigation",
        action: "create",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation",
        entityId: idNavigation,
        entityLabel: metadata.name,
        after: {
          key,
          name: metadata.name,
          location: metadata.location,
          default_locale: metadata.defaultLocale,
          status: 0,
          settings: metadata.settings,
        },
        httpStatus: 201,
      });

      await connection.commit();

      return sendSuccess(
        res,
        201,
        "WEB_NAVIGATION_CREATED",
        "Web navigation created successfully",
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      if ((error as any)?.code === "ER_DUP_ENTRY") {
        return sendError(
          res,
          409,
          "WEB_NAVIGATION_KEY_EXISTS",
          "Web navigation key is already in use",
        );
      }

      console.error("[Web Navigation] Failed to create navigation", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_CREATE_FAILED",
        "Unable to create web navigation",
      );
    } finally {
      connection?.release();
    }
  },
);

//==================================================
//==== WEB NAVIGATION - UPDATE METADATA
//==================================================

app.put(
  "/api/v1/web-navigation/:id",

  verifyToken,

  requirePermission("web_navigation.update"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      const metadata = normalizeNavigationMetadata(req.body);

      if (!metadata.success) {
        return sendError(res, 400, metadata.code, metadata.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              web_navigation_key,

              web_navigation_name,

              web_navigation_location,

              web_navigation_default_locale,

              web_navigation_status,

              web_navigation_settings_json

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const before = navigations[0];

      await connection.query(
        `
          UPDATE web_navigation

          SET
            web_navigation_name = ?,

            web_navigation_location = ?,

            web_navigation_default_locale = ?,

            web_navigation_settings_json = ?,

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?
        `,
        [
          metadata.name,
          metadata.location,
          metadata.defaultLocale,
          metadata.settingsJson,
          scope.idAdminAcct,
          idNavigation,
          scope.idMasterComp,
        ],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation.updated",
        category: "data_change",
        module: "web_navigation",
        action: "update",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation",
        entityId: idNavigation,
        entityLabel: metadata.name,
        before: {
          key: before.web_navigation_key,
          name: before.web_navigation_name,
          location: before.web_navigation_location,
          default_locale: before.web_navigation_default_locale,
          status: Number(before.web_navigation_status),
          settings: parseJsonValue(before.web_navigation_settings_json),
        },
        after: {
          key: before.web_navigation_key,
          name: metadata.name,
          location: metadata.location,
          default_locale: metadata.defaultLocale,
          status: Number(before.web_navigation_status),
          settings: metadata.settings,
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_UPDATED",
        "Web navigation updated successfully",
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("[Web Navigation] Failed to update navigation", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_UPDATE_FAILED",
        "Unable to update web navigation",
      );
    } finally {
      connection?.release();
    }
  },
);

//==================================================
//==== WEB NAVIGATION - ACTIVATE / DEACTIVATE
//==================================================

app.patch(
  "/api/v1/web-navigation/:id/status",

  verifyToken,

  requirePermission("web_navigation.publish"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      const status = Number(req.body?.web_navigation_status);

      if (status !== 0 && status !== 1) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_STATUS_INVALID",
          "Web navigation status must be 0 or 1",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              web_navigation_key,

              web_navigation_name,

              web_navigation_status

            FROM web_navigation

            WHERE id_web_navigation = ?

              AND id_master_comp = ?

              AND web_navigation_deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const navigation = navigations[0];

      await connection.query(
        `
          UPDATE web_navigation

          SET
            web_navigation_status = ?,

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?
        `,
        [status, scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode:
          status === 1
            ? "web_navigation.activated"
            : "web_navigation.deactivated",
        category: "data_change",
        module: "web_navigation",
        action: status === 1 ? "publish" : "unpublish",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation",
        entityId: idNavigation,
        entityLabel: navigation.web_navigation_name,
        before: {
          status: Number(navigation.web_navigation_status),
        },
        after: {
          status,
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        status === 1
          ? "WEB_NAVIGATION_ACTIVATED"
          : "WEB_NAVIGATION_DEACTIVATED",
        status === 1
          ? "Web navigation activated successfully"
          : "Web navigation deactivated successfully",
        {
          id_web_navigation: keyhsid.idWebNavigation.encode(idNavigation),

          status,
        },
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error(
        "[Web Navigation] Failed to change navigation status",
        error,
      );

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_STATUS_UPDATE_FAILED",
        "Unable to change web navigation status",
      );
    } finally {
      connection?.release();
    }
  },
);

//==================================================
//==== WEB NAVIGATION - DELETE
//==================================================

app.delete(
  "/api/v1/web-navigation/:id",

  verifyToken,

  requirePermission("web_navigation.delete"),

  async (req: AuthRequest, res: Response) => {
    let connection: any = null;

    try {
      const idNavigation = decodeNavigationId(req.params.id);

      if (!idNavigation) {
        return sendError(
          res,
          400,
          "WEB_NAVIGATION_INVALID_ID",
          "Invalid web navigation identifier",
        );
      }

      const scope = await getSessionScope(req);

      if (!scope.success) {
        return sendError(res, scope.status, scope.code, scope.message);
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [navigationRows] = await connection.query(
        `
            SELECT
              navigation.web_navigation_key,

              navigation.web_navigation_name,

              navigation.web_navigation_location,

              navigation.web_navigation_status,

              COUNT(item.id_web_navigation_item)
                AS item_count

            FROM web_navigation navigation

            LEFT JOIN web_navigation_item item
              ON item.id_web_navigation =
                navigation.id_web_navigation

              AND item.id_master_comp =
                navigation.id_master_comp

              AND item.web_navigation_item_deleted_at
                IS NULL

            WHERE navigation.id_web_navigation = ?

              AND navigation.id_master_comp = ?

              AND navigation.web_navigation_deleted_at
                IS NULL

            GROUP BY
              navigation.id_web_navigation,

              navigation.web_navigation_key,

              navigation.web_navigation_name,

              navigation.web_navigation_location,

              navigation.web_navigation_status

            LIMIT 1

            FOR UPDATE
          `,
        [idNavigation, scope.idMasterComp],
      );

      const navigations = navigationRows as any[];

      if (!navigations.length) {
        await connection.rollback();

        return sendError(
          res,
          404,
          "WEB_NAVIGATION_NOT_FOUND",
          "Web navigation not found",
        );
      }

      const navigation = navigations[0];

      await connection.query(
        `
          UPDATE web_navigation_item

          SET
            web_navigation_item_status = 0,

            web_navigation_item_deleted_at = NOW(),

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?

            AND web_navigation_item_deleted_at IS NULL
        `,
        [scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

      await connection.query(
        `
          UPDATE web_navigation

          SET
            web_navigation_status = 0,

            web_navigation_deleted_at = NOW(),

            id_updated_by = ?,

            updated = NOW()

          WHERE id_web_navigation = ?

            AND id_master_comp = ?
        `,
        [scope.idAdminAcct, idNavigation, scope.idMasterComp],
      );

      await writeAuditLog({
        req,
        connection,
        writeMode: "strict",
        idMasterComp: scope.idMasterComp,
        eventCode: "web_navigation.deleted",
        category: "data_change",
        module: "web_navigation",
        action: "delete",
        actorType: "admin",
        actorId: scope.idAdminAcct,
        actorLabel: req.user?.alias ?? null,
        entityType: "web_navigation",
        entityId: idNavigation,
        entityLabel: navigation.web_navigation_name,
        before: {
          key: navigation.web_navigation_key,
          name: navigation.web_navigation_name,
          location: navigation.web_navigation_location,
          status: Number(navigation.web_navigation_status),
          item_count: Number(navigation.item_count ?? 0),
          deleted_at: null,
        },
        after: {
          key: navigation.web_navigation_key,
          name: navigation.web_navigation_name,
          location: navigation.web_navigation_location,
          status: 0,
          item_count: Number(navigation.item_count ?? 0),
          deleted_at: "set",
        },
        httpStatus: 200,
      });

      await connection.commit();

      return sendSuccess(
        res,
        200,
        "WEB_NAVIGATION_DELETED",
        "Web navigation deleted successfully",
      );
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("[Web Navigation] Failed to delete navigation", error);

      return sendError(
        res,
        500,
        "WEB_NAVIGATION_DELETE_FAILED",
        "Unable to delete web navigation",
      );
    } finally {
      connection?.release();
    }
  },
);

export default app;
