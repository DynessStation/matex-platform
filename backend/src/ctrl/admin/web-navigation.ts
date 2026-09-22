import express = require("express");

import { Response } from "express";

import db = require("../../db");

import keyhsid from "../../hsid";

import { sendError, sendSuccess } from "../../helper/api-response.helper";

import { AuthRequest, verifyToken } from "../middleware/authJwt";

import { requirePermission } from "../middleware/authPermission";

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

export default app;
